import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "TENANT") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { signatureUrl } = body;

    if (!signatureUrl) {
      return new NextResponse("Signature is required", { status: 400 });
    }

    // ── Server-side gate: ต้องจ่ายบิลเข้าอยู่ก่อนถึงจะเซ็นได้ ──
    const tenantRecord = await prisma.tenant.findUnique({
      where: { userId: session.user.id },
      select: { roomId: true },
    });
    if (tenantRecord?.roomId) {
      const checkinBill = await prisma.bill.findFirst({
        where: { roomId: tenantRecord.roomId, type: "CHECKIN" },
        orderBy: { createdAt: "desc" },
        select: { status: true },
      });
      if (checkinBill && checkinBill.status !== "PAID") {
        return NextResponse.json(
          { message: "กรุณาชำระบิลค่าเข้าอยู่ให้เรียบร้อยก่อนเซ็นสัญญา" },
          { status: 403 }
        );
      }
    }

    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "Unknown IP";
    const userAgent = request.headers.get("user-agent") || "Unknown Browser";

    const updatedTenant = await prisma.tenant.update({
      where: { userId: session.user.id },
      data: {
        signatureUrl,
        contractSignedAt: new Date(),
        contractIpAddress: ipAddress,
        contractUserAgent: userAgent,
      },
    });

    return NextResponse.json({ success: true, signedAt: updatedTenant.contractSignedAt });
  } catch (error) {
    console.error("[TENANT_CONTRACT_SIGN]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
