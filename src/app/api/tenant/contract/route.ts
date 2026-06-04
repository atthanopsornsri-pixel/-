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
      }
    });

    if (!tenant || !tenant.room) {
      return new NextResponse("Tenant data not found", { status: 404 });
    }

    let content = tenant.room.property.leaseTemplate || "";

    // Replace Placeholders
    if (content) {
      content = content.replace(/{{TENANT_NAME}}/g, tenant.user.name || "________________");
      content = content.replace(/{{ROOM_NUMBER}}/g, tenant.room.number);
      content = content.replace(/{{RENT_PRICE}}/g, tenant.room.rentPrice.toString());
      content = content.replace(/{{DEPOSIT_AMOUNT}}/g, tenant.depositAmount?.toString() || "0");
      content = content.replace(/{{LEASE_START}}/g, tenant.leaseStart ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'long' }).format(new Date(tenant.leaseStart)) : "________________");
      content = content.replace(/{{ID_CARD}}/g, tenant.idCardNumber || "________________");
    }

    return NextResponse.json({
      tenant: {
        signatureUrl: tenant.signatureUrl,
        contractSignedAt: tenant.contractSignedAt,
        contractIpAddress: tenant.contractIpAddress,
        contractPdfUrl: tenant.contractPdfUrl,
      },
      content,
    });
  } catch (error) {
    console.error("[TENANT_CONTRACT_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
