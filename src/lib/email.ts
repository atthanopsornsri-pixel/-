/**
 * ส่งอีเมลผ่าน Resend REST API (เรียกตรงด้วย fetch — ไม่เพิ่ม dependency)
 *
 * ตั้งค่าใน env:
 *   RESEND_API_KEY  — คีย์จาก resend.com (ถ้าไม่ตั้ง ระบบจะข้ามการส่งอีเมลเงียบ ๆ)
 *   RESEND_FROM     — ผู้ส่ง เช่น "JadHor OS <noreply@yourdomain.com>"
 *                     (ค่าเริ่มต้นใช้โดเมนทดสอบของ Resend — ส่งได้เฉพาะอีเมลตัวเองตอนยังไม่ verify โดเมน)
 */

function isPlaceholder(v: string | undefined | null): boolean {
  if (!v) return true;
  const t = v.trim().toLowerCase();
  return t === "" || t.includes("your_") || t.includes("placeholder") || t.includes("xxxx");
}

export function isEmailConfigured(): boolean {
  return !isPlaceholder(process.env.RESEND_API_KEY);
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (isPlaceholder(apiKey)) {
    // ไม่ได้ตั้งค่า Resend — ข้ามแบบไม่ throw (ระบบยังใช้ LINE ส่งได้)
    return { success: false, skipped: true };
  }

  const from = process.env.RESEND_FROM?.trim() || "JadHor OS <onboarding@resend.dev>";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[Resend] send error:", res.status, errText);
      return { success: false, error: `Resend ${res.status}` };
    }
    return { success: true };
  } catch (error) {
    console.error("[Resend] connection error:", error);
    return { success: false, error: "ไม่สามารถเชื่อมต่อบริการอีเมลได้" };
  }
}

/** เทมเพลต HTML สำหรับอีเมลรีเซ็ตรหัสผ่าน (โทนสีแบรนด์ JadHor) */
export function resetPasswordEmailHtml(resetUrl: string, name?: string | null): string {
  const greeting = name ? `สวัสดีคุณ ${name}` : "สวัสดีครับ";
  return `
  <div style="font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f7f4ed; border-radius: 16px;">
    <div style="background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
      <h2 style="color: #16264c; font-size: 22px; margin: 0 0 8px;">ตั้งรหัสผ่านใหม่</h2>
      <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
        ${greeting} เราได้รับคำขอตั้งรหัสผ่านใหม่สำหรับบัญชี JadHor OS ของคุณ
        กดปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่ (ลิงก์มีอายุ 1 ชั่วโมง)
      </p>
      <a href="${resetUrl}" style="display: inline-block; background: #34508c; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; padding: 14px 28px; border-radius: 12px; box-shadow: 0 8px 18px -6px #34508c;">
        ตั้งรหัสผ่านใหม่
      </a>
      <p style="color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 24px 0 0;">
        หากปุ่มกดไม่ได้ ให้คัดลอกลิงก์นี้ไปวางในเบราว์เซอร์:<br/>
        <span style="color: #34508c; word-break: break-all;">${resetUrl}</span>
      </p>
      <p style="color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 16px 0 0;">
        ถ้าคุณไม่ได้เป็นคนขอ สามารถเพิกเฉยอีเมลนี้ได้ รหัสผ่านเดิมยังใช้งานได้ตามปกติ
      </p>
    </div>
    <p style="text-align: center; color: #94a3b8; font-size: 12px; margin: 16px 0 0;">JadHor OS — ระบบจัดการหอพัก</p>
  </div>`;
}
