import { decryptCredential } from "./encryption";

/**
 * แปลง error ดิบจาก LINE API → ข้อความภาษาไทยที่เจ้าของหอเข้าใจและแก้ได้
 * LINE ส่ง error เป็น JSON เช่น { message, details: [{ message, property }] }
 */
function humanizeLineError(raw: string, status?: number): string {
  let parsed: { message?: string; details?: { message?: string }[] } = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    // ไม่ใช่ JSON — ใช้ข้อความดิบ
  }
  const msg = (parsed.message || "").toLowerCase();
  const detail = (parsed.details?.[0]?.message || "").toLowerCase();
  const combined = `${msg} ${detail}`;

  if (status === 429 || combined.includes("monthly limit") || combined.includes("reached")) {
    return "โควต้าข้อความ LINE ฟรีของเดือนนี้เต็มแล้ว (แพ็กฟรี = 300 ข้อความ/เดือน) — รอเดือนถัดไป หรืออัปเกรดแพ็กเกจ LINE OA";
  }
  if (status === 401 || combined.includes("authentication") || combined.includes("authorization")) {
    return "LINE Token ไม่ถูกต้องหรือหมดอายุ — กรุณาตั้งค่า LINE OA ใหม่ในหน้าตั้งค่า";
  }
  if (combined.includes("not") && combined.includes("friend")) {
    return "ผู้เช่ายังไม่ได้เพิ่มเพื่อน LINE OA ของหอ (หรือบล็อกบัญชีไว้) — ให้ผู้เช่าเพิ่มเพื่อนก่อน";
  }
  if (combined.includes("invalid") && combined.includes("to")) {
    return "ส่งไม่ได้: บัญชี LINE ของผู้เช่าไม่ถูกต้องหรือยังไม่ได้เพิ่มเพื่อน OA — ให้ผู้เช่าผูก LINE ใหม่";
  }
  if (parsed.message) return `LINE แจ้งข้อผิดพลาด: ${parsed.message}`;
  return raw || "ส่งข้อความผ่าน LINE ไม่สำเร็จ";
}

/**
 * ฟังก์ชันหลักสำหรับส่งข้อความแจ้งเตือนผ่าน LINE Official Account (Messaging API)
 * @param to LINE User ID ของผู้รับ (ขึ้นต้นด้วย U...)
 * @param message ข้อความที่ต้องการส่ง
 * @param channelAccessToken รหัส Token ของหอพักนั้นๆ (ดึงจาก DB — อาจถูก encrypt ไว้)
 */
export async function sendLineOAMessage(to: string, message: string, channelAccessToken: string) {
  // Decrypt ก่อนใช้ (backward compat: plaintext ที่ยังไม่ได้ encrypt จะถูกส่งผ่านโดยตรง)
  const token = decryptCredential(channelAccessToken);
  if (!to || !message || !token) {
    console.error("LINE OA: Missing required parameters");
    return { success: false, error: "ข้อมูลไม่ครบถ้วน" };
  }

  try {
    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: to,
        messages: [
          {
            type: "text",
            text: message,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("LINE OA API Error:", response.status, errorText);
      return { success: false, error: humanizeLineError(errorText, response.status) };
    }

    return { success: true };
  } catch (error) {
    console.error("LINE OA Connection Error:", error);
    return { success: false, error: "ไม่สามารถเชื่อมต่อกับ LINE API ได้" };
  }
}
