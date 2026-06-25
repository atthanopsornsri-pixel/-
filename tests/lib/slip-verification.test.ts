import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isSlipVerificationEnabled,
  receiverMatchesPromptPay,
  verifySlip,
} from '@/lib/slip-verification';

describe('isSlipVerificationEnabled', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('ตั้งครบทั้ง API key + branch id → true', () => {
    vi.stubEnv('SLIPOK_API_KEY', 'key');
    vi.stubEnv('SLIPOK_BRANCH_ID', '123');
    expect(isSlipVerificationEnabled()).toBe(true);
  });

  it('ขาดตัวใดตัวหนึ่ง → false', () => {
    vi.stubEnv('SLIPOK_API_KEY', 'key');
    vi.stubEnv('SLIPOK_BRANCH_ID', undefined);
    expect(isSlipVerificationEnabled()).toBe(false);
  });
});

describe('receiverMatchesPromptPay', () => {
  it('เลข 4 ตัวท้ายตรงกัน → true', () => {
    expect(receiverMatchesPromptPay('xxx-x-x3806-x', '0640353806')).toBe(true);
  });

  it('เลข 4 ตัวท้ายไม่ตรง → false', () => {
    expect(receiverMatchesPromptPay('xxx-x-x1234-x', '0640353806')).toBe(false);
  });

  it('ไม่มีข้อมูลเทียบ → true (ไม่บล็อกการจ่าย)', () => {
    expect(receiverMatchesPromptPay(undefined, '0640353806')).toBe(true);
    expect(receiverMatchesPromptPay('xxx3806', null)).toBe(true);
  });

  it('ข้อมูลสั้นกว่า 4 หลัก → true (เทียบไม่ได้ ไม่บล็อก)', () => {
    expect(receiverMatchesPromptPay('12', '0640353806')).toBe(true);
  });
});

describe('verifySlip', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('ไม่ได้ตั้งค่า provider → fallback manual (enabled:false, verified:false) ไม่ยิง fetch', async () => {
    vi.stubEnv('SLIPOK_API_KEY', undefined);
    vi.stubEnv('SLIPOK_BRANCH_ID', undefined);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const r = await verifySlip({ imageBase64: 'data:image/jpeg;base64,AAAA' });
    expect(r).toEqual({ enabled: false, verified: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  describe('เมื่อตั้งค่า provider แล้ว', () => {
    beforeEach(() => {
      vi.stubEnv('SLIPOK_API_KEY', 'key');
      vi.stubEnv('SLIPOK_BRANCH_ID', 'branch');
    });

    const okFetch = (json: unknown, ok = true) =>
      vi.fn().mockResolvedValue({ ok, json: async () => json } as Response);

    it('สลิปจริง ผ่านการตรวจ → verified:true พร้อม amount/transRef', async () => {
      vi.stubGlobal(
        'fetch',
        okFetch({
          success: true,
          data: { amount: 1500, transRef: 'TX123', receiver: { account: 'xxx3806', displayName: 'หอจอด' }, transTimestamp: '2026-06-25T10:00:00Z' },
        }),
      );
      const r = await verifySlip({ imageBase64: 'data:image/jpeg;base64,AAAA', expectedAmount: 1500 });
      expect(r.verified).toBe(true);
      expect(r.amount).toBe(1500);
      expect(r.transRef).toBe('TX123');
    });

    it('SECURITY: ยอดไม่ตรง (code 1013) → amountMismatch:true, verified:false', async () => {
      vi.stubGlobal('fetch', okFetch({ success: false, code: 1013, message: 'amount mismatch' }, false));
      const r = await verifySlip({ imageBase64: 'data:image/jpeg;base64,AAAA', expectedAmount: 999 });
      expect(r.verified).toBe(false);
      expect(r.amountMismatch).toBe(true);
    });

    it('SECURITY: สลิปซ้ำ (code 1012) → duplicate:true, verified:false', async () => {
      vi.stubGlobal('fetch', okFetch({ success: false, code: 1012, message: 'duplicate slip' }, false));
      const r = await verifySlip({ imageBase64: 'data:image/jpeg;base64,AAAA' });
      expect(r.verified).toBe(false);
      expect(r.duplicate).toBe(true);
    });

    it('ไม่มีรูปสลิป → error "ไม่พบรูปสลิป"', async () => {
      vi.stubGlobal('fetch', vi.fn());
      const r = await verifySlip({});
      expect(r).toEqual({ enabled: true, verified: false, error: 'ไม่พบรูปสลิป' });
    });

    it('network/timeout error → fallback manual ไม่ throw หลุด', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
      const r = await verifySlip({ imageBase64: 'data:image/jpeg;base64,AAAA' });
      expect(r.enabled).toBe(true);
      expect(r.verified).toBe(false);
      expect(r.error).toBeTruthy();
    });
  });
});
