import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "OWNER") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { leaseTemplate } = body;

    // Verify ownership
    const property = await prisma.property.findUnique({
      where: { id: params.id },
    });

    if (!property || property.ownerId !== session.user.id) {
      return new NextResponse("Not Found or Unauthorized", { status: 404 });
    }

    const updatedProperty = await prisma.property.update({
      where: { id: params.id },
      data: { leaseTemplate },
    });

    return NextResponse.json(updatedProperty);
  } catch (error) {
    console.error("[PROPERTY_CONTRACT_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
