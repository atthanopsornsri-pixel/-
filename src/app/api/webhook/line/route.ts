import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendLineOAMessage } from "@/lib/line";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const events = body.events || [];

    for (const event of events) {
      // 1. Check if it's a text message
      if (event.type === "message" && event.message.type === "text") {
        const receivedText = event.message.text.trim().toUpperCase(); // e.g. "JAD-1234"
        const lineUserId = event.source.userId; // Scoped LINE User ID

        // 2. Find the user with the matching binding code
        if (receivedText.startsWith("JAD-")) {
          const user = await prisma.user.findFirst({
            where: { lineBindingCode: receivedText }
          });

          if (user) {
            // 3. Bind the user's lineUserId, clear the temporary binding code
            await prisma.user.update({
              where: { id: user.id },
              data: {
                lineUserId: lineUserId,
                lineBindingCode: null
              }
            });

            // If the user is a tenant, also update Tenant.lineUserId
            if (user.role === "TENANT") {
              await prisma.tenant.updateMany({
                where: { userId: user.id },
                data: { lineUserId: lineUserId }
              });
            }

            console.log(`[LINE Webhook] Bound lineUserId successfully for user: ${user.name || user.email}`);

            // Send confirmation message back to user via their LINE OA
            if (user.lineChannelAccessToken) {
              await sendLineOAMessage(
                lineUserId,
                `✅ JadHor OS: เชื่อมต่อบัญชีสำเร็จแล้ว!\n• บัญชีของคุณ: ${user.name || user.email}\n• LINE User ID: ${lineUserId}\n\nระบบตั้งค่าแจ้งเตือนเสร็จสิ้นเรียบร้อยแล้วค่ะ`,
                user.lineChannelAccessToken
              );
            } else {
              // If it's a tenant, we need the owner's token!
              // Let's find the property owner's token for this tenant
              const tenant = await prisma.tenant.findUnique({
                where: { userId: user.id },
                include: {
                  room: {
                    include: {
                      property: {
                        include: {
                          owner: true
                        }
                      }
                    }
                  }
                }
              });

              if (tenant?.room?.property?.owner?.lineChannelAccessToken) {
                await sendLineOAMessage(
                  lineUserId,
                  `✅ JadHor OS: เชื่อมต่อบัญชีสำเร็จแล้ว!\n• หอพัก: ${tenant.room.property.name}\n• ห้อง: ${tenant.room.number}\n• LINE User ID: ${lineUserId}\n\nระบบตั้งค่ารับแจ้งเตือนบิลเสร็จสิ้นเรียบร้อยแล้วค่ะ`,
                  tenant.room.property.owner.lineChannelAccessToken
                );
              }
            }
          }
        }
      }
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("[LINE Webhook Error]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
