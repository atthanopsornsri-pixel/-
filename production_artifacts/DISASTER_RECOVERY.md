# Disaster Recovery — JadHor OS

> สถานะ: ⚠️ **ยังไม่มี disaster-recovery backup ที่แท้จริง** — ต้องตั้งค่าก่อนปล่อยตลาดจริง

## ปัญหา (finding C02)

`/api/cron/backup` ที่รันทุกวันคือ **data-audit export** ไม่ใช่ backup สำหรับกู้ระบบ:
- ไม่มี password / auth tokens (โดยเจตนา — ไม่ควรเขียน credentials ลง Storage bucket)
- เขียนไฟล์ไว้ใน Supabase Storage **ของโปรเจกต์เดียวกันกับ DB** — ถ้าโปรเจกต์ Supabase มีปัญหา ทั้ง DB และ backup หายพร้อมกัน (ไม่ใช่ off-site)

หลังแก้ในโค้ดแล้ว export ครอบคลุมทุกตาราง operational + ไม่มี cutoff เวลา (ดีขึ้นสำหรับ audit/สร้างข้อมูลใหม่บางส่วน) **แต่ยังกู้ auth state ไม่ได้ และยังอยู่ใน storage เดียวกับ DB**

## ทางแก้จริง — ต้องเลือก 1 ใน 2 (เป็น infra action นอกโค้ด)

### ตัวเลือก A — Supabase Point-in-Time Recovery (PITR) ✅ แนะนำ
- เปิดใน Supabase Dashboard → Database → Backups → เปิด PITR (ต้องใช้แพ็กเกจ Pro ขึ้นไป — มีค่าใช้จ่าย)
- กู้คืนได้ถึงระดับวินาที รวม auth/ทุกตาราง ครบสมบูรณ์
- **restore drill:** สร้าง Supabase project ชั่วคราว → restore snapshot → ชี้ `DATABASE_URL` ทดสอบว่า login ได้ → ทิ้ง project ทิ้ง

### ตัวเลือก B — off-site pg_dump อัตโนมัติ (ถ้าไม่อยากจ่าย PITR)
- ตั้ง GitHub Actions รัน `pg_dump` เต็มฐานข้อมูล (รวม auth) ทุกวัน เก็บไว้ที่อื่น (เช่น อีก repo/S3)
- **บทเรียนจากโปรเจกต์อื่นในเครื่องนี้ (กันเสียเวลาซ้ำ):**
  - ใช้ **Session Pooler connection string** ไม่ใช่ Direct connection (Direct เป็น IPv6-only, GitHub runner ต่อไม่ได้)
  - **pin `postgresql-client` ให้ตรง major version กับ Supabase** (Supabase = PG 17 → เรียก path เต็ม `/usr/lib/postgresql/17/bin/pg_dump`)
  - ประกาศ `permissions: contents: write` ใน workflow ถ้าต้อง commit กลับ repo
  - เก็บ connection string ไว้ใน GitHub Secret (ไม่ใช่ anon key)

## Checklist ก่อนปล่อยตลาดจริง
- [ ] เลือกและตั้งค่า A หรือ B
- [ ] ทำ **restore drill จริง** อย่างน้อย 1 ครั้ง — ยืนยันว่า user login ได้หลัง restore
- [ ] ทดสอบ **rollback plan** ของ Vercel (Instant Rollback ไป deployment ก่อนหน้า) ว่าใช้ได้จริง
- [ ] บันทึกวันที่ทำ restore drill ล่าสุดไว้ที่นี่: ____________
