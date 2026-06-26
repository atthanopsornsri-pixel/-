import { NextResponse } from "next/server";
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "@/app/actions/notifications";

export async function GET() {
  const result = await getNotifications();
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.error === "Unauthorized" ? 401 : 500 });
  }
  return NextResponse.json({ notifications: result.notifications });
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    if (body.all) {
      const result = await markAllNotificationsAsRead();
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: result.error === "Unauthorized" ? 401 : 500 });
      }
      return NextResponse.json({ success: true });
    }

    const { id } = body;
    if (!id) {
      return NextResponse.json({ error: "Missing notification ID" }, { status: 400 });
    }

    const result = await markNotificationAsRead(id);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.error === "Unauthorized" ? 401 : 403 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Invalid request" }, { status: 400 });
  }
}
