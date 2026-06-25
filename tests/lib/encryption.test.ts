import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { encryptCredential, decryptCredential } from '@/lib/encryption';

// key 64-char hex (256-bit) → ใช้ path Buffer.from(hex) โดยตรง
const HEX_KEY = 'a'.repeat(64);

describe('encryptCredential / decryptCredential (hex key)', () => {
  beforeEach(() => vi.stubEnv('CREDENTIALS_ENCRYPTION_KEY', HEX_KEY));
  afterEach(() => vi.unstubAllEnvs());

  it('round-trip: encrypt แล้ว decrypt ได้ค่าเดิม', () => {
    const secret = 'sk_live_super_secret_123';
    const enc = encryptCredential(secret);
    expect(decryptCredential(enc)).toBe(secret);
  });

  it('ciphertext ขึ้นต้น enc:v1: และไม่เท่ากับ plaintext', () => {
    const enc = encryptCredential('hello');
    expect(enc.startsWith('enc:v1:')).toBe(true);
    expect(enc).not.toContain('hello');
  });

  it('IV สุ่มใหม่ทุกครั้ง — encrypt ค่าเดิมสองครั้งได้ ciphertext ต่างกัน', () => {
    const a = encryptCredential('same-value');
    const b = encryptCredential('same-value');
    expect(a).not.toBe(b);
    expect(decryptCredential(a)).toBe('same-value');
    expect(decryptCredential(b)).toBe('same-value');
  });

  it('empty string คืนค่าเดิม (ไม่เข้ารหัส)', () => {
    expect(encryptCredential('')).toBe('');
    expect(decryptCredential('')).toBe('');
  });

  it('tamper ciphertext → auth tag ไม่ผ่าน → คืนค่า input เดิมแบบ graceful (ไม่ throw)', () => {
    const enc = encryptCredential('tamper-me');
    // พลิกอักขระท้ายสุดของ ciphertext
    const tampered = enc.slice(0, -1) + (enc.endsWith('A') ? 'B' : 'A');
    expect(() => decryptCredential(tampered)).not.toThrow();
    expect(decryptCredential(tampered)).not.toBe('tamper-me');
  });

  it('รูปแบบผิด (ไม่ครบ 3 ส่วน) → คืนค่าเดิม', () => {
    expect(decryptCredential('enc:v1:onlyonepart')).toBe('enc:v1:onlyonepart');
  });
});

describe('backward-compat plaintext', () => {
  beforeEach(() => vi.stubEnv('CREDENTIALS_ENCRYPTION_KEY', HEX_KEY));
  afterEach(() => vi.unstubAllEnvs());

  it('decrypt ค่าที่ไม่มี prefix → คืน plaintext เดิม (ของเก่าก่อนเข้ารหัส)', () => {
    expect(decryptCredential('legacy-plaintext-key')).toBe('legacy-plaintext-key');
  });
});

describe('fallback key (NEXTAUTH_SECRET → sha256 derive)', () => {
  beforeEach(() => {
    // ต้องเป็น undefined (ลบ env) ไม่ใช่ '' เพราะ deriveKey ใช้ ?? ที่ fallback เฉพาะ null/undefined
    vi.stubEnv('CREDENTIALS_ENCRYPTION_KEY', undefined);
    vi.stubEnv('NEXTAUTH_SECRET', 'some-nextauth-secret');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('round-trip ยังทำงานเมื่อ derive key จาก NEXTAUTH_SECRET', () => {
    const enc = encryptCredential('via-nextauth');
    expect(enc.startsWith('enc:v1:')).toBe(true);
    expect(decryptCredential(enc)).toBe('via-nextauth');
  });
});
