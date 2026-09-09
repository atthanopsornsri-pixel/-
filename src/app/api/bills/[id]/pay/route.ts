import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifySlip, receiverMatchesPromptPay } from "@/lib/slip-verification";
import { sendLineOAMessage } from "@/lib/line";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (!body.slipUrl) {
      return NextResponse.json({ message: "Missing slipUrl" }, { status: 400 });
    }

    // Find the bill (with property for promptPay matching + owner LINE for notification)
    const bill = await prisma.bill.findUnique({
      where: { id },
      include: {
        room: {
          select: {
            number: true,
            property: {
              select: {
                promptPayNo: true,
                owner: {
                  select: { lineUserId: true, lineChannelAccessToken: true },
                },
              },
            },
          },
        },
      },
    });

    if (!bill) {
      return NextResponse.json({ message: "Bill not found" }, { status: 404 });
    }

    if (bill.status === "PAID") {
      return NextResponse.json({ message: "บิลนี้ได้รับการชำระเงินเรียบร้อยแล้ว" }, { status: 400 });
    }

    if (bill.status === "WAIVED") {
      return NextResponse.json({ message: "บิลนี้ได้รับการยกเว้นแล้ว ไม่ต้องชำระเงิน" }, { status: 400 });
    }

    // Optional: If tenant has a session, perform room validation
    const session = await getServerSession(authOptions);
    if (session && session.user.role === "TENANT") {
      const tenant = await prisma.tenant.findUnique({
        where: { userId: session.user.id },
      });
      if (tenant && tenant.roomId && bill.roomId !== tenant.roomId) {
        return NextResponse.json({ message: "Unauthorized: This bill does not belong to your room" }, { status: 403 });
      }
    }

    // ── ตรวจสลิปอัตโนมัติ (ถ้าตั้งค่า provider ไว้) ──
    const verification = await verifySlip({
      imageBase64: body.slipUrl,
      expectedAmount: bill.totalAmount,
    });

    // ตรวจพบสลิปซ้ำ → ปฏิเสธทันที ไม่อัปเดตบิล
    if (verification.duplicate) {
      return NextResponse.json(
        { message: "สลิปนี้เคยถูกใช้ชำระเงินไปแล้ว ไม่สามารถใช้ซ้ำได้", code: "DUPLICATE_SLIP" },
        { status: 400 }
      );
    }

    // กันสลิปซ้ำข้ามบิลในระบบโดยตรวจสอบ transRef กับฐานข้อมูล
    if (verification.transRef) {
      const existingUsedBill = await prisma.bill.findFirst({
        where: { slipTransRef: verification.transRef, isDeleted: false },
      });
      if (existingUsedBill && existingUsedBill.id !== id) {
        return NextResponse.json(
          { message: "สลิปนี้เคยถูกใช้ชำระเงินไปแล้วในระบบ ไม่สามารถนำมาใช้ซ้ำได้", code: "DUPLICATE_SLIP" },
          { status: 400 }
        );
      }
    }

    // ยอดเงินในสลิปไม่ตรงกับยอดบิล → แจ้งผู้ใช้ ไม่บันทึก
    if (verification.enabled && verification.amountMismatch) {
      const slipAmt = verification.amount != null
        ? `฿${verification.amount.toLocaleString()}`
        : "ไม่ทราบยอด";
      return NextResponse.json(
        {
          message: `ยอดเงินในสลิป (${slipAmt}) ไม่ตรงกับยอดบิล (฿${bill.totalAmount.toLocaleString()}) กรุณาตรวจสอบสลิปให้ถูกต้องแล้วลองใหม่อีกครั้ง`,
          code: "AMOUNT_MISMATCH",
        },
        { status: 400 }
      );
    }

    // ตัดสินสถานะบิลตามผลการตรวจ
    let newStatus: "PENDING" | "PAID" = "PENDING"; // ค่าเริ่มต้น = รอเจ้าของตรวจ (manual fallback)
    let paidAmount = bill.paidAmount;
    let autoVerified = false;

    if (verification.enabled && verification.verified) {
      const slipAmount = verification.amount ?? 0;
      const receiverOk = receiverMatchesPromptPay(
        verification.receiverAccount,
        bill.room?.property?.promptPayNo
      );

      if (!receiverOk) {
        // โอนเข้าบัญชีที่ไม่ตรงกับพร้อมเพย์ของหอ → ให้เจ้าของตรวจเอง
        newStatus = "PENDING";
      } else if (slipAmount >= bill.totalAmount) {
        // ของจริง + ยอดครบ + บัญชีถูกต้อง → ปิดบิลอัตโนมัติ
        newStatus = "PAID";
        paidAmount = bill.totalAmount;
        autoVerified = true;
      } else {
        // Option A: ยอดไม่ครบ → ตกเป็น PENDING ให้เจ้าของตรวจเอง ไม่แตะ paidAmount (ไม่เขียนทับ)
        newStatus = "PENDING";
      }
    }

    // Update bill
    const updated = await prisma.bill.update({
      where: { id },
      data: {
        status: newStatus,
        slipUrl: body.slipUrl,
        paymentDate: new Date(),
        paidAmount,
        slipTransRef: verification.transRef || null,
      },
    });

    // แจ้งเจ้าของหอผ่าน LINE ว่ามีสลิปส่งมาแล้ว
    const owner = bill.room?.property?.owner;
    if (owner?.lineChannelAccessToken && owner?.lineUserId) {
      const roomNo = bill.room.number;
      const ownerMsg =
        newStatus === "PAID"
          ? `✅ ห้อง ${roomNo} ชำระเงินแล้ว\n💰 ยอด: ฿${bill.totalAmount.toLocaleString()}\n🤖 ระบบตรวจสลิปผ่านอัตโนมัติ`
          : bill.status === "PARTIAL"
          ? `⚠️ ห้อง ${roomNo} แนบสลิปชำระเงิน (บิลชำระบางส่วน)\n💰 ชำระสะสม: ฿${(bill.paidAmount ?? 0).toLocaleString()} / ยอดรวม: ฿${bill.totalAmount.toLocaleString()}\n👉 กรุณาเข้าตรวจสอบและอนุมัติในระบบ`
          : `📬 ห้อง ${roomNo} แนบสลิปชำระเงินแล้ว\n💰 ยอด: ฿${bill.totalAmount.toLocaleString()}\n👉 กรุณาเข้าตรวจสอบและอนุมัติในระบบ`;
      const ownerLineId = owner.lineUserId;
      const lineToken = owner.lineChannelAccessToken;
      after(() =>
        sendLineOAMessage(ownerLineId, ownerMsg, lineToken)
          .catch((err) => console.error("[LINE] owner payment notify error:", err))
      );
    }

    return NextResponse.json({
      ...updated,
      autoVerified,
      verification: verification.enabled
        ? {
            verified: verification.verified,
            amount: verification.amount,
            amountMismatch: verification.amountMismatch || false,
          }
        : null,
    });
  } catch (error) {
    console.error("Error updating slip:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
