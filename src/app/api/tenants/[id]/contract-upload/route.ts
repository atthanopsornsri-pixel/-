import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "OWNER") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { pdfUrl } = body;

    if (!pdfUrl) {
      return new NextResponse("pdfUrl is required", { status: 400 });
    }

    // Update the tenant's contractPdfUrl
    const updatedTenant = await prisma.tenant.update({
      where: { id: params.id },
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
