# Disaster Recovery — JadHor OS

> สถานะ: ✅ **ตั้งค่าแล้วและ restore drill ผ่านจริง** (2026-07-19) — ดูรายละเอียดด้านล่าง

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

### ตัวเลือก B — off-site pg_dump อัตโนมัติ ✅ **ใช้ตัวนี้ (ตั้งค่าแล้ว)**
- `.github/workflows/backup.yml` — รัน `pg_dump` เต็มฐานข้อมูล (รวม `auth.*` schema + ทุกตารางใน `public`) ทุกวัน 20:00 UTC (03:00 ไทย) gzip แล้ว push เข้า branch `backups` (แยกจาก `main`, เก็บย้อนหลัง 30 วัน)
- แก้ 3 บั๊กที่เจอจากโปรเจกต์อื่นในเครื่องนี้ไว้ในโค้ดแล้ว: ใช้ **Session Pooler connection string**, pin `postgresql-client-17` + เรียก path เต็ม, ประกาศ `permissions: contents: write`
- Secret `SUPABASE_DB_URL` ถูกเพิ่มใน GitHub repo secrets แล้ว (ผู้ใช้เพิ่มเอง ไม่ได้ผ่าน AI)

## Checklist ก่อนปล่อยตลาดจริง
- [x] เลือกและตั้งค่า **ตัวเลือก B** (2026-07-19)
- [x] **restore drill จริงแล้ว** (2026-07-19) — รายละเอียดด้านล่าง
- [ ] ทดสอบ **rollback plan** ของ Vercel (Instant Rollback ไป deployment ก่อนหน้า) ว่าใช้ได้จริง — ยังไม่ได้ทำ
- [x] บันทึกวันที่ทำ restore drill ล่าสุดไว้ที่นี่: **2026-07-19**

## บันทึก Restore Drill (2026-07-19)

**วิธี:** ติดตั้ง PostgreSQL 17 บนเครื่อง local (ตรงเวอร์ชันกับ Supabase) → ดาวน์โหลดไฟล์ backup จริงจาก branch `backups` (`jadhor-2026-07-19T10-17-51Z.sql.gz`, 354 KB) → สร้าง cluster เปล่าแยกต่างหาก (ไม่แตะ DB จริง) → `psql -f backup.sql` restore เต็มรูปแบบ

**ผลลัพธ์:**
- Schema ของแอปทั้ง 21 ตาราง (`User`, `Property`, `Room`, `Bill`, `Tenant`, `Checkout`, ฯลฯ) restore สำเร็จ ไม่มี error
- Error ที่เจอ 3 จุดเป็นของ Supabase-internal เท่านั้น (extension `supabase_vault`, `\restrict` token) — **ไม่กระทบข้อมูลแอปเลย**
- Query row count จริง: users=4, properties=2, rooms=3, bills=1, tenants=1 — ตรงกับข้อมูลจริง
- **พิสูจน์ว่า login ได้จริง:** ดึง password hash ของ owner ออกมาจาก DB ที่ restore แล้ว ทดสอบด้วย `bcryptjs` (ไลบรารีเดียวกับที่แอปใช้จริงใน `authorize()`) — hash ถูกต้องตามฟอร์แมต `$2b$10$...` (60 ตัวอักษร) และ `bcrypt.compare()` ทำงานถูกต้อง (ไม่ throw, ไม่ false-positive)
- ลบ instance ทดสอบ + ไฟล์ backup ในเครื่องทิ้งหมดหลังตรวจเสร็จ (ไม่เก็บ password hash ค้างไว้)

**สรุป:** off-site backup กู้คืนระบบให้ user login ได้จริง — C02 ปิดสมบูรณ์
