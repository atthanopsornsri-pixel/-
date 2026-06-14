import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email: rawEmail, inviteCode, userId: bodyUserId } = body;

    // Security: derive userId/lineUserId from the server-side session, NOT from client body.
    const session = await getServerSession(authOptions);
    const userId    = session?.user?.id ?? null;
    const lineUserId = session?.user?.lineUserId ?? null;
    const sessionName = session?.user?.name ?? null;

    // If the client sent a userId that doesn't match the session, reject (spoofing attempt).
    if (bodyUserId && userId && bodyUserId !== userId) {
      return NextResponse.json({ message: "Unauthorized: session mismatch" }, { status: 403 });
    }

    if (!inviteCode || !inviteCode.trim()) {
      return NextResponse.json({ message: "กรุณากรอกช่องรหัสห้องพัก (Invite Code)" }, { status: 400 });
    }
    if (!rawEmail || !rawEmail.trim()) {
      return NextResponse.json({ message: "กรุณากรอกช่องอีเมล" }, { status: 400 });
    }
    const email = rawEmail.trim().toLowerCase();

    // Verify Invite Code
    const room = await prisma.room.findUnique({
      where: { inviteCode },
    });

    if (!room) {
      return NextResponse.json({ message: "รหัสห้องพัก (Invite Code) ไม่ถูกต้อง" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser && existingUser.id !== userId) {
      return NextResponse.json({ message: "อีเมลนี้มีผู้ใช้งานแล้ว" }, { status: 400 });
    }

    let user;
    if (userId) {
      // Check if user already has a tenant profile
      const userCheck = await prisma.user.findUnique({
        where: { id: userId },
        include: { tenantProfile: true }
      });
      if (userCheck?.tenantProfile) {
        return NextResponse.json({ message: "บัญชี LINE นี้ได้ลงทะเบียนเป็นลูกบ้านเรียบร้อยแล้ว" }, { status: 400 });
      }

      // Update existing LINE OAuth user — name from LINE session, password set later in profile step
      user = await prisma.user.update({
        where: { id: userId },
        data: {
          email,
          name: sessionName || undefined,
          role: "TENANT",
          lineUserId: lineUserId || undefined,
          tenantProfile: {
            create: {
              roomId: room.id,
              lineUserId: lineUserId || undefined,
            }
          }
        }
      });
    } else {
      user = await prisma.user.create({
        data: {
          email,
          name: sessionName || undefined,
          role: "TENANT",
          tenantProfile: {
            create: {
              roomId: room.id,
            }
          }
        },
      });
    }

    // Optionally update room status to OCCUPIED if it was AVAILABLE
    if (room.status === "AVAILABLE") {
      await prisma.room.update({
        where: { id: room.id },
        data: { status: "OCCUPIED" }
      });
    }

    return NextResponse.json(
      { message: "Tenant created successfully", user: { id: user.id, email: user.email } },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Registration error:", error);
    let friendlyMessage = "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง";
    if (error.code === "P2002") {
      const target = error.meta?.target || [];
      if (target.includes("email")) {
        friendlyMessage = "อีเมลนี้ถูกใช้งานแล้วในระบบ กรุณาใช้ชื่ออีเมลอื่น";
      } else {
        friendlyMessage = `ตรวจพบข้อมูลซ้ำซ้อนในระบบ (${target.join(", ")})`;
      }
    } else if (error.message?.includes("Can't reach database")) {
      friendlyMessage = "ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาลองใหม่อีกครั้งภายหลัง";
    }
    return NextResponse.json({ message: friendlyMessage, error: error.message }, { status: 500 });
  }
}
