import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ message: "Token is required" }, { status: 400 });
    }

    // Direct HTTP request to LINE API to check token validity and fire test message
    const response = await fetch("https://notify-api.line.me/api/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Bearer ${token}`,
      },
      body: new URLSearchParams({ 
        message: "🔔 JadHor OS: ทดสอบระบบเชื่อมต่อไลน์การแจ้งเตือนสำเร็จ!" 
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ message: "Token ไม่ถูกต้อง หรือหมดอายุ" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("LINE Notify test error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
