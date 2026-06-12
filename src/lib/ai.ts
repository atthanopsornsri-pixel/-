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

// ── New Smart Features (Excluding UI references to "AI") ──

// Feature #1: Renders copywriting drafts for vacant rooms
export async function draftVacancyListing(params: {
  roomNumber: string;
  rentPrice: number;
  floor: string;
  hasAircon: boolean;
  hasFan: boolean;
  hasFurniture: boolean;
  propertyName: string;
  propertyAddress: string;
}): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  const { roomNumber, rentPrice, floor, hasAircon, hasFan, hasFurniture, propertyName, propertyAddress } = params;

  const amenities = [];
  if (hasAircon) amenities.push("เครื่องปรับอากาศ (แอร์)");
  if (hasFan) amenities.push("พัดลม");
  if (hasFurniture) amenities.push("เฟอร์นิเจอร์ครบครัน");
  const amenitiesStr = amenities.length > 0 ? amenities.join(", ") : "ห้องเปล่า";

  const prompt = `เขียนข้อความประกาศโฆษณาปล่อยเช่าห้องพักสไตล์โปรโมตบนโซเชียลมีเดีย (เช่น Facebook, LINE) ภาษาไทยที่น่าดึงดูดใจ ใส่ Emojis ให้น่าอ่าน

ข้อมูลห้องพัก:
- โครงการ/หอพัก: ${propertyName}
- ที่อยู่/ทำเล: ${propertyAddress}
- หมายเลขห้อง: ห้อง ${roomNumber}
- ชั้น: ${floor || "-"}
- อัตราค่าเช่า: ฿${rentPrice.toLocaleString()} ต่อเดือน
- สิ่งอำนวยความสะดวก: ${amenitiesStr}

ข้อความต้องประกอบด้วย:
1. หัวข้อที่สะดุดตาและน่าสนใจ
2. รายละเอียดห้องพัก ทำเล จุดเด่น และสิ่งอำนวยความสะดวก
3. ราคาค่าเช่าและข้อมูลติดต่อกลับ (สมมติให้ติดต่อทางกล่องข้อความหรือนิติบุคคล)
ไม่ต้องอธิบายคำนำหรือสิ่งอื่นใด ตอบเฉพาะข้อความประกาศที่จะนำไปโพสต์ได้เลย`;

  const res = await client.messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 600,
    messages: [{ role: "user", content: prompt }],
  });

  try {
    const text = res.content[0].type === "text" ? res.content[0].text : "";
    return text.trim() || null;
  } catch {
    return null;
  }
}

