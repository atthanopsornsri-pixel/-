import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "TENANT") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { userId: session.user.id },
      include: {
        room: {
          include: {
            property: true,
          }
        },
        user: true,
        vehicles: true,
      }
    });

    if (!tenant || !tenant.room) {
      return new NextResponse("Tenant data not found", { status: 404 });
    }

    // ── Gate: ต้องจ่าย "บิลเข้าอยู่" ให้เรียบร้อยก่อนถึงจะเซ็นสัญญาได้ ──
    const checkinBill = await prisma.bill.findFirst({
      where: { roomId: tenant.roomId!, type: "CHECKIN" },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, totalAmount: true },
    });
    // มีบิลเข้าอยู่และยังไม่ชำระ → ห้ามเซ็น; ไม่มีบิลเข้าอยู่ หรือชำระแล้ว → เซ็นได้
    const hasUnpaidCheckin = !!checkinBill && checkinBill.status !== "PAID";
    const canSign = !hasUnpaidCheckin;

    const fmtDate = (d: Date | null | undefined) =>
      d ? new Intl.DateTimeFormat("th-TH", { dateStyle: "long" }).format(new Date(d)) : "________________";

    // ชื่อที่ใช้ในสัญญา: ใช้ firstName+lastName (ข้อมูลจริง) ก่อน fallback ไป user.name (LINE name)
    const legalName = [tenant.firstName, tenant.lastName].filter(Boolean).join(" ") || tenant.user.name || "________________";

    // รายการยานพาหนะ (ทะเบียน) สำหรับ {{VEHICLES}}
    const vehiclesText =
      tenant.vehicles.length > 0
        ? tenant.vehicles
            .map((v) => `${v.licensePlate}${v.brand ? ` (${v.brand}${v.color ? ` ${v.color}` : ""})` : ""}`)
            .join(", ")
        : "ไม่มี";

    let content = tenant.room.property.leaseTemplate || "";

    // Replace Placeholders
    if (content) {
      content = content.replace(/{{TENANT_NAME}}/g, legalName);
      content = content.replace(/{{ROOM_NUMBER}}/g, tenant.room.number);
      content = content.replace(/{{RENT_PRICE}}/g, tenant.room.rentPrice.toLocaleString());
      content = content.replace(/{{DEPOSIT_AMOUNT}}/g, tenant.depositAmount?.toLocaleString() || "0");
      content = content.replace(/{{LEASE_START}}/g, fmtDate(tenant.leaseStart));
      content = content.replace(/{{START_DATE}}/g, fmtDate(tenant.leaseStart));
      content = content.replace(/{{LEASE_END}}/g, fmtDate(tenant.leaseEnd));
      content = content.replace(/{{END_DATE}}/g, fmtDate(tenant.leaseEnd));
      content = content.replace(/{{ID_CARD}}/g, tenant.idCardNumber || "________________");
      content = content.replace(/{{ADDRESS}}/g, tenant.address || "________________");
      content = content.replace(/{{PHONE}}/g, tenant.phoneNumber || "________________");
      content = content.replace(/{{VEHICLES}}/g, vehiclesText);
    }

    // Auto-generate standard preamble
    const preamble = `
<p style="margin-bottom: 1rem;">
  สัญญาฉบับนี้ทำขึ้นระหว่าง <strong>${tenant.room.property.name}</strong> (ผู้ให้เช่า)
  และ <strong>${legalName}</strong> (ผู้เช่า) ผู้ถือบัตรประชาชนเลขที่ <strong>${tenant.idCardNumber || "________________"}</strong>
</p>
<p style="margin-bottom: 1rem;">
  ตกลงเช่าห้องพักหมายเลข <strong>${tenant.room.number}</strong>
  ในอัตราค่าเช่าเดือนละ <strong>${tenant.room.rentPrice.toLocaleString()}</strong> บาท
  โดยมีเงินประกันการเช่าจำนวน <strong>${tenant.depositAmount ? tenant.depositAmount.toLocaleString() : "0"}</strong> บาท
  โดยสัญญาเริ่มต้นตั้งแต่วันที่ <strong>${tenant.leaseStart ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'long' }).format(new Date(tenant.leaseStart)) : "________________"}</strong> เป็นต้นไป
</p>
<hr style="margin: 2rem 0; border: 0; border-top: 1px solid #cbd5e1;" />
    `;

    content = preamble + content;

    return NextResponse.json({
      tenant: {
        signatureUrl: tenant.signatureUrl,
        contractSignedAt: tenant.contractSignedAt,
        contractIpAddress: tenant.contractIpAddress,
        contractPdfUrl: tenant.contractPdfUrl,
        landlordSignatureUrl: tenant.room.property.signatureUrl,
        landlordName: tenant.room.property.promptPayName || tenant.room.property.name,
      },
      canSign,
      checkinBill, // { id, status, totalAmount } | null
      content,
    });
  } catch (error) {
    console.error("[TENANT_CONTRACT_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
