import { describe, it, expect } from 'vitest';
import {
  getRoomLimit,
  isUnlimitedRooms,
  generateInvoiceNumber,
  getPlatformFeeDescription,
  getSmsAddonDescription,
  PLAN_PRICES,
  UNLIMITED_ROOMS,
  FREE_TRIAL_MAX_ROOMS,
} from '@/lib/pricing';

describe('getRoomLimit', () => {
  it('คืน maxRooms ตามแพ็กเกจที่กำหนดไว้', () => {
    expect(getRoomLimit('STARTER')).toBe(PLAN_PRICES.STARTER.maxRooms);
    expect(getRoomLimit('GROWTH')).toBe(PLAN_PRICES.GROWTH.maxRooms);
    expect(getRoomLimit('ENTERPRISE')).toBe(UNLIMITED_ROOMS);
  });

  it('FREE_TRIAL ได้โควตาห้องเท่ากับค่าทดลองใช้ฟรี', () => {
    expect(getRoomLimit('FREE_TRIAL')).toBe(FREE_TRIAL_MAX_ROOMS);
  });

  it('แพ็กเกจที่ไม่รู้จัก → fallback เป็น FREE_TRIAL limit (ไม่ throw)', () => {
    expect(getRoomLimit('NON_EXISTENT')).toBe(FREE_TRIAL_MAX_ROOMS);
    expect(getRoomLimit('')).toBe(FREE_TRIAL_MAX_ROOMS);
  });
});

describe('isUnlimitedRooms', () => {
  it('ค่าที่ >= UNLIMITED_ROOMS ถือว่าไม่จำกัด', () => {
    expect(isUnlimitedRooms(UNLIMITED_ROOMS)).toBe(true);
    expect(isUnlimitedRooms(UNLIMITED_ROOMS + 1)).toBe(true);
  });

  it('ค่าปกติถือว่ามีจำกัด', () => {
    expect(isUnlimitedRooms(30)).toBe(false);
    expect(isUnlimitedRooms(100)).toBe(false);
  });
});

describe('generateInvoiceNumber', () => {
  it('รูปแบบ INV-YYYYMM-XXXX พร้อม zero-padding', () => {
    expect(generateInvoiceNumber(2026, 6, 1)).toBe('INV-202606-0001');
  });

  it('pad เดือนเป็น 2 หลัก และ sequence เป็น 4 หลัก', () => {
    expect(generateInvoiceNumber(2026, 12, 1234)).toBe('INV-202612-1234');
    expect(generateInvoiceNumber(2025, 1, 42)).toBe('INV-202501-0042');
  });

  it('sequence เกิน 4 หลักไม่ถูกตัด', () => {
    expect(generateInvoiceNumber(2026, 6, 12345)).toBe('INV-202606-12345');
  });
});

describe('getPlatformFeeDescription', () => {
  it('FREE_TRIAL ออกบิลในราคา/ชื่อแพ็กเกจ Starter', () => {
    const desc = getPlatformFeeDescription('FREE_TRIAL', 'MONTHLY');
    expect(desc).toContain(PLAN_PRICES.STARTER.label);
    expect(desc).toContain('รายเดือน');
  });

  it('YEARLY แสดง "รายปี"', () => {
    expect(getPlatformFeeDescription('GROWTH', 'YEARLY')).toContain('รายปี');
  });

  it('แพ็กเกจไม่รู้จัก → fallback เป็น Starter', () => {
    expect(getPlatformFeeDescription('???', 'MONTHLY')).toContain(PLAN_PRICES.STARTER.label);
  });
});

describe('getSmsAddonDescription', () => {
  it('แสดง label + โควตาของแพ็กเกจ SMS ที่ถูกต้อง', () => {
    const desc = getSmsAddonDescription('SIZE_M');
    expect(desc).toContain('SMS Size M');
    expect(desc).toContain('120');
  });

  it('แพ็กเกจ SMS ไม่รู้จัก → ข้อความ default (ไม่ throw)', () => {
    expect(getSmsAddonDescription('SIZE_XXL')).toBe('แพ็กเกจเสริม SMS');
  });
});
