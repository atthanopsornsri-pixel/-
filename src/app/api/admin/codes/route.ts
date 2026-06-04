import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ฟังก์ชันสุ่มรหัส
function generateInviteCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { months } = await req.json();

    const code = generateInviteCode();

    const newCode = await prisma.registrationCode.create({
      data: {
        code,
        months: Number(months) || 1,
      },
    });

    return NextResponse.json(newCode, { status: 201 });
  } catch (error) {
    console.error("Error creating code:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const codes = await prisma.registrationCode.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        usedBy: { select: { email: true, name: true } }
      }
    });

    return NextResponse.json(codes);
  } catch (error) {
    console.error("Error fetching codes:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
