import { describe, it, expect } from "vitest";
import { isPublicPayableStatus } from "@/lib/bill-status";

describe("isPublicPayableStatus — เกณฑ์บิลที่จ่ายได้บนหน้า public /pay/[id]", () => {
  it("UNPAID → จ่ายได้", () => {
    expect(isPublicPayableStatus("UNPAID")).toBe(true);
  });

  // regression: cron bill-reminder เขียน UNPAID → OVERDUE ลง DB จริง
  // ลิงก์ "เตือนค้างชำระ" ผ่าน LINE ต้องพาไปหน้าที่จ่ายได้ ไม่ใช่กล่องเขียว "ส่งหลักฐานสำเร็จ"
  it("OVERDUE → จ่ายได้ (กัน regression: หน้า pay เคย gate แค่ UNPAID)", () => {
    expect(isPublicPayableStatus("OVERDUE")).toBe(true);
  });

  it("PAID → จ่ายไม่ได้", () => {
    expect(isPublicPayableStatus("PAID")).toBe(false);
  });

  it("PENDING (รอเจ้าของตรวจสลิป) → จ่ายไม่ได้", () => {
    expect(isPublicPayableStatus("PENDING")).toBe(false);
  });

  it("WAIVED → จ่ายไม่ได้", () => {
    expect(isPublicPayableStatus("WAIVED")).toBe(false);
  });

  // PARTIAL ยังใช้ flow "ติดต่อเจ้าของเรื่องยอดคงเหลือ" (รอเจ้าของตัดสิน) — คงไว้เป็น false โดยตั้งใจ
  it("PARTIAL → จ่ายไม่ได้บนหน้า public (รอเจ้าของตัดสินใจ)", () => {
    expect(isPublicPayableStatus("PARTIAL")).toBe(false);
  });
});
