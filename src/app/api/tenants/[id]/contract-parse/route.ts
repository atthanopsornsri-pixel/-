import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { parseLeaseContractImage } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { image } = body;

    if (!image) {
      return NextResponse.json({ message: "กรุณาส่งรูปภาพเอกสารสัญญาเช่า" }, { status: 400 });
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
      return NextResponse.json({ message: "ไม่พบข้อมูลลูกบ้าน" }, { status: 404 });
    }

    if (!tenant.room || tenant.room.property.ownerId !== session.user.id) {
      return NextResponse.json({ message: "ไม่มีสิทธิ์จัดการอาคารนี้" }, { status: 403 });
    }

    const parsedData = await parseLeaseContractImage(image);

    if (!parsedData) {
      return NextResponse.json({ message: "ไม่สามารถสแกนเอกสารได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง" }, { status: 500 });
    }

    return NextResponse.json(parsedData);
  } catch (error) {
    console.error("[TENANT_CONTRACT_PARSE]", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
