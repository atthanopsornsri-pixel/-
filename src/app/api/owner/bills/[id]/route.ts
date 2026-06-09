import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifySlip } from "@/lib/slip-verification";
import { sendLineOAMessage } from "@/lib/line";

// PATCH: Owner แนบสลิปโอนเงินค่าบริการ SaaS + SlipOK auto-verify
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { slipUrl } = await req.json();

    if (!slipUrl) {
      return NextResponse.json({ message: "กรุณาแนบสลิปโอนเงิน" }, { status: 400 });
    }

    // ตรวจสอบว่าเป็น Invoice ของ Owner รายนี้จริง
    const invoice = await prisma.invoice.findUnique({
      where: { id: resolvedParams.id },
      include: { items: true },
    });

    if (!invoice || invoice.ownerId !== session.user.id) {
      return NextResponse.json({ message: "ไม่พบใบแจ้งหนี้" }, { status: 404 });
    }

    if (invoice.status === "PAID") {
      return NextResponse.json({ message: "ใบแจ้งหนี้นี้ชำระเรียบร้อยแล้ว" }, { status: 400 });
    }

    // ── SlipOK auto-verification ──
    const verification = await verifySlip({
      imageBase64: slipUrl,
      expectedAmount: invoice.totalAmount,
    });

    // ตรวจพบสลิปซ้ำ — หยุดทันที ไม่บันทึก
    if (verification.enabled && verification.duplicate) {
      return NextResponse.json(
        { message: "สลิปนี้ถูกใช้งานไปแล้ว กรุณาตรวจสอบและอัปโหลดสลิปใหม่", code: "DUPLICATE_SLIP" },
        { status: 400 }
      );
    }

    // ยอดเงินไม่ตรง — แจ้งผู้ใช้ทันที ไม่บันทึก
    if (verification.enabled && verification.amountMismatch) {
      const slipAmt = verification.amount != null
        ? `฿${verification.amount.toLocaleString()}`
        : "ไม่ทราบยอด";
      return NextResponse.json(
        {
          message: `ยอดเงินในสลิป (${slipAmt}) ไม่ตรงกับยอดใบแจ้งหนี้ (฿${invoice.totalAmount.toLocaleString()}) กรุณาตรวจสอบสลิปให้ถูกต้อง`,
          code: "AMOUNT_MISMATCH",
        },
        { status: 400 }
      );
    }

    // ── ตัดสินสถานะ: auto-paid ถ้าผ่าน SlipOK, ไม่งั้นรอ Admin ──
    const autoApproved = verification.enabled && verification.verified;
    const newStatus = autoApproved ? "PAID" : "PENDING";
    const paidAt = autoApproved ? new Date() : null;

    const updatedInvoice = await prisma.invoice.update({
      where: { id: resolvedParams.id },
      data: {
        slipUrl,
        status: newStatus,
        paidAt,
        slipVerified: verification.enabled ? verification.verified : null,
        slipAmount: verification.amount ?? null,
        slipTransRef: verification.transRef ?? null,
        note: autoApproved
          ? `ชำระอัตโนมัติผ่าน SlipOK | ยอด ฿${(verification.amount ?? invoice.totalAmount).toLocaleString()} | Ref: ${verification.transRef || "-"}`
          : (invoice.note ?? null),
      },
      include: { items: true },
    });

    // ── ถ้า auto-approved → แจ้ง Admin ผ่าน LINE (optional) ──
    if (autoApproved) {
      const adminLineToken = process.env.ADMIN_LINE_NOTIFY_TOKEN;
      const adminLineUserId = process.env.ADMIN_LINE_USER_ID;
      if (adminLineToken && adminLineUserId) {
        const owner = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { name: true, email: true },
        });
        sendLineOAMessage(
          adminLineUserId,
          [
            `✅ ชำระค่าบริการ JadHor OS อัตโนมัติ`,
            `Owner: ${owner?.name || owner?.email || session.user.id}`,
            `ใบแจ้งหนี้: ${invoice.invoiceNumber}`,
            `ยอด: ฿${invoice.totalAmount.toLocaleString()}`,
            `Ref: ${verification.transRef || "-"}`,
          ].join("\n"),
          adminLineToken
        ).catch((err) => console.error("[LINE] admin notify error:", err));
      }
    }

    return NextResponse.json({
      ...updatedInvoice,
      autoApproved,
      message: autoApproved
        ? "ชำระเงินสำเร็จ! ระบบตรวจสลิปอัตโนมัติผ่านแล้ว"
        : "อัปโหลดสลิปสำเร็จ กำลังรอ Admin ตรวจสอบ",
    });
  } catch (error) {
    console.error("Owner PATCH invoice error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
