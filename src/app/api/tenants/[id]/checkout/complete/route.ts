import { NextResponse, after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendLineOAMessage } from "@/lib/line";

/**
 * POST /api/tenants/[id]/checkout/complete
 * ปิดเคสย้ายออก (Reconciliation & Release)
 *
 * Refund gate (อุดช่องโหว่ตามที่ที่ปรึกษาระบุ):
 *   ถ้ายอดสุทธิติดลบ (เจ้าของต้องคืนเงินประกัน) จะปิดเคส/ปล่อยห้องเป็น AVAILABLE ไม่ได้
 *   จนกว่าจะอัปโหลดสลิปโอนคืนเงิน (refundSlipUrl) — กันลูกบ้านได้ใบเสร็จแต่ไม่ได้เงินคืนจริง
 *
 * เมื่อปิดเคสสำเร็จ (atomic transaction):
 *   - Checkout.status = COMPLETED
 *   - Tenant.moveOutDate = วันที่ย้ายออก + eContractStatus = TERMINATED (ถ้าเคยเซ็น)
 *   - Room.status = AVAILABLE (รับผู้เช่าคนถัดไป)
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        room: { include: { property: { include: { owner: { select: { lineChannelAccessToken: true } } } } } },
        checkout: true,
      },
    });

    if (!tenant || tenant.room?.property?.ownerId !== session.user.id) {
      return NextResponse.json({ message: "Tenant not found" }, { status: 404 });
    }

    const checkout = tenant.checkout;
    if (!checkout) {
      return NextResponse.json(
        { message: "ยังไม่มีข้อมูลบิลปิดเคส กรุณาคำนวณบิลสุดท้ายก่อน" },
        { status: 400 }
      );
    }

    if (checkout.status === "COMPLETED") {
      return NextResponse.json({ message: "เคสนี้ปิดเรียบร้อยแล้ว" }, { status: 409 });
    }

    // refundSlipUrl: รับใหม่จาก body หรือใช้ที่บันทึกไว้แล้ว
    const refundSlipUrl =
      typeof body.refundSlipUrl === "string" && body.refundSlipUrl
        ? body.refundSlipUrl
        : checkout.refundSlipUrl;

    // ── Refund gate ──
    const ownerMustRefund = checkout.netAmount < 0;
    if (ownerMustRefund && !refundSlipUrl) {
      // ยังปิดไม่ได้ — เก็บสถานะเป็น "รอสลิปคืนเงิน" แต่ห้องยังไม่ว่าง
      await prisma.checkout.update({
        where: { tenantId: tenant.id },
        data: { status: "PENDING_REFUND" },
      });
      return NextResponse.json(
        {
          message: `ยอดสุทธิติดลบ ฿${Math.abs(checkout.netAmount).toLocaleString()} — ต้องอัปโหลดสลิปโอนคืนเงินประกันก่อนปิดเคส`,
          code: "REFUND_SLIP_REQUIRED",
          status: "PENDING_REFUND",
        },
        { status: 400 }
      );
    }

    const moveOutDate = body.moveOutDate ? new Date(body.moveOutDate) : new Date();
    const roomId = tenant.room?.id;
    const terminateContract = tenant.eContractStatus === "SIGNED";

    // ── ปิดเคสแบบ atomic: Checkout + Tenant + Room พร้อมกัน ──
    await prisma.$transaction([
      prisma.checkout.update({
        where: { tenantId: tenant.id },
        data: { status: "COMPLETED", refundSlipUrl: refundSlipUrl ?? null },
      }),
      prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          moveOutDate,
          ...(terminateContract ? { eContractStatus: "TERMINATED" } : {}),
        },
      }),
      ...(roomId
        ? [prisma.room.update({ where: { id: roomId }, data: { status: "AVAILABLE" } })]
        : []),
    ]);

    // ── ส่งใบสรุปปิดเคสทาง LINE (non-blocking) ──
    const lineToken = tenant.room?.property?.owner?.lineChannelAccessToken;
    if (lineToken && tenant.lineUserId) {
      const tenantName = [tenant.firstName, tenant.lastName].filter(Boolean).join(" ") || "ผู้เช่า";
      const net = checkout.netAmount;
      const settleLine =
        net > 0
          ? `ยอดที่ต้องชำระเพิ่ม: ฿${net.toLocaleString()}`
          : net < 0
          ? `เจ้าของหอคืนเงินประกัน: ฿${Math.abs(net).toLocaleString()}`
          : `ไม่มียอดค้าง/คืน (สุทธิ ฿0)`;
      const msg = [
        `📄 ใบสรุปปิดสัญญาเช่า (ย้ายออก)`,
        `สวัสดีคุณ${tenantName} 🙏`,
        `━━━━━━━━━━━━━━`,
        `🚪 ห้อง ${tenant.room?.number ?? "-"}`,
        `💧 ค่าน้ำ-ไฟงวดสุดท้าย: ฿${checkout.finalUtilityAmount.toLocaleString()}`,
        `🏠 ค่าเช่างวดสุดท้าย: ฿${checkout.finalRentAmount.toLocaleString()}`,
        `🔧 หักค่าเสียหาย: ฿${checkout.deductionAmount.toLocaleString()}`,
        `🛡️ เงินประกัน: ฿${checkout.depositAmount.toLocaleString()}`,
        `━━━━━━━━━━━━━━`,
        settleLine,
        `ขอบคุณที่ใช้บริการ 💚`,
      ].join("\n");
      const tenantLineId = tenant.lineUserId;
      after(() =>
        sendLineOAMessage(tenantLineId, msg, lineToken).catch((err) =>
          console.error("[LINE] checkout receipt error:", err)
        )
      );
    }

    return NextResponse.json({
      success: true,
      status: "COMPLETED",
      roomReleased: Boolean(roomId),
      contractTerminated: terminateContract,
    });
  } catch (error) {
    console.error("Error completing checkout:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
