/**
 * สถานะบิลที่ยังเปิดให้ลูกบ้านอัปโหลดสลิป/ชำระผ่านหน้า public `/pay/[id]` ได้
 *
 * สำคัญ: cron `bill-reminder` จะเขียนสถานะ UNPAID → OVERDUE ลง DB จริงเมื่อบิลเลยกำหนด
 * (ดู `src/app/api/cron/bill-reminder/route.ts`) ดังนั้นหน้า pay ต้องนับ OVERDUE เป็น "จ่ายได้"
 * ด้วย ไม่งั้นลิงก์ "เตือนค้างชำระ" ที่ส่งผ่าน LINE จะพาลูกบ้านไปเจอหน้าที่จ่ายไม่ได้
 *
 * NOTE: PARTIAL ยังไม่รวมที่นี่โดยตั้งใจ — หน้า pay ยังใช้ flow "ติดต่อเจ้าของเรื่องยอดคงเหลือ"
 * (เป็น UX policy ที่รอเจ้าของตัดสิน คนละกรณีกับ OVERDUE)
 */
export function isPublicPayableStatus(status: string): boolean {
  return status === "UNPAID" || status === "OVERDUE";
}
