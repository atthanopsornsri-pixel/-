import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendLineOAMessage } from "@/lib/line";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { token, lineUserId } = await req.json();
    if (!token || !lineUserId) {
      return NextResponse.json({ message: "กรุณาระบุทั้ง Channel Access Token และ LINE User ID" }, { status: 400 });
    }

    // Attempt to push test message via LINE OA Messaging API
    const result = await sendLineOAMessage(
      lineUserId, 
      "🔔 JadHor OS: ทดสอบระบบเชื่อมต่อไลน์การแจ้งเตือน LINE Official Account สำเร็จ!", 
      token
    );

    if (!result.success) {
      return NextResponse.json({ message: result.error || "การเชื่อมต่อล้มเหลว กรุณาตรวจสอบ Token อีกครั้ง" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("LINE OA test error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
