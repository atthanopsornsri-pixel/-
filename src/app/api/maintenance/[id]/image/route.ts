import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessProperty } from "@/lib/staff-auth";

// คืนรูปแจ้งซ่อมเป็นไฟล์ภาพจริง (decode จาก base64 ใน DB)
// แยกจาก list เพื่อให้เบราว์เซอร์โหลดเฉพาะรูปที่เห็นบนจอ + cache ได้
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const item = await prisma.maintenanceRequest.findUnique({
      where: { id },
      select: {
        imageUrl: true,
        roomId: true,
        room: { select: { propertyId: true, property: { select: { ownerId: true } } } },
      },
    });

    if (!item?.imageUrl) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    // สิทธิ์: เจ้าของ/พนักงานตึกของห้องนั้น หรือผู้เช่าห้องนั้นเท่านั้น
    if (session.user.role === "OWNER" || session.user.role === "STAFF") {
      if (!(await canAccessProperty(session.user.role, session.user.id, item.room.property.ownerId, item.room.propertyId))) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }
    } else if (session.user.role === "TENANT") {
      const tenant = await prisma.tenant.findUnique({
        where: { userId: session.user.id },
        select: { roomId: true },
      });
      if (!tenant || tenant.roomId !== item.roomId) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }
    } else {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const match = item.imageUrl.match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json({ message: "Invalid image data" }, { status: 404 });
    }

    const buffer = Buffer.from(match[2], "base64");
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": match[1],
        "Content-Length": String(buffer.length),
        // รูปแจ้งซ่อมไม่เปลี่ยน — ให้เบราว์เซอร์ cache 1 วัน ลดโหลดซ้ำ
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (error) {
    console.error("Error serving maintenance image:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
