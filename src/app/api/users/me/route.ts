/* eslint-disable */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, lineChannelAccessToken: true, lineUserId: true, lineBindingCode: true }
    });

    return NextResponse.json(user);
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
    if (lineChannelAccessToken !== undefined) dataToUpdate.lineChannelAccessToken = lineChannelAccessToken;
    if (lineUserId !== undefined) dataToUpdate.lineUserId = lineUserId;
    
    if (generateBindingCode) {
      const code = `JAD-${Math.floor(1000 + Math.random() * 9000)}`;
      dataToUpdate.lineBindingCode = code;
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
