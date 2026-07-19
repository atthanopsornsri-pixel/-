/* eslint-disable */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptCredential, decryptCredential } from "@/lib/encryption";
import crypto from "crypto";

/** สร้างรหัสผูกบัญชี LINE แบบสุ่มปลอดภัย: JAD-XXXXXX (6 ตัว, ไม่มีอักขระกำกวม 0/O/1/I) */
function generateBindingCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 ตัว, ตัด 0O1I ออก
  const bytes = crypto.randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i++) code += alphabet[bytes[i] % alphabet.length];
  return `JAD-${code}`;
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, lineChannelAccessToken: true, lineUserId: true, lineBindingCode: true }
    });

    if (!user) return NextResponse.json(null);

    // Decrypt ก่อน mask (ไม่ส่งค่าจริงกลับ client)
    const rawToken = user.lineChannelAccessToken
      ? decryptCredential(user.lineChannelAccessToken)
      : null;
    const maskedToken = rawToken
      ? rawToken.slice(0, 6) + "****" + rawToken.slice(-4)
      : null;

    return NextResponse.json({ ...user, lineChannelAccessToken: maskedToken, hasLineToken: !!rawToken });
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { lineChannelAccessToken, lineUserId, password, generateBindingCode } = await req.json();

    const dataToUpdate: any = {};
    if (lineChannelAccessToken !== undefined) {
      // Guard: ป้องกัน masked value หลุดเข้ามาแทนค่าจริง
      if (lineChannelAccessToken && lineChannelAccessToken.includes("****")) {
        return NextResponse.json({ message: "กรุณากรอก Channel Access Token ใหม่ทั้งหมด" }, { status: 400 });
      }
      dataToUpdate.lineChannelAccessToken = lineChannelAccessToken
        ? encryptCredential(lineChannelAccessToken)
        : null;
    }
    if (lineUserId !== undefined) dataToUpdate.lineUserId = lineUserId;
    
    if (generateBindingCode) {
      dataToUpdate.lineBindingCode = generateBindingCode();
      // หมดอายุใน 10 นาที — กันการสุ่มเดารหัส (brute-force)
      dataToUpdate.lineBindingCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    }

    if (password) {
      const bcrypt = require("bcryptjs");
      dataToUpdate.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: dataToUpdate
    });

    return NextResponse.json({ message: "Success", lineBindingCode: user.lineBindingCode });
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
