/**
 * Slip Verification — ตรวจสลิปโอนเงินอัตโนมัติ (อ่าน QR + เช็คกับธนาคาร + กันสลิปปลอม/ซ้ำ)
 * ============================================================================
 * ใช้ผู้ให้บริการ SlipOK (https://slipok.com)
 *
 * ออกแบบเป็น "เลเยอร์เสริม" แบบ graceful fallback:
 *   - ถ้าไม่ได้ตั้งค่า SLIPOK_API_KEY / SLIPOK_BRANCH_ID → ระบบจะ fallback ไป
 *     ใช้การตรวจสลิปแบบ manual (เจ้าของหอเปิดดูรูปแล้วกดอนุมัติเอง) เหมือนเดิม
 *   - ถ้าตั้งค่าไว้ → ตรวจสลิปอัตโนมัติตอนผู้เช่าอัปโหลด
 *
 * ทุก error จาก API จะถูก catch แล้ว fallback ไป manual เสมอ — ไม่มีทางทำให้
 * flow การจ่ายเงินของผู้เช่าพังเด็ดขาด
 */

export interface SlipVerifyResult {
  /** มีการตั้งค่า provider และพยายามตรวจสอบหรือไม่ (false = ใช้ manual fallback) */
  enabled: boolean;
  /** สลิปเป็นของจริงและผ่านการตรวจกับธนาคาร */
  verified: boolean;
  /** ยอดเงินบนสลิป (บาท) */
  amount?: number;
  /** เลขอ้างอิงรายการ (ใช้บันทึก/กันซ้ำ) */
  transRef?: string;
  /** บัญชีผู้รับเงิน (อาจถูกปิดบางส่วน เช่น xxx-x-x1234-x) */
  receiverAccount?: string;
  /** ชื่อผู้รับเงิน */
  receiverName?: string;
  /** เวลาโอน (ISO 8601) */
  transTimestamp?: string;
  /** ตรวจพบสลิปซ้ำ (เคยใช้แล้ว) */
  duplicate?: boolean;
  /** ยอดบนสลิปไม่ตรงกับยอดบิล */
  amountMismatch?: boolean;
  /** ข้อความ error (ถ้ามี) */
  error?: string;
}

/** ตรวจว่าได้ตั้งค่า slip verification provider ไว้หรือยัง */
export function isSlipVerificationEnabled(): boolean {
  return Boolean(process.env.SLIPOK_API_KEY && process.env.SLIPOK_BRANCH_ID);
}

/** แปลง data URL (เช่น "data:image/jpeg;base64,...") เป็น { buffer, contentType } */
function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; contentType: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const contentType = match[1] || "image/jpeg";
  const buffer = Buffer.from(match[2], "base64");
  return { buffer, contentType };
}

/**
 * ตรวจสลิปโอนเงินอัตโนมัติ
 *
 * @param opts.imageBase64   data URL หรือ base64 string ของรูปสลิป
 * @param opts.imageBuffer   หรือส่งเป็น Buffer ตรง ๆ
 * @param opts.contentType   MIME type (ถ้าส่ง imageBuffer)
 * @param opts.expectedAmount ยอดบิลที่คาดหวัง (ใช้ cross-check กับยอดบนสลิป)
 */
export async function verifySlip(opts: {
  imageBase64?: string;
  imageBuffer?: Buffer;
  contentType?: string;
  expectedAmount?: number;
}): Promise<SlipVerifyResult> {
  // ── ไม่ได้ตั้งค่า → fallback manual ──
  if (!isSlipVerificationEnabled()) {
    return { enabled: false, verified: false };
  }

  const apiKey = process.env.SLIPOK_API_KEY!;
  const branchId = process.env.SLIPOK_BRANCH_ID!;

  try {
    // เตรียมรูปภาพ
    let buffer: Buffer | undefined = opts.imageBuffer;
    let contentType = opts.contentType || "image/jpeg";

    if (!buffer && opts.imageBase64) {
      const parsed = dataUrlToBuffer(opts.imageBase64);
      if (parsed) {
        buffer = parsed.buffer;
        contentType = parsed.contentType;
      } else {
        // ถ้าเป็น base64 ดิบ (ไม่มี prefix data:)
        buffer = Buffer.from(opts.imageBase64, "base64");
      }
    }

    if (!buffer) {
      return { enabled: true, verified: false, error: "ไม่พบรูปสลิป" };
    }

    // สร้าง multipart form (fetch จะตั้ง boundary ให้เอง — ห้ามตั้ง Content-Type เอง)
    const form = new FormData();
    const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
    const blob = new Blob([new Uint8Array(buffer)], { type: contentType });
    form.append("files", blob, `slip.${ext}`);
    form.append("log", "true"); // เปิดการเช็คกับธนาคาร + กันสลิปซ้ำ
    if (opts.expectedAmount != null) {
      form.append("amount", String(opts.expectedAmount));
    }

    // ยิงด้วย timeout 15 วินาที กันค้าง
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    let res: Response;
    try {
      res = await fetch(`https://api.slipok.com/api/line/apikey/${branchId}`, {
        method: "POST",
        headers: { "x-authorization": apiKey },
        body: form,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const json: any = await res.json().catch(() => null);

    // ── กรณี error จาก SlipOK ──
    if (!res.ok || !json || json.success === false) {
      const code = json?.code;
      const message: string = json?.message || "ตรวจสอบสลิปไม่สำเร็จ";

      // 1013 = ยอดเงินไม่ตรง
      if (code === 1013 || /amount|จำนวนเงิน|ยอด/i.test(message)) {
        return { enabled: true, verified: false, amountMismatch: true, error: message };
      }
      // ตรวจพบสลิปซ้ำ (code อาจต่างกันตามเวอร์ชัน — เช็คข้อความด้วย)
      if (code === 1012 || /duplicate|ซ้ำ|เคยใช้/i.test(message)) {
        return { enabled: true, verified: false, duplicate: true, error: message };
      }
      // error อื่น ๆ → fallback manual
      return { enabled: true, verified: false, error: message };
    }

    // ── สำเร็จ ──
    const d = json.data || {};
    return {
      enabled: true,
      verified: true,
      amount: typeof d.amount === "number" ? d.amount : undefined,
      transRef: d.transRef,
      receiverAccount: d.receiver?.account || d.receiver?.proxy,
      receiverName: d.receiver?.displayName || d.receiver?.name,
      transTimestamp: d.transTimestamp,
    };
  } catch (err: any) {
    // network / timeout / parse error → fallback manual เสมอ
    console.error("[SlipOK] verification error:", err?.message || err);
    return { enabled: true, verified: false, error: "เชื่อมต่อระบบตรวจสลิปไม่ได้" };
  }
}

/**
 * เทียบบัญชีผู้รับว่าตรงกับพร้อมเพย์ของหอหรือไม่ (soft check)
 * SlipOK คืนเลขบัญชีแบบปิดบางส่วน เลยเทียบแค่เลข 4 ตัวท้าย
 * คืน true ถ้าเทียบไม่ได้ (ไม่มีข้อมูล) เพื่อไม่ให้ false-reject
 */
export function receiverMatchesPromptPay(
  receiverAccount: string | undefined,
  promptPayNo: string | null | undefined
): boolean {
  if (!receiverAccount || !promptPayNo) return true; // เทียบไม่ได้ → ไม่บล็อก
  const digitsRecv = receiverAccount.replace(/\D/g, "");
  const digitsPP = promptPayNo.replace(/\D/g, "");
  if (digitsRecv.length < 4 || digitsPP.length < 4) return true;
  return digitsPP.slice(-4) === digitsRecv.slice(-4);
}
