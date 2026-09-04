# แผนพัฒนา: งานช่าง/ซ่อมบำรุงระดับอาคาร (Facilities Maintenance)

> ร่างโดย Opus 4.8 (2026-07-22) · **ให้ Sonnet ลงมือทำต่อ**
> บริบท: เจ้าของระบบจะไปสมัครงานธุรการหอพัก งานมีส่วนซ่อมบำรุง เลยอยากให้ JadHor
> รองรับการบันทึกงานซ่อมระดับอาคาร (ไม่ใช่แค่ห้องเช่า) เพื่อใช้จริง + โชว์ตอนสมัครงาน
> ผู้ใช้เป็น "ธุรการคนเดียว" ไม่ใช่ทีมใหญ่ → เน้น MVP ไม่ over-engineer

---

## เป้าหมาย (MVP — ทำเป็นก้อนเดียว ไม่ต้องแบ่งเฟส)

ให้ owner/staff บันทึกงานซ่อมที่**ไม่ผูกกับห้องเช่า**ได้ (พื้นที่ส่วนกลาง/อาคาร/อุปกรณ์)
พร้อมบันทึก**ผลการซ่อม + ค่าใช้จ่าย + ผู้ดำเนินการ** ตอนปิดงาน และ export ประวัติเป็น CSV ได้

### อยู่ในขอบเขต
1. งานซ่อมไม่ผูกห้อง (common area / building / equipment)
2. บันทึกผลซ่อม + ค่าใช้จ่าย + ผู้ดำเนินการ (ข้อความ) ตอนปิดงาน
3. Export ประวัติซ่อมเป็น CSV (ใช้ pattern เดิมใน `src/app/actions/export-data.ts`)

### ไม่อยู่ในขอบเขต (ตัดสินใจแล้ว — อย่าเผลอทำ)
- ❌ **ทะเบียนช่าง/ผู้รับเหมาแบบ entity เต็ม** — ลดเหลือช่อง "ผู้ดำเนินการซ่อม" เป็น string ก่อน
  (ยกระดับเป็น model `Technician` จริงทีหลังถ้าผู้ใช้ต้องการ — ไม่ใช่ตอนนี้)
- ❌ **เก็บเอกสาร (ใบเสนอราคา/ใบเสร็จ)** — ผู้ใช้บอกใช้กระดาษก่อน ยังไม่ทำ
- ❌ **Google Sheets API integration** — เก็บใน DB เป็นหลัก, อยากดูใน Sheets ใช้ปุ่ม Export CSV
  แล้วเปิดใน Sheets เอง (ไม่เพิ่ม `googleapis` / service account — จุดพังเพิ่มโดยไม่จำเป็น)

---

## ⚠️ จุดสำคัญที่สุด — ownership check จะพังถ้าไม่แก้ให้ถูก

**ปัญหา:** ตอนนี้ทุก authz ของ maintenance วิ่งผ่าน chain `maintReq.room.property.ownerId`
ซึ่ง **บังคับต้องมี room** (ดู `src/app/api/maintenance/route.ts` PATCH บรรทัด ~262-266)
ถ้าทำ `roomId` เป็น optional แล้วไม่แก้จุดนี้ → งานซ่อมที่ไม่มีห้องจะ **crash** (`maintReq.room` = null)
หรือหลุด authz

**วิธีแก้ที่ถูกต้อง:** เพิ่ม field `propertyId` ตรงบน `MaintenanceRequest` (FK ตรงไป Property)
- งานซ่อมห้องเช่า (เดิม): มีทั้ง `roomId` และ `propertyId` (derive propertyId จาก room.propertyId ตอน create)
- งานซ่อมส่วนกลาง (ใหม่): มีแค่ `propertyId` (roomId = null)
- **ทุก ownership check เปลี่ยนไปเช็คผ่าน `maintReq.property.ownerId` + `maintReq.propertyId` แทน**
  (ไม่ต้องพึ่ง room อีก) — ใช้ `canAccessProperty(role, userId, ownerId, propertyId)` เหมือนเดิม

`canAccessProperty` signature (จาก `src/lib/staff-auth.ts`, อย่าเปลี่ยน):
```ts
canAccessProperty(role: ActorRole, userId: string, ownerId: string, propertyId: string): Promise<boolean>
```

---

## Schema changes (`prisma/schema.prisma`)

```prisma
model MaintenanceRequest {
  id          String  @id @default(cuid())
  roomId      String?                        // ← เปลี่ยนจากบังคับเป็น optional
  room        Room?   @relation(...)         // ← optional relation
  propertyId  String                         // ← เพิ่มใหม่ (บังคับ — ทุกงานซ่อมต้องรู้ว่าหออะไร)
  property    Property @relation(...)        // ← เพิ่มใหม่
  // ... field เดิมทั้งหมดคงไว้ ...

  // งานซ่อมส่วนกลาง (ใหม่)
  areaLabel   String?                        // เช่น "ลิฟต์ตัวที่ 2", "ปั๊มน้ำดาดฟ้า" (null ถ้าเป็นห้องเช่า)

  // ผลการซ่อม (กรอกตอนปิดงาน — ใหม่)
  resolvedNote  String?  @db.Text            // สิ่งที่ซ่อม/อะไหล่ที่ใช้
  repairCost    Float?                       // ค่าใช้จ่าย
  performedBy   String?                      // ผู้ดำเนินการซ่อม (ข้อความ — ยังไม่เป็น entity)
  resolvedImageUrl String? @db.Text          // รูปหลังซ่อม (before = imageUrl เดิม)
  completedAt   DateTime?                    // เวลาปิดงานจริง
}
```
- ต้องเพิ่ม back-relation `maintenance MaintenanceRequest[]` ใน model `Property` ด้วย
- Room ยังมี `maintenance MaintenanceRequest[]` เดิม แต่ relation เป็น optional ฝั่ง MaintenanceRequest

