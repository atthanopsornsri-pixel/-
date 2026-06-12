/**
 * Centralized error logger
 *
 * ตอนนี้: ส่ง error ร้ายแรงไป LINE Admin (ถ้าตั้ง ADMIN_LINE_USER_ID + ADMIN_LINE_TOKEN)
 * อนาคต: ถ้า SENTRY_DSN ถูกตั้งค่า → forward ไป Sentry อัตโนมัติ
 *
 * ใช้แทน console.error ทั่วไปในไฟล์ API routes
 */

type Severity = "error" | "warn" | "info";

interface LogContext {
  route?: string;
  userId?: string;
  [key: string]: unknown;
}

export function logError(message: string, error: unknown, ctx?: LogContext) {
  const timestamp = new Date().toISOString();
  const errorMsg = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  // Structured log สำหรับ Vercel log viewer
  console.error(JSON.stringify({
    level: "error",
    timestamp,
    message,
    error: errorMsg,
    ...(ctx && { context: ctx }),
    ...(stack && { stack }),
  }));

  // ส่งแจ้งเตือน LINE สำหรับ critical error (fire-and-forget)
  sendCriticalAlert(message, errorMsg, ctx).catch(() => {});
}

export function logWarn(message: string, ctx?: LogContext) {
  console.warn(JSON.stringify({ level: "warn", timestamp: new Date().toISOString(), message, ...(ctx && { context: ctx }) }));
}

async function sendCriticalAlert(message: string, errorDetail: string, ctx?: LogContext) {
  const adminLineUserId = process.env.ADMIN_LINE_USER_ID;
  const adminLineToken = process.env.ADMIN_LINE_TOKEN;
  if (!adminLineUserId || !adminLineToken) return;

  // throttle: ไม่ส่งซ้ำใน 5 นาที (in-memory, per instance)
  const key = `${message}:${errorDetail}`.slice(0, 80);
  const now = Date.now();
  const last = alertThrottle.get(key) ?? 0;
  if (now - last < 5 * 60 * 1000) return;
  alertThrottle.set(key, now);

  try {
    await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminLineToken}` },
      body: JSON.stringify({
        to: adminLineUserId,
        messages: [{
          type: "text",
          text: [
            `🚨 JadHor Error Alert`,
            `━━━━━━━━━━━━━━━━━━`,
            `❌ ${message}`,
            `📋 ${errorDetail.slice(0, 200)}`,
            ctx?.route ? `📍 Route: ${ctx.route}` : "",
            `🕐 ${new Date().toLocaleString("th-TH")}`,
          ].filter(Boolean).join("\n"),
        }],
      }),
    });
  } catch {
    // silent — ห้าม throw ใน error handler
  }
}

const alertThrottle = new Map<string, number>();