// Feature #2: Scans contract images and extracts key variables
export async function parseLeaseContractImage(base64Image: string): Promise<{
  firstName: string | null;
  lastName: string | null;
  idCardNumber: string | null;
  leaseStart: string | null;
  depositAmount: number | null;
  roomNumber: string | null;
} | null> {
  const client = getClient();
  if (!client) return null;

  let mediaType = "image/jpeg";
  let base64Data = base64Image;
  const match = base64Image.match(/^data:(image\/\w+);base64,(.+)$/);
  if (match) {
    mediaType = match[1];
    base64Data = match[2];
  }

  const prompt = `คุณเป็นระบบดึงข้อมูลอัจฉริยะจากเอกสารสัญญาเช่าหรือแบบฟอร์มลงทะเบียน
กรุณาอ่านและสแกนข้อมูลจากรูปภาพที่ส่งให้ และดึงข้อมูลสำคัญเหล่านี้ออกมาในรูปแบบ JSON เท่านั้น ห้ามตอบเป็นข้อความอื่นเด็ดขาด:

{
  "firstName": "ชื่อจริงของผู้เช่าภาษาไทย (ไม่มีคำนำหน้าชื่อ เช่น นาย, นาง, นางสาว)",
  "lastName": "นามสกุลของผู้เช่าภาษาไทย",
  "idCardNumber": "เลขประจำตัวประชาชน 13 หลักของผู้เช่า (เป็นตัวเลขล้วน 13 หลัก ไม่มีขีดหรือช่องว่าง ถ้าไม่พบให้ใส่ null)",
  "leaseStart": "วันเริ่มสัญญาเช่าหรือวันย้ายเข้า ในรูปแบบ YYYY-MM-DD (เช่น 2026-06-12 ถ้าไม่พบให้ใส่ null)",
  "depositAmount": เงินประกันหรือเงินมัดจำการเช่า (เป็นตัวเลขจำนวนเต็มจำนวนเงินบาท เช่น 5000 ถ้าไม่พบให้ใส่ null),
  "roomNumber": "หมายเลขห้องพักที่ระบุในสัญญา (ถ้าไม่พบให้ใส่ null)"
}`;

  const res = await client.messages.create({
    model: "claude-3-5-sonnet-20241022", // Use Sonnet for superior visual document processing
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt,
          },
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType as any,
              data: base64Data,
            },
          },
        ],
      },
    ],
  });

  try {
    const text = res.content[0].type === "text" ? res.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

// Feature #3: Evaluates database and system security/consistency
export async function runSystemSecurityAudit(diagnostics: {
  totalRooms: number;
  occupiedRooms: number;
  vacantRooms: number;
  inconsistentRoomsCount: number;
  invalidIdCardsCount: number;
  emptyPhoneNumbersCount: number;
  invoiceMismatchesCount: number;
  envStatus: {
    DATABASE_URL: boolean;
    NEXTAUTH_SECRET: boolean;
    NEXT_PUBLIC_SUPABASE_URL: boolean;
    SLIPOK_API_KEY: boolean;
    ADMIN_LINE_NOTIFY_TOKEN: boolean;
    ANTHROPIC_API_KEY: boolean;
  };
}): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  const prompt = `คุณเป็นระบบความปลอดภัยและการตรวจสอบระบบหลังบ้านอัจฉริยะ (System Integrity & Security Auditor)
กรุณาวิเคราะห์ข้อมูลสถานะความสมบูรณ์และจุดบกพร่องของระบบหอพัก/อพาร์ตเมนต์ และเขียนรายงานสรุปภาษาไทยในรูปแบบ Markdown ที่สวยงามเป็นระเบียบ

ข้อมูลการตรวจสอบระบบ (System Diagnostic Metrics):
- จำนวนห้องพักทั้งหมด: ${diagnostics.totalRooms} (มีผู้เช่า: ${diagnostics.occupiedRooms}, ว่าง: ${diagnostics.vacantRooms})
- จำนวนห้องพักที่มีสถานะขัดแย้ง (เช่น ระบุว่ามีคนอยู่แต่ไม่มีประวัติผู้เช่าผูกไว้): ${diagnostics.inconsistentRoomsCount} ห้อง
- จำนวนผู้เช่าที่กรอกเลขบัตรประชาชนไม่ถูกต้อง/ไม่มีข้อมูล: ${diagnostics.invalidIdCardsCount} คน
- จำนวนผู้เช่าที่ไม่มีเบอร์โทรศัพท์ติดต่อ: ${diagnostics.emptyPhoneNumbersCount} คน
- จำนวนบิล/ใบแจ้งหนี้ที่มียอดรวมขัดแย้งกันกับยอดรวมรายการย่อย: ${diagnostics.invoiceMismatchesCount} รายการ
- สถานะตัวแปรระบบหลังบ้าน (Environment Variables Status):
  - DATABASE_URL: ${diagnostics.envStatus.DATABASE_URL ? "✅ ตั้งค่าแล้ว" : "❌ ขาดการตั้งค่า"}
  - NEXTAUTH_SECRET: ${diagnostics.envStatus.NEXTAUTH_SECRET ? "✅ ตั้งค่าแล้ว" : "❌ ขาดการตั้งค่า"}
  - NEXT_PUBLIC_SUPABASE_URL: ${diagnostics.envStatus.NEXT_PUBLIC_SUPABASE_URL ? "✅ ตั้งค่าแล้ว" : "❌ ขาดการตั้งค่า"}
  - SLIPOK_API_KEY: ${diagnostics.envStatus.SLIPOK_API_KEY ? "✅ ตั้งค่าแล้ว" : "❌ ขาดการตั้งค่า"}
  - ADMIN_LINE_NOTIFY_TOKEN: ${diagnostics.envStatus.ADMIN_LINE_NOTIFY_TOKEN ? "✅ ตั้งค่าแล้ว" : "❌ ขาดการตั้งค่า"}
  - ANTHROPIC_API_KEY: ${diagnostics.envStatus.ANTHROPIC_API_KEY ? "✅ ตั้งค่าแล้ว" : "❌ ขาดการตั้งค่า"}

ข้อกำหนดในการสร้างรายงาน:
1. ห้ามใช้คำว่า "AI" หรือระบุว่าเป็นระบบ "AI" ในรายงานโดยเด็ดขาด ให้ระบุว่าเป็น "ระบบตรวจสอบอัจฉริยะ" หรือ "รายงานการประเมินระบบหลังบ้าน"
2. มีหัวข้อย่อยดังนี้:
   - **บทสรุปสถานะความสมบูรณ์** (ประเมินเป็นเกรด A/B/C/D หรือร้อยละความสมบูรณ์)
   - **จุดบกพร่องของข้อมูลที่ต้องแก้ไข** (ระบุรายละเอียดและวิธีการจัดการจุดขัดแย้งของข้อมูลอย่างเป็นรูปธรรม)
   - **ความปลอดภัยและการตั้งค่าตัวแปรระบบ** (แจ้งข้อเสนอแนะเกี่ยวกับคีย์ต่างๆ ที่จำเป็น)
   - **คำแนะนำสำหรับผู้ดูแลระบบ/ผู้พัฒนา** (ทางเทคนิค)
3. ร่างรายงานให้อ่านเข้าใจง่าย มีระเบียบ ใช้เครื่องหมายสัญลักษณ์ (เช่น 🟢, 🟡, 🔴) เพื่อแบ่งระดับความรุนแรง`;

  const res = await client.messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 800,
    messages: [{ role: "user", content: prompt }],
  });

  try {
    const text = res.content[0].type === "text" ? res.content[0].text : "";
    return text.trim() || null;
  } catch {
    return null;
  }
}