**Migration (R0-ish — แตะ DB prod):** ต้องรัน `npx prisma db push` เข้า Supabase จริง
- ⚠️ `propertyId` เป็น required field ใหม่บนตารางที่มี row เดิมอยู่ → db push จะ error ถ้ามี row เดิม
  **ต้อง backfill ก่อน:** เขียน script เติม `propertyId` ให้ row เดิมจาก `room.propertyId`
  หรือ push เป็น optional ก่อน → backfill → ค่อย alter เป็น required
  (เลือกวิธีที่ปลอดภัย ตรวจ row count ก่อน — ดู MEMORY.md เรื่อง prisma db push ที่ CLI เคยบอก
  "in sync" ทั้งที่ไม่ได้ผลจริง → ต้อง verify ด้วย query จริง)

---

## ไฟล์ที่ต้องแก้

1. **`prisma/schema.prisma`** — ตาม schema ข้างบน
2. **`src/app/api/maintenance/route.ts`**
   - POST: รองรับ 2 โหมด — แจ้งซ่อมจากผู้เช่า (มี room, เดิม) + แจ้งซ่อมส่วนกลางจาก owner/staff (มี propertyId + areaLabel, ไม่มี room). owner/staff ต้องเลือก property ที่ตัวเองมีสิทธิ์ (เช็ค `canAccessProperty`)
   - GET: ให้ query งานซ่อมของ property ได้ทั้งที่มี/ไม่มี room · staff เห็นเฉพาะ property ที่ได้รับมอบหมาย (ใช้ prisma-secure/canAccessProperty เดิม)
   - PATCH: **แก้ ownership check ให้ผ่าน `maintReq.property` แทน `maintReq.room.property`** (จุดสำคัญข้างบน) + เพิ่มการรับ field ผลซ่อม (resolvedNote/repairCost/performedBy/completedAt) ตอน status → COMPLETED
3. **`src/app/dashboard/maintenance/page.tsx`** (1033 บรรทัด — ใหญ่ ระวัง scope drift)
   - เพิ่มปุ่ม/ฟอร์ม "แจ้งซ่อมส่วนกลาง" (เลือก property + areaLabel + title + desc + รูป)
   - ตอนปิดงาน: ฟอร์มกรอกผลซ่อม + ค่าใช้จ่าย + ผู้ดำเนินการ + รูปหลังซ่อม
   - แยกการแสดง: งานห้องเช่า (โชว์เลขห้อง) vs งานส่วนกลาง (โชว์ areaLabel)
   - **ยึด design system เดิม** (การ์ด tonal gradient + icon chip — ดู AGENTS.md, ห้าม flat white)
4. **`src/app/actions/export-data.ts`** — เพิ่ม export ประวัติซ่อม (รวม cost/performedBy/resolvedNote) เป็น CSV
5. **`tests/`** — เพิ่ม negative test: staff แจ้ง/ปิดงานซ่อมของ property ที่ไม่ได้รับมอบหมาย → 403
   (ตาม pattern `tests/lib/prisma-secure-rls.test.ts` + MEMORY.md เรื่องต้องมี cross-property test)

---

## หลักที่ต้องยึด (อย่าเดา — ดูของจริง)
- **RLS/authz:** ใช้ `canAccessProperty` + prisma-secure เดิมทุกจุด · owner-only vs staff ตาม pattern ที่มีอยู่
- **Design:** ตาม `AGENTS.md` (Vibrant Tonal Cards) — tone ที่เหมาะกับงานช่าง เช่น cyan/orange
- **Money field:** ดู pattern `Bill.repairCost`/`Float` ที่มีอยู่ ใช้ให้สอดคล้อง
- **LINE noti:** งานซ่อมส่วนกลางไม่มีผู้เช่าให้แจ้ง — ข้ามการส่ง LINE หาผู้เช่า (กัน crash เพราะไม่มี room/tenant)

## Verification (ห้ามข้าม — VERIFY BEFORE DONE)
1. `npx prisma generate` หลังแก้ schema (npm นี้ block postinstall — ดู MEMORY.md)
2. `npx tsc --noEmit` = 0 error
3. `npm test` ผ่านหมด (รวม negative test ใหม่)
4. `npx prisma db push` เข้า prod + **verify ด้วย query จริง** ว่า column ขึ้นจริง (อย่าเชื่อข้อความ CLI)
5. เปิด preview (build ก่อน — launch.json รัน `next start` ไม่ใช่ dev) → login owner + staff ทดสอบ:
   - แจ้งซ่อมส่วนกลาง (ไม่เลือกห้อง) → บันทึกได้
   - ปิดงาน + กรอกค่าใช้จ่าย → บันทึกได้
   - staff เห็นเฉพาะ property ตัวเอง
6. commit แยก concern (schema / api / ui / test) + push (บัญชี `atthanopsornsri-pixel`)

## ประเด็นที่ควรถามผู้ใช้ก่อนเริ่ม (ถ้ายังไม่ชัด)
- ค่าใช้จ่ายซ่อมส่วนกลาง อยากให้เข้าไปคำนวณใน "สรุปกระแสเงินสด" ของ dashboard ไหม
  (ตอนนี้ dashboard คิดต้นทุนแค่ค่าน้ำ/ไฟ) — ถ้าใช่ scope จะโตขึ้น แยกเป็นเฟส 2
