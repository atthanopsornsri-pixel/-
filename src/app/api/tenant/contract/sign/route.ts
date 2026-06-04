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
