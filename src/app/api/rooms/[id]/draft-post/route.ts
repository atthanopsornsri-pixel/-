import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { draftVacancyListing } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const room = await prisma.room.findUnique({
      where: { id },
      include: { property: true }
    });

    if (!room || room.property.ownerId !== session.user.id) {
      return NextResponse.json({ message: "Not found or forbidden" }, { status: 403 });
    }

    if (room.status !== "AVAILABLE") {
      return NextResponse.json({ message: "ห้องนี้ไม่ได้ว่างอยู่ในขณะนี้" }, { status: 400 });
    }

    const listingText = await draftVacancyListing({
      roomNumber: room.number,
      rentPrice: room.rentPrice,
      floor: room.floor || "",
      hasAircon: room.hasAircon || false,
      hasFan: room.hasFan || false,
      hasFurniture: room.hasFurniture || false,
      propertyName: room.property.name || "หอพัก",
      propertyAddress: room.property.address || "",
    });

    if (!listingText) {
      return NextResponse.json({ message: "ไม่สามารถสร้างประกาศได้ในขณะนี้" }, { status: 500 });
    }

    return NextResponse.json({ text: listingText });
  } catch (error: any) {
    console.error("Error drafting vacancy listing:", error);
    if (error instanceof Error && error.message === "API_KEY_NOT_CONFIGURED") {
      return NextResponse.json({ message: "กรุณาเปิดใช้งานระบบและตั้งค่ารหัสเชื่อมต่อ (API Key) ในหน้าแอดมินหรือไฟล์ .env ก่อนใช้งาน" }, { status: 400 });
    }
    if (error?.status === 401) {
      return NextResponse.json({ message: "รหัสเชื่อมต่อ (API Key) ไม่ถูกต้องหรือไม่ได้รับอนุญาต กรุณาตรวจสอบข้อมูลคีย์อีกครั้ง" }, { status: 401 });
    }
    return NextResponse.json({ message: "เกิดข้อผิดพลาดในการเชื่อมต่อระบบบริการข้อมูลหลังบ้าน" }, { status: 500 });
  }
}
