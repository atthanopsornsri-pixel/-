import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccessProperty } from "@/lib/staff-auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "OWNER" && session.user.role !== "STAFF")) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { pdfUrl } = body;

    if (!pdfUrl) {
      return new NextResponse("pdfUrl is required", { status: 400 });
    }

    // Verify ownership of the tenant room's property
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        room: {
          include: { property: true }
        }
      }
    });

    if (!tenant) {
      return new NextResponse("Tenant not found", { status: 404 });
    }

    if (!tenant.room || !(await canAccessProperty(session.user.role, session.user.id, tenant.room.property.ownerId, tenant.room.propertyId))) {
      return new NextResponse("Unauthorized: You do not own this property", { status: 403 });
    }

    // Update the tenant's contractPdfUrl
    const updatedTenant = await prisma.tenant.update({
      where: { id },
      data: {
        contractPdfUrl: pdfUrl,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[TENANT_CONTRACT_UPLOAD]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
