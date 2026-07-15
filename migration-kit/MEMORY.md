# MEMORY — {ชื่อโปรเจกต์ใหม่}

> Layer 2 ของ Global Rules · 1 entry = เกิดอะไร / ทำไม (root cause) / ครั้งหน้าทำยังไง
> เพิ่ม entry ทุกครั้งที่ทำพลาดแล้วแก้ได้ · seed ด้านล่างย้ายมาจาก JadHor OS (โปรเจกต์ต้นทาง)

---

## (seed) Next.js Static Generation Error ตอนรัน Vitest
- **เกิดอะไร:** เทสด้วย Vitest โยน `revalidatePath missing static generation store`
- **ทำไม:** Vitest ไม่ได้รันใน Next.js server environment จริง จึงไม่มี static generation store ให้ `revalidatePath` เรียกใช้
- **ครั้งหน้า:** เติม `vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))` ไว้หัวไฟล์ทดสอบทุกไฟล์ที่แตะ server action ที่เรียก `revalidatePath`

## (seed) Prisma mock ต้อง nest relation ให้ลึกเท่าที่โค้ดจริงเรียก `include`
- **เกิดอะไร:** mock คืนค่า Prisma data แบบก้อนแบน แต่ server action เรียกด้วย `include` → `TypeError: Cannot read properties of undefined`
- **ทำไม:** mock ไม่ตรงกับ shape ที่ query จริงคืนมาเมื่อมี `include`/`select` ซ้อน relation
- **ครั้งหน้า:** mock ต้องจำลองลึกถึงระดับที่ฟังก์ชันเรียกใช้จริง เช่น `tenant: { userId: "..." }` หรือ `room: { property: { ... } }`

## (seed) Vercel Cron ต้องคง region ใกล้ DB + คำนวณ UTC ให้ตรง
- **เกิดอะไร:** ตั้ง cron แล้ว timezone ไม่ตรง / functions หลุดไปรัน region ไกลจาก DB
- **ทำไม:** ถ้าไม่ล็อก `regions` ใน `vercel.json` ให้ตรงกับ region ของ DB จริง จะเจอ latency ข้ามภูมิภาคทุก request
- **ครั้งหน้า:** ล็อก `"regions"` ใน `vercel.json` ให้ตรง region ของ DB เสมอ (ห้ามลบ/แก้ตอนเพิ่ม cron อื่น) และคำนวณเวลา cron เป็น UTC ล่วงหน้าให้ตรงกับเวลาท้องถิ่นที่ต้องการ

## (seed) Mutation ที่มี approve/reject workflow ต้อง guard สถานะก่อนเขียนทับ
- **เกิดอะไร:** ผู้ใช้ส่งข้อมูลซ้ำทับข้อมูลเดิมหลังรายการถูกอนุมัติ (APPROVED) ไปแล้ว
- **ทำไม:** endpoint ไม่เช็คสถานะเดิมก่อนยอมรับ write ทำให้ record ที่ approved แล้วถูกแก้ทับได้
- **ครั้งหน้า:** ทุก mutation บน record ที่มี status workflow ต้องเช็คสถานะก่อนเขียนเสมอ (เช่น `if (record.status !== 'PENDING') reject`)

## (seed) Test suite ต้องมี IDOR/cross-owner/role negative case ไม่ใช่แค่ happy path
- **เกิดอะไร:** test เดิมครอบแค่ validation/happy-path — ไม่มีเคส resource ของ owner/tenant คนอื่น หรือ role ผิด
- **ทำไม:** เขียน test ตาม feature spec เป็นหลัก ไม่มี checklist บังคับ negative-path สำหรับ endpoint ที่แตะข้อมูลข้าม tenant/owner
- **ครั้งหน้า:** endpoint ที่มี ownership check ต้องมี test อย่างน้อย 3 เคส: (1) resource ของคนอื่น → 403/null (2) role ผิด → 401 (3) resource ไม่พบ → 403

---

## Stack / Test infra (แก้ให้ตรงโปรเจกต์ใหม่)
- DB layer: _{เติม}_
- Auth: _{เติม}_
- Test: _{เติม}_
