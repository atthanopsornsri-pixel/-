import Anthropic from "@anthropic-ai/sdk";

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// Feature #2: Detect water/electricity usage anomaly after bill creation
export async function detectBillAnomaly(params: {
  roomNumber: string;
  propertyName: string;
  newBill: { waterUnits: number | null; electricUnits: number | null; month: number; year: number };
  history: Array<{ waterUnits: number | null; electricUnits: number | null; month: number; year: number }>;
}): Promise<{ isAnomaly: boolean; alertMessage: string } | null> {
  const client = getClient();
  if (!client) return null;
  if (params.history.length < 2) return null;

  const { roomNumber, propertyName, newBill, history } = params;

  const historySummary = history
    .map(
      (b) =>
        `เดือน ${b.month}/${b.year + 543}: น้ำ ${b.waterUnits ?? "เหมาจ่าย"} หน่วย, ไฟ ${b.electricUnits ?? "เหมาจ่าย"} หน่วย`
    )
    .join("\n");

  const currentSummary = `เดือน ${newBill.month}/${newBill.year + 543}: น้ำ ${newBill.waterUnits ?? "เหมาจ่าย"} หน่วย, ไฟ ${newBill.electricUnits ?? "เหมาจ่าย"} หน่วย`;

  const res = await client.messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `คุณเป็นระบบตรวจสอบการใช้สาธารณูปโภคในหอพัก วิเคราะห์ว่ามีค่าน้ำหรือค่าไฟผิดปกติหรือไม่

ห้อง: ${roomNumber} (${propertyName})
ประวัติ 3 เดือนก่อน:
${historySummary}

เดือนปัจจุบัน:
${currentSummary}

ตอบเป็น JSON เท่านั้น:
{
  "isAnomaly": true หรือ false,
  "alertMessage": "ข้อความแจ้งเตือนเจ้าของ 1-2 ประโยค หรือ null ถ้าปกติ"
}

เกณฑ์: ถือว่าผิดปกติถ้าสูงกว่าค่าเฉลี่ยเกิน 50% (เฉพาะเดือนที่มีข้อมูลหน่วย ไม่นับเหมาจ่าย)`,
      },
    ],
  });

  try {
    const text = res.content[0].type === "text" ? res.content[0].text : "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (!parsed.isAnomaly) return null;
    return { isAnomaly: true, alertMessage: parsed.alertMessage || "พบค่าสาธารณูปโภคสูงผิดปกติ" };
  } catch {
    return null;
  }
}

// Feature #3: Auto-categorize a maintenance request
export async function categorizeMaintenance(params: {
  title: string;
  description: string;
}): Promise<{ category: string; urgency: string; technicianType: string } | null> {
  const client = getClient();
  if (!client) return null;

  const res = await client.messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: `จัดหมวดหมู่คำขอแจ้งซ่อมนี้ ตอบเป็น JSON เท่านั้น:

หัวข้อ: ${params.title}
รายละเอียด: ${params.description}

{
  "category": "หมวดหมู่ เช่น ระบบปรับอากาศ, ประปา, ไฟฟ้า, ประตู/หน้าต่าง, เฟอร์นิเจอร์, ทั่วไป",
  "urgency": "สูง หรือ กลาง หรือ ต่ำ",
  "technicianType": "ประเภทช่าง เช่น ช่างแอร์, ช่างประปา, ช่างไฟ, ช่างทั่วไป"
}`,
      },
    ],
  });

  try {
    const text = res.content[0].type === "text" ? res.content[0].text : "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

// Feature #5: Draft a personalized LINE bill notification message
export async function draftBillNotification(params: {
  tenantName: string;
  roomNumber: string;
  month: number;
  year: number;
  totalAmount: number;
  dueDate: string;
  paymentHistory: Array<{ month: number; year: number; status: string }>;
  appUrl: string;
}): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  const { tenantName, roomNumber, month, year, totalAmount, dueDate, paymentHistory, appUrl } = params;
  const yearBE = year + 543;

  const isGoodPayer = paymentHistory.length >= 2 && paymentHistory.every((h) => h.status === "PAID");
  const hasOverdue = paymentHistory.some((h) => h.status === "OVERDUE");
  const toneNote = isGoodPayer
    ? "ผู้เช่าชำระตรงเวลาเสมอ ใช้ภาษาขอบคุณและอบอุ่น"
    : hasOverdue
    ? "ผู้เช่าเคยชำระล่าช้า ใช้ภาษาสุภาพแต่เน้นความสำคัญของการชำระตรงเวลา"
    : "ใช้ภาษาเป็นมิตรสุภาพ";

  const res = await client.messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 400,
    messages: [
      {
        role: "user",
        content: `ร่างข้อความแจ้งบิลค่าเช่าทาง LINE ภาษาไทย ${toneNote}

ข้อมูล:
- ชื่อผู้เช่า: ${tenantName}
- ห้อง: ${roomNumber}  บิลเดือน: ${month}/${yearBE}
- ยอดชำระ: ฿${totalAmount.toLocaleString()}
- กำหนดชำระ: ${dueDate}
- ลิงก์ชำระ: ${appUrl}/dashboard/my-bills

ต้องมี: 1) ทักทายชื่อ 2) ยอดและวันครบกำหนด 3) ลิงก์ชำระเงิน
ความยาวไม่เกิน 6 บรรทัด ตอบเป็นข้อความ LINE เท่านั้น ไม่ต้องอธิบาย`,
      },
    ],
  });

  try {
    const text = res.content[0].type === "text" ? res.content[0].text : "";
    return text.trim() || null;
  } catch {
    return null;
  }
}
