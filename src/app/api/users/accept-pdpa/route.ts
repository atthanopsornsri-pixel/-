import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/users/accept-pdpa
 * ยอมรับข้อกำหนด PDPA สำหรับผู้ใช้งานที่ล็อกอินอยู่
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { pdpaAcceptedAt: new Date() },
    });

    return NextResponse.json({ success: true, pdpaAcceptedAt: user.pdpaAcceptedAt });
  } catch (error) {
    console.error("Accept PDPA error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
