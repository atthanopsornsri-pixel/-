import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const ip = getClientIp(req);
    const rl = await rateLimit(`sign-token:${ip}`, 30, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json({ message: "มีการเข้าถึงบ่อยเกินไป กรุณารอสักครู่" }, { status: 429 });
    }

    const { token } = await params;

    const tenant = await prisma.tenant.findUnique({
      where: { eContractToken: token }
    });

    if (!tenant) {
      return NextResponse.json({ message: "ไม่พบข้อมูลสัญญา" }, { status: 404 });
    }

    return NextResponse.json({
      data: tenant.eContractData,
      status: tenant.eContractStatus,
      signatureUrl: tenant.signatureUrl,
    });
  } catch (error) {
    console.error("Error fetching signature token:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const ip = getClientIp(req);
    const rl = await rateLimit(`sign-token-post:${ip}`, 10, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json({ message: "มีการเข้าถึงบ่อยเกินไป กรุณารอสักครู่" }, { status: 429 });
    }

    const { token } = await params;
    const body = await req.json();

    // ตรวจว่าลายเซ็นเป็น data URL รูปจริง (กัน POST เปล่า/ค่าขยะ)
    const signature: unknown = body?.tenantSignature;
    if (typeof signature !== "string" || !signature.startsWith("data:image/")) {
      return NextResponse.json({ message: "ลายเซ็นไม่ถูกต้อง" }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { eContractToken: token }
    });

    if (!tenant) {
      return NextResponse.json({ message: "ไม่พบข้อมูลสัญญา" }, { status: 404 });
    }

    if (tenant.eContractStatus !== "SENT") {
      return NextResponse.json({ message: "สัญญานี้ถูกลงนามไปแล้ว หรือยังไม่ได้ถูกส่ง" }, { status: 409 });
    }

    // บันทึกหลักฐานการลงนามตาม พ.ร.บ.ธุรกรรมทางอิเล็กทรอนิกส์:
    // IP + User-Agent + timestamp เพื่อยืนยันตัวตนผู้เซ็นในภายหลัง
    const userAgent = req.headers.get("user-agent")?.slice(0, 512) ?? null;

    // Update with tenant's signature and set status to SIGNED
    const updatedTenant = await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        eContractStatus: "SIGNED",
        signatureUrl: signature,
        contractSignedAt: new Date(),
        contractIpAddress: ip,
        contractUserAgent: userAgent,
      }
    });

    return NextResponse.json({ success: true, status: updatedTenant.eContractStatus });
  } catch (error) {
    console.error("Error signing contract:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
