/**
 * AES-256-GCM credential encryption
 *
 * ป้องกัน credentials (API key, secret, token) ก่อนเก็บลง DB
 * ถ้า DB หลุด ข้อมูลจะเข้ารหัส ไม่สามารถใช้งานได้ทันที
 *
 * ตั้งค่า: CREDENTIALS_ENCRYPTION_KEY ใน .env
 *   - 64-char hex string (256-bit), หรือ
 *   - ถ้าไม่ตั้ง → ใช้ NEXTAUTH_SECRET แทน (fallback ที่ยังดีกว่าไม่มีเลย)
 *
 * Format ที่เก็บใน DB: enc:v1:<iv>.<tag>.<ciphertext>  (base64url)
 * Backward compat: ถ้าไม่ขึ้นต้น "enc:v1:" → ถือว่าเป็น plaintext เดิม คืนเหมือนเดิม
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const PREFIX = "enc:v1:";

function deriveKey(): Buffer {
  const raw = process.env.CREDENTIALS_ENCRYPTION_KEY ?? process.env.NEXTAUTH_SECRET;
  if (!raw) {
    // ไม่มี key เลย — warn แต่ไม่ crash (dev environment)
    console.warn("[encryption] No CREDENTIALS_ENCRYPTION_KEY or NEXTAUTH_SECRET — storing plaintext");
    return Buffer.alloc(32, 0);
  }
  if (/^[0-9a-f]{64}$/i.test(raw)) return Buffer.from(raw, "hex");
  return crypto.createHash("sha256").update(raw).digest();
}

export function encryptCredential(plaintext: string): string {
  if (!plaintext) return plaintext;
  const key = deriveKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + [iv, tag, encrypted].map((b) => b.toString("base64url")).join(".");
}

export function decryptCredential(value: string): string {
  if (!value || !value.startsWith(PREFIX)) return value; // plaintext fallback
  try {
    const key = deriveKey();
    const parts = value.slice(PREFIX.length).split(".");
    if (parts.length !== 3) return value;
    const [ivB64, tagB64, dataB64] = parts;
    const iv = Buffer.from(ivB64, "base64url");
    const tag = Buffer.from(tagB64, "base64url");
    const data = Buffer.from(dataB64, "base64url");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(data).toString("utf8") + decipher.final("utf8");
  } catch {
    return value; // decryption failed → return as-is (graceful backward compat)
  }
}
