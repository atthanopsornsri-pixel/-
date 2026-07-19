import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendLineOAMessage } from "@/lib/line";
import { rateLimit } from "@/lib/rate-limit";
import crypto from "crypto";

function verifyLineSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET;
  // FAIL-CLOSED: ไม่มี secret = ตรวจ signature ไม่ได้ = ปฏิเสธทุกคำขอ
  // (กันกรณีลืมตั้ง env var แล้ว webhook เปิดโล่งให้ปลอม LINE event ได้)
  if (!secret) {
    console.error("[LINE Webhook] LINE_CHANNEL_SECRET is not set — rejecting all requests (fail-closed)");
    return false;
  }
  if (!signature) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("base64");
  // ความยาว buffer ต้องเท่ากันก่อน timingSafeEqual ไม่งั้น throw
  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  if (expectedBuf.length !== signatureBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, signatureBuf);
}

// ── Chatbot: ตอบกลับผู้เช่าที่รู้จัก ──────────────────────────────────────────
async function handleTenantChat(lineUserId: string, text: string) {
  const msg = text.toLowerCase().trim();

  const tenant = await prisma.tenant.findFirst({
    where: { lineUserId },
    include: {
      room: {
        include: {
          property: { include: { owner: true } },
          bills: {
            where: { status: { in: ["UNPAID", "OVERDUE", "PENDING"] } },
            orderBy: [{ year: "desc" }, { month: "desc" }],
            take: 5,
          },
        },
      },
    },
  });

  // ไม่รู้จักผู้ใช้ → แนะนำผูกบัญชี
  if (!tenant?.room?.property?.owner?.lineChannelAccessToken) {
    return; // ไม่มี token → ตอบไม่ได้
  }

  const token = tenant.room.property.owner.lineChannelAccessToken;
  const roomNo = tenant.room.number;
  const baseUrl = process.env.NEXTAUTH_URL || "https://jadhor.vercel.app";

  // ── keyword: บิล / ยอด / ค่าเช่า ──
  if (
    msg.includes("บิล") || msg.includes("ยอด") || msg.includes("ค่าเช่า") ||
    msg.includes("เท่าไหร่") || msg.includes("เดือนนี้") || msg.includes("invoice")
  ) {
    const unpaid = tenant.room.bills[0];
    if (unpaid) {
      const due = new Date(unpaid.dueDate).toLocaleDateString("th-TH", {
        day: "numeric", month: "short", year: "numeric",
      });
      const statusLabel = unpaid.status === "UNPAID"
        ? "⏳ รอชำระ" : unpaid.status === "PENDING"
        ? "🔍 รอตรวจสอบ" : "⚠️ เกินกำหนด";
      await sendLineOAMessage(
        lineUserId,
        `📋 บิลล่าสุด — ห้อง ${roomNo}\n\n📅 รอบ: ${unpaid.month}/${unpaid.year + 543}\n💰 ยอด: ฿${unpaid.totalAmount.toLocaleString()}\n📌 ครบกำหนด: ${due}\n📊 สถานะ: ${statusLabel}\n\n👉 ชำระออนไลน์: ${baseUrl}/pay/${unpaid.id}`,
        token
      );
    } else {
      await sendLineOAMessage(lineUserId, `✅ ไม่มีบิลค้างชำระ — บัญชีของคุณเรียบร้อยดีค่ะ 🎉`, token);
    }
    return;
  }

  // ── keyword: ยอดค้าง / ค้างชำระ / ทั้งหมด ──
  if (msg.includes("ค้าง") || msg.includes("ทั้งหมด") || msg.includes("รายการ")) {
    const allBills = tenant.room.bills;
    if (allBills.length === 0) {
      await sendLineOAMessage(lineUserId, `✅ ไม่มียอดค้างชำระค่ะ`, token);
    } else {
      const lines = allBills
        .map(b => `• ${b.month}/${b.year + 543} — ฿${b.totalAmount.toLocaleString()} (${b.status === "UNPAID" ? "รอชำระ" : b.status === "PENDING" ? "รอตรวจสอบ" : "เกินกำหนด"})`)
        .join("\n");
      await sendLineOAMessage(
        lineUserId,
        `📊 บิลค้างชำระทั้งหมด — ห้อง ${roomNo}\n\n${lines}\n\n💡 พิมพ์ "บิล" เพื่อดูบิลล่าสุดค่ะ`,
        token
      );
    }
    return;
  }

  // ── keyword: ห้อง / ข้อมูล ──
  if (msg.includes("ห้อง") || msg.includes("ข้อมูล") || msg.includes("ฉัน")) {
    const leaseEnd = tenant.leaseEnd
      ? new Date(tenant.leaseEnd).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })
      : "ไม่ระบุ";
    await sendLineOAMessage(
      lineUserId,
      `🏠 ข้อมูลห้องพักของคุณ\n\n📍 หอพัก: ${tenant.room.property.name}\n🚪 ห้อง: ${roomNo}\n💰 ค่าเช่า: ฿${tenant.room.rentPrice.toLocaleString()}/เดือน\n📅 สัญญาถึง: ${leaseEnd}`,
      token
    );
    return;
  }

  // ── keyword: ช่วยเหลือ / help / คำสั่ง ──
  if (
    msg.includes("ช่วย") || msg.includes("help") ||
    msg.includes("คำสั่ง") || msg.includes("วิธี") || msg.includes("สวัสดี")
  ) {
    await sendLineOAMessage(
      lineUserId,
      `🤖 JadHor Bot — คำสั่งที่ใช้ได้\n\n💰 "บิล" — ดูบิลล่าสุด\n📊 "ยอดค้าง" — ดูบิลค้างทั้งหมด\n🏠 "ห้องฉัน" — ข้อมูลห้องพัก\n❓ "ช่วยเหลือ" — เมนูนี้\n\n🏡 ${tenant.room.property.name} — ห้อง ${roomNo}`,
      token
    );
    return;
  }

  // ── default ──
  await sendLineOAMessage(
    lineUserId,
    `สวัสดีค่ะ 👋 พิมพ์ "ช่วยเหลือ" เพื่อดูคำสั่ง หรือ "บิล" เพื่อดูบิลล่าสุดได้เลยค่ะ`,
    token
  );
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-line-signature");

    if (!verifyLineSignature(rawBody, signature)) {
      console.warn("[LINE Webhook] Invalid signature — request rejected");
      return new NextResponse("Forbidden", { status: 403 });
    }

    const body = JSON.parse(rawBody);
    const events = body.events || [];

    for (const event of events) {
      if (event.type === "message" && event.message.type === "text") {
        const receivedText = event.message.text.trim();
        const lineUserId = event.source.userId;

        // ── Case 1: รหัสผูกบัญชี JAD-XXXX ──
        if (receivedText.toUpperCase().startsWith("JAD-")) {
          // Rate-limit การเดารหัสต่อ LINE user (กัน brute-force สุ่มรหัส)
          const rl = await rateLimit(`line-bind:${lineUserId}`, 5, 10 * 60 * 1000);
          if (!rl.allowed) {
            continue; // เกินโควตา → เพิกเฉย (ไม่บอกใบ้ว่าถูก/ผิด)
          }

          const bindCode = receivedText.toUpperCase();
          const user = await prisma.user.findFirst({
            where: {
              lineBindingCode: bindCode,
              // ต้องยังไม่หมดอายุ (โค้ดเก่าที่ไม่มี expiry จะไม่ match ต้อง gen ใหม่)
              lineBindingCodeExpiresAt: { gt: new Date() },
            },
          });

          if (user) {
            await prisma.user.update({
              where: { id: user.id },
              data: { lineUserId, lineBindingCode: null, lineBindingCodeExpiresAt: null },
            });

            if (user.role === "TENANT") {
              await prisma.tenant.updateMany({
                where: { userId: user.id },
                data: { lineUserId },
              });
            }

            console.log(`[LINE Webhook] Bound lineUserId for user: ${user.name || user.email}`);

            // หา access token
            let accessToken = user.lineChannelAccessToken;
            let confirmMsg = `✅ JadHor OS: เชื่อมต่อบัญชีสำเร็จ!\n• บัญชี: ${user.name || user.email}\n\nระบบตั้งค่าแจ้งเตือนเสร็จสิ้นค่ะ`;

            if (!accessToken && user.role === "TENANT") {
              const tenant = await prisma.tenant.findUnique({
                where: { userId: user.id },
                include: {
                  room: {
                    include: { property: { include: { owner: true } } },
                  },
                },
              });
              accessToken = tenant?.room?.property?.owner?.lineChannelAccessToken ?? null;
              if (tenant?.room) {
                confirmMsg = `✅ JadHor OS: เชื่อมต่อสำเร็จ!\n• หอพัก: ${tenant.room.property.name}\n• ห้อง: ${tenant.room.number}\n\nพิมพ์ "ช่วยเหลือ" เพื่อดูคำสั่งที่ใช้ได้ค่ะ 🎉`;
              }
            }

            if (accessToken) {
              await sendLineOAMessage(lineUserId, confirmMsg, accessToken);
            }
          }
        }
        // ── Case 2: ข้อความทั่วไป → chatbot ──
        else {
          await handleTenantChat(lineUserId, receivedText);
        }
      }
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("[LINE Webhook Error]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
