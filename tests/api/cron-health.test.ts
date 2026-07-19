import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  userCount: vi.fn(),
  roomCount: vi.fn(),
  billCount: vi.fn(),
  logError: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { count: mocks.userCount },
    room: { count: mocks.roomCount },
    bill: { count: mocks.billCount },
  },
}));
vi.mock('@/lib/logger', () => ({ logError: mocks.logError }));

import { GET } from '@/app/api/cron/health/route';

const SECRET = 'cron-secret-abc';
const makeReq = (auth?: string) =>
  new Request('http://localhost/api/cron/health', {
    headers: auth ? { authorization: auth } : {},
  });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.userCount.mockResolvedValue(10);
  mocks.roomCount.mockResolvedValue(20);
  mocks.billCount.mockResolvedValue(3);
});
afterEach(() => vi.unstubAllEnvs());

describe('GET /api/cron/health — CRON_SECRET auth (SECURITY)', () => {
  beforeEach(() => vi.stubEnv('CRON_SECRET', SECRET));

  it('ไม่มี Authorization → 401', async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
    expect(mocks.userCount).not.toHaveBeenCalled();
  });

  it('Bearer ผิด → 401', async () => {
    const res = await GET(makeReq('Bearer wrong-secret'));
    expect(res.status).toBe(401);
  });

  it('Bearer ถูกต้อง → 200 พร้อม stats', async () => {
    const res = await GET(makeReq(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('ok');
    expect(json.stats).toMatchObject({ userCount: 10, roomCount: 20, unpaidBills: 3 });
  });
});

describe('GET /api/cron/health — DB error', () => {
  beforeEach(() => vi.stubEnv('CRON_SECRET', SECRET));

  it('DB ล้ม → 503 + logError ถูกเรียก', async () => {
    mocks.userCount.mockRejectedValue(new Error('connection refused'));
    const res = await GET(makeReq(`Bearer ${SECRET}`));
    expect(res.status).toBe(503);
    expect(mocks.logError).toHaveBeenCalled();
  });
});

describe('GET /api/cron/health — ไม่ตั้ง CRON_SECRET (fail-closed, C01)', () => {
  it('ไม่ตั้ง secret → 503 ปฏิเสธ (ไม่ปล่อยผ่าน) + ไม่แตะ DB', async () => {
    vi.stubEnv('CRON_SECRET', undefined);
    const res = await GET(makeReq());
    expect(res.status).toBe(503);
    expect(mocks.userCount).not.toHaveBeenCalled();
  });
});
