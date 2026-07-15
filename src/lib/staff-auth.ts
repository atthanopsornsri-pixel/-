import { prisma } from "@/lib/prisma";

/**
 * Helper กลางสำหรับเช็คสิทธิ์ STAFF ในไฟล์ที่ยังใช้ raw `prisma.*`
 * (ไฟล์ที่ใช้ getSecurePrisma() ไม่ต้องเรียกอันนี้ — prisma-secure.ts scope ให้อัตโนมัติแล้ว)
 *
 * Daily-ops เท่านั้น (จด/ออกบิล/approve/maintenance/parcel/room/tenant) — ไม่ใช้กับ
 * SaaS billing, property legal/bank settings, staff management (คงเป็น owner-only)
 *
 * สำคัญ: path ของ OWNER เป็นการเทียบ ownerId ตรงๆ เหมือนโค้ดเดิมทุกประการ (ไม่ยิง query
 * เพิ่ม) — ต้องส่ง ownerId ที่ fetch มาแล้วเข้ามา ไม่ใช่ให้ helper ไป fetch เอง เพราะ route
 * ส่วนใหญ่ fetch entity (room/bill/tenant) พร้อม property.ownerId มาอยู่แล้วอยู่แล้วในคิวรีเดิม
 * — ยิง query ใหม่เฉพาะตอนเช็ค STAFF (PropertyStaff) เท่านั้น
 */

export type ActorRole = "ADMIN" | "OWNER" | "STAFF" | "TENANT" | string;

/**
 * @param ownerId    property.ownerId ที่ fetch มาพร้อม entity อยู่แล้ว
 * @param propertyId propertyId ของ entity นั้น (ใช้เฉพาะ path STAFF)
 */
export async function canAccessProperty(
  role: ActorRole,
  userId: string,
  ownerId: string,
  propertyId: string
): Promise<boolean> {
  if (role === "ADMIN") return true;
  if (role === "OWNER") return ownerId === userId;
  if (role === "STAFF") {
    const assignment = await prisma.propertyStaff.findUnique({
      where: { userId_propertyId: { userId, propertyId } },
    });
    return Boolean(assignment);
  }
  return false;
}

export function isOwnerOrStaff(role: ActorRole | undefined): boolean {
  return role === "OWNER" || role === "STAFF";
}
