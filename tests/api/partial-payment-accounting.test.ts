/**
 * tests/api/partial-payment-accounting.test.ts
 *
 * Comprehensive test suite for Option A: Partial Payment Accounting Fix
 * Covers all 7 mandatory test cases defined in docs/plan-partial-payment-accounting.md:
 * 1. UNPAID bill paid in full via pay route -> PAID, paidAmount === totalAmount
 * 2. pay route: underpaid slip (auto-verified amount < totalAmount) -> status PENDING, paidAmount untouched (Option A)
 * 3. approvePartialBill: bill paid 3000/5000 previously -> owner records cumulative 5000 -> status PAID, paidAmount=5000
 * 4. approvePartialBill: cumulative amount incomplete (3000/5000) -> status PARTIAL, paidAmount recorded
 * 5. Attempt to pay/approve bill already in PAID status -> blocked (status guard)
 * 6. Duplicate slip (transRef duplicate) -> rejected with DUPLICATE_SLIP
 * 7. Negative/ownership: another owner calls approve bill cross-property -> 403 / denied
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  billFindUnique: vi.fn(),
  billFindFirst: vi.fn(),
  billUpdate: vi.fn(),
  billUpdateMany: vi.fn(),
  tenantFindUnique: vi.fn(),
  getServerSession: vi.fn(),
  verifySlip: vi.fn(),
  receiverMatchesPromptPay: vi.fn(),
  revalidatePath: vi.fn(),
  sendLineOAMessage: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    bill: {
      findUnique: mocks.billFindUnique,
      findFirst: mocks.billFindFirst,
      update: mocks.billUpdate,
      updateMany: mocks.billUpdateMany,
    },
    tenant: {
      findUnique: mocks.tenantFindUnique,
    },
  },
}));

vi.mock("@/lib/prisma-secure", () => ({
  getSecurePrisma: vi.fn().mockImplementation(async () => ({
    bill: {
      findUnique: mocks.billFindUnique,
      update: mocks.billUpdate,
    },
  })),
}));

vi.mock("@/lib/slip-verification", () => ({
  verifySlip: mocks.verifySlip,
  receiverMatchesPromptPay: mocks.receiverMatchesPromptPay,
}));

vi.mock("@/lib/line", () => ({
  sendLineOAMessage: mocks.sendLineOAMessage.mockResolvedValue(undefined),
}));

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: (fn: () => unknown) => fn() };
});

import { PATCH as payRoute } from "@/app/api/bills/[id]/pay/route";
import { PATCH as approveRoute } from "@/app/api/bills/[id]/approve/route";
import { approvePartialBill, approveBill } from "@/app/actions/payment-approval";

const baseBill = (overrides: Record<string, any> = {}) => ({
  id: "bill-101",
  status: "UNPAID",
  totalAmount: 5000,
  paidAmount: 0,
  paymentDate: null,
  roomId: "room-1",
  room: {
    number: "101",
    propertyId: "prop-1",
    property: {
      ownerId: "owner-1",
      promptPayNo: "0640353806",
      owner: { lineUserId: "owner-line-1", lineChannelAccessToken: "token-1" },
    },
    tenants: [
      { lineUserId: "tenant-line-1", firstName: "สมชาย", lastName: "ใจดี" },
    ],
  },
  ...overrides,
});

const makePayReq = (body: unknown) =>
  new Request("http://localhost/api/bills/bill-101/pay", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const payCtx = { params: Promise.resolve({ id: "bill-101" }) };
const approveCtx = { params: Promise.resolve({ id: "bill-101" }) };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.billFindUnique.mockResolvedValue(baseBill());
  mocks.billFindFirst.mockResolvedValue(null);
  mocks.billUpdate.mockImplementation(async (args: any) => ({
    ...baseBill(),
    ...args.data,
  }));
  mocks.billUpdateMany.mockResolvedValue({ count: 1 });
  mocks.getServerSession.mockResolvedValue(null);
  mocks.verifySlip.mockResolvedValue({ enabled: false, verified: false });
  mocks.receiverMatchesPromptPay.mockReturnValue(true);
});

describe("Partial Payment Accounting Fix — Option A (7 Mandatory Cases)", () => {
  // ─── Case 1 ───────────────────────────────────────────────────────────────
  it("Case 1: บิล UNPAID จ่ายเต็มผ่าน pay route → PAID, paidAmount === totalAmount", async () => {
    mocks.verifySlip.mockResolvedValue({
      enabled: true,
      verified: true,
      amount: 5000,
      receiverAccount: "xxx3806",
      transRef: "REF-FULL-1",
    });

    const res = await payRoute(
      makePayReq({ slipUrl: "data:image/jpeg;base64,VALID_SLIP" }),
      payCtx
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.autoVerified).toBe(true);

    const updateCall = mocks.billUpdate.mock.calls[0][0];
    expect(updateCall.data.status).toBe("PAID");
    expect(updateCall.data.paidAmount).toBe(5000);
  });

  // ─── Case 2 ───────────────────────────────────────────────────────────────
  it("Case 2: pay route: สลิปยอดไม่ครบ (auto-verified amount < totalAmount) → status PENDING, paidAmount ไม่ถูกแตะ (ไม่เขียนทับ)", async () => {
    // กำหนดให้บิลมี paidAmount เดิม = 1000 (หรือ 0)
    mocks.billFindUnique.mockResolvedValue(
      baseBill({ totalAmount: 5000, paidAmount: 1000, status: "PARTIAL" })
    );

    mocks.verifySlip.mockResolvedValue({
      enabled: true,
      verified: true,
      amount: 3000, // จ่ายมา 3000 แต่ยอดรวมคือ 5000
      receiverAccount: "xxx3806",
      transRef: "REF-UNDERPAID-1",
    });

    const res = await payRoute(
      makePayReq({ slipUrl: "data:image/jpeg;base64,VALID_SLIP" }),
      payCtx
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.autoVerified).toBe(false);

    const updateCall = mocks.billUpdate.mock.calls[0][0];
    // Option A: ตกเป็น PENDING ให้เจ้าของตรวจเอง
    expect(updateCall.data.status).toBe("PENDING");
    // ไม่แตะ paidAmount (ยังคงเป็น 1000 เดิม ไม่ถูกเขียนทับเป็น 3000!)
    expect(updateCall.data.paidAmount).toBe(1000);
  });

  // ─── Case 3 ───────────────────────────────────────────────────────────────
  it("Case 3: approvePartialBill: บิลจ่ายมาแล้ว 3000/5000 → owner บันทึกยอดสะสมเป็น 5000 → status PAID, paidAmount=5000", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: "owner-1", role: "OWNER" },
    });

    mocks.billFindUnique.mockResolvedValue(
      baseBill({ totalAmount: 5000, paidAmount: 3000, status: "PARTIAL" })
    );

    // Owner บันทึกยอดสะสมเป็น 5000 (ครบยอด)
    const res = await approvePartialBill("bill-101", 5000);

    expect(res.success).toBe(true);
    expect(res.status).toBe("PAID");
    expect(res.paidAmount).toBe(5000);

    const updateCall = mocks.billUpdate.mock.calls[0][0];
    expect(updateCall.data.status).toBe("PAID");
    expect(updateCall.data.paidAmount).toBe(5000);
  });

  // ─── Case 4 ───────────────────────────────────────────────────────────────
  it("Case 4: approvePartialBill: ยอดสะสมยังไม่ครบ (เช่น 3000/5000) → ยังเป็น PARTIAL, paidAmount สะสมถูก", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: "owner-1", role: "OWNER" },
    });

    mocks.billFindUnique.mockResolvedValue(
      baseBill({ totalAmount: 5000, paidAmount: 0, status: "PENDING" })
    );

    // Owner บันทึกยอดสะสมเป็น 3000 (ยังไม่ครบ)
    const res = await approvePartialBill("bill-101", 3000);

    expect(res.success).toBe(true);
    expect(res.status).toBe("PARTIAL");
    expect(res.paidAmount).toBe(3000);

    const updateCall = mocks.billUpdate.mock.calls[0][0];
    expect(updateCall.data.status).toBe("PARTIAL");
    expect(updateCall.data.paidAmount).toBe(3000);
  });

  // ─── Case 5 ───────────────────────────────────────────────────────────────
  describe("Case 5: พยายามจ่าย/อนุมัติบิลที่ PAID แล้ว → ถูกบล็อก (status guard)", () => {
    it("Case 5a: pay route บล็อกบิลที่ PAID แล้ว", async () => {
      mocks.billFindUnique.mockResolvedValue(
        baseBill({ status: "PAID", paidAmount: 5000 })
      );

      const res = await payRoute(
        makePayReq({ slipUrl: "data:image/jpeg;base64,SLIP" }),
        payCtx
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.message).toContain("บิลนี้ได้รับการชำระเงินเรียบร้อยแล้ว");
      expect(mocks.billUpdate).not.toHaveBeenCalled();
    });

    it("Case 5b: approve route บล็อกบิลที่ PAID แล้ว", async () => {
      mocks.getServerSession.mockResolvedValue({
        user: { id: "owner-1", role: "OWNER" },
      });
      mocks.billFindUnique.mockResolvedValue(
        baseBill({ status: "PAID", paidAmount: 5000 })
      );

      const req = new Request("http://localhost/api/bills/bill-101/approve", {
        method: "PATCH",
      });
      const res = await approveRoute(req, approveCtx);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.message).toContain("บิลนี้ได้รับการชำระเงินเรียบร้อยแล้ว");
      expect(mocks.billUpdateMany).not.toHaveBeenCalled();
    });

    it("Case 5c: approvePartialBill action บล็อกบิลที่ PAID แล้ว", async () => {
      mocks.getServerSession.mockResolvedValue({
        user: { id: "owner-1", role: "OWNER" },
      });
      mocks.billFindUnique.mockResolvedValue(
        baseBill({ status: "PAID", paidAmount: 5000 })
      );

      const res = await approvePartialBill("bill-101", 5000);

      expect(res.success).toBe(false);
      expect(res.error).toContain("บิลนี้ได้รับการชำระเงินเรียบร้อยแล้ว");
      expect(mocks.billUpdate).not.toHaveBeenCalled();
    });

    it("Case 5d: approveBill action บล็อกบิลที่ PAID แล้ว", async () => {
      mocks.getServerSession.mockResolvedValue({
        user: { id: "owner-1", role: "OWNER" },
      });
      mocks.billFindUnique.mockResolvedValue(
        baseBill({ status: "PAID", paidAmount: 5000 })
      );

      const res = await approveBill("bill-101");

      expect(res.success).toBe(false);
      expect(res.error).toContain("บิลนี้ได้รับการชำระเงินเรียบร้อยแล้ว");
      expect(mocks.billUpdate).not.toHaveBeenCalled();
    });
  });

  // ─── Case 6 ───────────────────────────────────────────────────────────────
  describe("Case 6: สลิปซ้ำ (transRef เดิม) → ถูกปฏิเสธ (DUPLICATE_SLIP)", () => {
    it("Case 6a: SlipOK ตรวจพบสลิปซ้ำ (verification.duplicate: true) → 400 DUPLICATE_SLIP", async () => {
      mocks.verifySlip.mockResolvedValue({
        enabled: true,
        verified: false,
        duplicate: true,
      });

      const res = await payRoute(
        makePayReq({ slipUrl: "data:image/jpeg;base64,DUP_SLIP" }),
        payCtx
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe("DUPLICATE_SLIP");
      expect(mocks.billUpdate).not.toHaveBeenCalled();
    });

    it("Case 6b: transRef เคยถูกใช้ในบิลอื่นในระบบ → 400 DUPLICATE_SLIP", async () => {
      mocks.verifySlip.mockResolvedValue({
        enabled: true,
        verified: true,
        amount: 5000,
        transRef: "ALREADY_USED_TRANS_REF",
      });

      // จำลองว่าพบบิลอื่นที่ใช้ transRef นี้ไปแล้ว
      mocks.billFindFirst.mockResolvedValue({
        id: "bill-OTHER",
        slipTransRef: "ALREADY_USED_TRANS_REF",
      });

      const res = await payRoute(
        makePayReq({ slipUrl: "data:image/jpeg;base64,DUP_SLIP" }),
        payCtx
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe("DUPLICATE_SLIP");
      expect(mocks.billUpdate).not.toHaveBeenCalled();
    });
  });

  // ─── Case 7 ───────────────────────────────────────────────────────────────
  describe("Case 7: negative/ownership: owner คนอื่นเรียก approve บิลข้าม property → 403 / ปฏิเสธ", () => {
    it("Case 7a: PATCH /api/bills/[id]/approve ปฏิเสธ owner คนอื่น (403)", async () => {
      // ผู้ล็อกอินคือ other-owner
      mocks.getServerSession.mockResolvedValue({
        user: { id: "other-owner", role: "OWNER" },
      });

      // บิลเป็นของ owner-1
      mocks.billFindUnique.mockResolvedValue(
        baseBill({
          room: {
            ...baseBill().room,
            property: {
              ...baseBill().room.property,
              ownerId: "owner-1",
            },
          },
        })
      );

      const req = new Request("http://localhost/api/bills/bill-101/approve", {
        method: "PATCH",
      });
      const res = await approveRoute(req, approveCtx);

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.message).toBe("Unauthorized");
      expect(mocks.billUpdateMany).not.toHaveBeenCalled();
    });

    it("Case 7b: approvePartialBill ปฏิเสธเมื่อบิลไม่พบใน scope ของ owner (IDOR null guard)", async () => {
      mocks.getServerSession.mockResolvedValue({
        user: { id: "other-owner", role: "OWNER" },
      });

      // getSecurePrisma RLS ทำให้ findUnique คืน null สำหรับบิลข้ามเจ้าของ
      mocks.billFindUnique.mockResolvedValue(null);

      const res = await approvePartialBill("bill-101", 3000);

      expect(res.success).toBe(false);
      expect(res.error).toContain("ไม่มีสิทธิ์");
      expect(mocks.billUpdate).not.toHaveBeenCalled();
    });
  });
});
