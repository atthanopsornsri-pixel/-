import { decryptCredential } from "./encryption";

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
      console.error("LINE OA API Error:", errorText);
      return { success: false, error: errorText };
    }

    return { success: true };
  } catch (error) {
    console.error("LINE OA Connection Error:", error);
    return { success: false, error: "ไม่สามารถเชื่อมต่อกับ LINE API ได้" };
  }
}
