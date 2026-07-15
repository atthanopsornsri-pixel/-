# MEMORY — JadHor OS (apartment-system)

> Layer 2 ของ Global Rules · 1 entry = เกิดอะไร / ทำไม (root cause) / ครั้งหน้าทำยังไง
> เพิ่ม entry ทุกครั้งที่ทำพลาดแล้วแก้ได้

---

## 2026-06-25 · Vitest alias ต้องชี้ไป `src` ไม่ใช่ root
- **เกิดอะไร:** ตั้ง vitest ครั้งแรก ตาม template เริ่มต้นใช้ alias `{ '@': root }`
- **ทำไม:** `tsconfig.json` ของโปรเจกต์นี้ map `"@/*": ["./src/*"]` (มี `src/`) ถ้า alias ชี้ root จะ resolve `@/lib/...` ผิดทั้งหมด → import พังหมด
- **ครั้งหน้า:** vitest alias ต้องเป็น `{ '@': path.join(root, 'src') }` — ดู `vitest.config.ts`

## 2026-06-25 · `deriveKey()` ใน encryption.ts ใช้ `??` ไม่ fallback จาก empty string
- **เกิดอะไร:** เขียน test fallback key เริ่มจาก `vi.stubEnv('CREDENTIALS_ENCRYPTION_KEY', '')` แล้วคาดว่าจะตกไปใช้ `NEXTAUTH_SECRET`
- **ทำไม:** `process.env.CREDENTIALS_ENCRYPTION_KEY ?? process.env.NEXTAUTH_SECRET` — `??` fallback เฉพาะ `null`/`undefined` ไม่ใช่ `''` (empty string ผ่าน `??` แต่ตกที่ `if (!raw)` → ใช้ zero-key แทน)
- **ครั้งหน้า:** จะ test path ของ NEXTAUTH_SECRET ต้อง `vi.stubEnv(name, undefined)` (ลบ env) ไม่ใช่ `''`

## 2026-06-25 · `npm install` บล็อก `prisma generate` → type error ลวง 90+ ตัว (สำคัญ)
- **เกิดอะไร:** หลัง `npm install -D vitest` แล้ว `tsc --noEmit` ขึ้น 91 errors ทั่วโปรเจกต์ (prisma-secure 37, billing-batch 11, ...) เกือบเข้าใจผิดว่าเป็น tech debt เดิม + `next build` ล้มจริง
- **ทำไม (root cause):** npm รุ่นนี้ block postinstall scripts (allow-scripts) → `npm install` ใด ๆ reinstall `@prisma/client` ทับ generated client แต่ `postinstall: prisma generate` ไม่รัน → type ของ Prisma หายหมด → ทุก callback `$extends` + consumer ตกเป็น `any`/`{}` → error ลูกโซ่ทั้งโปรเจกต์ (โค้ดไม่ได้ผิด)
- **ครั้งหน้า:** หลัง `npm install`/`npm ci` ใด ๆ ในโปรเจกต์นี้ **รัน `npx prisma generate` ทันทีเสมอ** ก่อนสรุปว่ามี type error · ถ้าเจอ type error เป็นกองทั่วโปรเจกต์แบบ "property ไม่มีบน {}" ให้สงสัย stale Prisma client ก่อน · อย่ารัน `npm audit fix --force` (downgrade next พัง — ตาม VITEST guide)

## 2026-06-28 · ปัญหาความต่าง Timezone และวันจดมิเตอร์ในระบบทดสอบ (Vitest Date Mock)
- **เกิดอะไร:** เทสต์ของระบบรายงานมิเตอร์ของผู้เช่า (`meter-submissions.test.ts`) รันผ่านบนเครื่องหนึ่ง แต่พอมารันอีกช่วงปลายเดือนกลับเทสต์พัง 3 เคส
- **ทำไม:** เนื่องจากระบบจริงมีการตรวจเช็กช่วงวันที่ที่เปิดให้จดรายงานมิเตอร์ (เช่น `reportStartDay: 1` ถึง `reportEndDay: 28`) การใช้ `new Date()` ในฟังก์ชันจริงทำให้วันประมวลผลเปลี่ยนไปตามเวลาจริงของเครื่องคอมพิวเตอร์ที่ใช้รันเทสต์ (เช่น วันที่ 29)
- **ครั้งหน้า:** เติม `vi.useFakeTimers()` และ `vi.setSystemTime(new Date("2026-06-15"))` ใน `beforeEach` เสมอสำหรับเทสต์ที่อิงกับวันที่หรือช่วงเวลาของเดือน และเรียกคืนค่าด้วย `vi.useRealTimers()` ใน `afterEach`

## 2026-06-28 · ปัญหารวมไฟล์ล็อกบน OneDrive (EBUSY / EPERM)
- **เกิดอะไร:** การรัน `npm install` และสั่ง Next.js dev server เกิดข้อผิดพลาดไฟล์ถูกล็อกสิทธิ์ หรือคอมพิวเตอร์กินทรัพยากร CPU สูงมากและหน่วงเครื่อง
- **ทำไม:** OneDrive ทำการสแกนและพยายามซิงค์ข้อมูลไฟล์ใน `node_modules` และ `.next` แคชขึ้นระบบคลาวด์แบบ Real-time ซึ่งทำให้ระบบพัฒนาช้าและโดนบล็อกการอัปเดตไฟล์
- **ครั้งหน้า:** ห้ามทำโปรเจกต์พัฒนาระบบที่มีขนาดไฟล์ย่อยจำนวนมากในโฟลเดอร์ซิงค์ข้อมูลอย่าง OneDrive/Dropbox ให้ย้ายไปทำงานในไดเรกทอรีโลคอลตรง เช่น `C:\dev\JadHor` 

## 2026-06-28 · หน้าสั่งพิมพ์การ์ดแบ่งกระดาษเป็น 2 หน้า (Print Page-Break Overflow)
- **เกิดอะไร:** การกดสั่งพิมพ์การ์ดโมดอลลงทะเบียน QR Code ของห้องพัก ได้ผลลัพธ์พรีวิวฉีกขาดออกจากกันเป็น 2 หน้ากระดาษ
- **ทำไม:** เบราว์เซอร์ยังคงคำนวณและพยายามวาดเนื้อหาหน้าจอหลัก (ตารางรายชื่อห้องพักทั้งหมด) ที่อยู่ด้านหลังโมดอล แม้ว่าตัวโมดอลจะตั้งค่า `print:fixed` ไว้ก็ตาม ความสูงของหน้าจอข้างหลังที่ยาวหลายหน้าจึงบีบให้เลย์เอาต์การ์ดที่ถูกพิมพ์ฉีกตาม
- **ครั้งหน้า:** บังคับให้โครงสร้างภายนอกของการ์ดและองค์ประกอบแอปอื่นๆ ได้รับคลาส `print:hidden` และนำการ์ดโมดอลที่จะสั่งพิมพ์มาเรนเดอร์อยู่นอก Container หลักของหน้าเว็บ เพื่อตัดสิ่งไม่เกี่ยวข้องออกทั้งหมด ทำให้กระดาษพิมพ์เหลือเพียง **1 หน้า A4 เสมอ**

## 2026-06-28 · ฐานข้อมูลไม่ตรงกับ Schema หลังแก้ไขความสัมพันธ์ (Prisma DB Sync)
- **เกิดอะไร:** API ดึงหอพักดึงข้อมูลไม่ขึ้น (500 Error) ทำให้การแสดงผลขัดแย้งกับตารางห้องพัก
- **ทำไม:** การอัปเดตโมเดลความสัมพันธ์ใหม่ยังไม่ได้ถูกนำไปป้อนเข้าระบบฐานข้อมูลจริงของ Supabase แม้จะรัน Client Generation แล้วก็ตาม
- **ครั้งหน้า:** เมื่อปรับแก้โครงสร้างข้อมูลหรือเพิ่มตารางความสัมพันธ์ใน `schema.prisma` จะต้องไม่ลืมรันคำสั่ง `npx prisma db push` เสมอ เพื่ออัปเกรดตารางในฐานข้อมูลกลางให้ตรงกับโค้ดฝั่งหน้าบ้าน

## 2026-06-30 · Meter self-report: ต้อง guard `status !== PENDING` ก่อนแก้ทับ record ที่อนุมัติแล้ว
- **เกิดอะไร:** ฟีเจอร์ให้ลูกบ้านจดมิเตอร์เอง (`MeterSubmission`) — ถ้าลูกบ้านส่งเลขซ้ำ/retry หลังเจ้าของบ้านกด APPROVED ไปแล้ว จะเขียนทับ reading ที่ใช้คำนวณบิลไปแล้ว
- **ทำไม (root cause):** endpoint submit/approve ไม่ได้เช็คสถานะเดิมก่อน write — เขียนทับได้ทุกกรณีไม่ว่า record จะอยู่สถานะไหน
- **ครั้งหน้า:** ทุก mutation บน record ที่มี approve/reject workflow (meter, deposit, maintenance) ต้อง guard `if (record.status !== 'PENDING') reject` ก่อน write เสมอ — ดู pattern จริงใน meter-submission approve/reject route

## 2026-06-26 · Test suite ครอบแค่ happy path — ไม่มี IDOR/cross-owner/role negative case
- **เกิดอะไร:** `high-impact.test.ts` (deposit mutation) และ `completeness.test.ts` (rooms PATCH) ครอบ validation/happy-path ครบ แต่ไม่มี test กรณี resource เป็นของ owner/tenant คนอื่น หรือ role ผิด — โค้ด IDOR check ถูกอยู่แล้ว แต่ไม่มีอะไรล็อกกันถอยหลัง
- **ทำไม (root cause):** เขียน test ตาม feature spec เป็นหลัก ไม่มี checklist บังคับ negative-path สำหรับทุก endpoint ที่แตะข้อมูลข้าม tenant/owner
- **ครั้งหน้า:** ทุก endpoint ที่มี ownership check (ผ่าน `secureDb.*.findFirst/findUnique`) ต้องมี test อย่างน้อย 3 เคส: (1) resource ของ owner/tenant คนอื่น → 403/null (2) role ผิด → 401 (3) resource ไม่พบ → 403 — ไม่ใช่แค่ happy path

---

## 2026-07-15 · โค้ดจาก AI agent อื่น (Antigravity) อ้างว่าทำเสร็จแล้ว แต่ไม่มีอยู่ใน repo เลย
- **เกิดอะไร:** ได้รับ `audit_report.md` สรุปฟีเจอร์ E-Contract (schema field, signature canvas, `/api/sign/[token]`) ว่าทำเสร็จแล้ว แต่ `git log --all -S` ทุก branch (local+origin) หาโค้ดที่รายงานพูดถึงไม่เจอเลยสักบรรทัด — งานยังไม่เคย exist ใน repo จนกว่าผู้ใช้จะ copy ไฟล์มาวางเองในภายหลัง
- **ทำไม:** agent คนละตัว/environment ทำงานแยกจาก repo ที่ AI ตัวปัจจุบันเห็น รายงานสรุปงานไม่ได้แปลว่าโค้ด sync เข้ามาจริง
- **ครั้งหน้า:** ก่อนเชื่อ "audit report"/"สรุปงาน" จาก agent อื่นว่าเป็นของจริง ต้อง verify ด้วย `git status` + `git log --all -S "<unique string>"` (ครอบทุก branch ทั้ง local และหลัง `git fetch` กับ remote) ก่อนเสมอ — ห้ามอัปเดต memory/วางแผนต่อจากรายงานเฉยๆ โดยไม่เห็นโค้ดจริง

## 2026-07-15 · E-Contract ฉบับที่ copy เข้ามา มี IDOR + missing status guard + route วางผิดที่ (สำคัญ)
- **เกิดอะไร:** หลัง copy โค้ด E-Contract เข้า repo พบ 4 บั๊ก: (1) หน้าเซ็นสัญญาวางไว้ที่ `src/sign/[token]/page.tsx` นอก `src/app/` ทำให้ route 404 เสมอ (2) `e-contract/route.ts` และ `e-contract/send/route.ts` เช็คแค่ `role === "OWNER"` ไม่เช็ค `tenant.room.property.ownerId` — owner คนไหนก็อ่าน/แก้สัญญาของผู้เช่าเจ้าของหออื่นได้ (3) `/api/sign/[token]` POST ไม่เช็ค `eContractStatus !== "SENT"` ก่อนเขียนทับ ทำให้ลิงก์ที่หลุด/แชร์ต่อเซ็นทับซ้ำได้แม้ SIGNED แล้ว (4) ไม่มี rate limit บน public endpoint นี้เลยทั้งที่โปรเจกต์มี `@/lib/rate-limit` อยู่แล้ว
- **ทำไม:** โค้ดใหม่ที่มาจากนอก repo ไม่ได้ตาม pattern ที่โปรเจกต์นี้วางไว้แล้ว (ownership check แบบ `tenants/[id]/route.ts`, status-guard แบบ meter-submission, rate-limit แบบ `forgot-password/route.ts`) — เขียนแยกจาก convention เดิมทั้งหมด
- **ครั้งหน้า:** ฟีเจอร์ที่ก็อปมาจากนอก repo (agent อื่น/environment อื่น) ต้อง diff เทียบกับ convention ที่มีอยู่แล้วในโปรเจกต์เสมอ (ownership check, status guard, rate-limit) ก่อนถือว่าใช้งานได้ — อย่าเชื่อว่า "ทำงานได้" เพราะ compile ผ่านอย่างเดียว โดยเฉพาะ public/unauthenticated endpoint (`/api/sign/[token]`) ต้อง audit ก่อนเสมอ

## 2026-07-15 · Check-out flow + STAFF role — decisions + schema ที่รอ push (สำคัญ)
- **เกิดอะไร:** ทำงานตาม business_consulting_notes.md — เพิ่ม check-out/settlement flow, PDPA retention, Bill.tenantId, และ STAFF role (Phase A+B)
- **ทำไม (สิ่งที่ตัดสินใจไปแล้ว — อย่า re-derive):**
  - **Schema เพิ่มใหม่ยังไม่ push prod** — เจ้าของ (Atthanop) เป็นคน `npx prisma db push` เองบน `db.umsghwqtapyiwxumhdcb.supabase.co` (ไม่มี prisma/migrations, ใช้ db push ล้วน). โค้ดทั้งหมดพึ่ง client ที่ generate local แล้ว typecheck ผ่าน แต่ **runtime จะพังจนกว่าจะ push**
  - **PDPA retention = anonymize (ไม่ hard-delete)** — null PII เก็บ row+บิลไว้ (`/api/cron/pdpa-retention`, moveOutDate เกิน `PDPA_RETENTION_DAYS` default 90)
  - **Refund gate**: checkout complete ถ้า netAmount<0 ต้องมี refundSlipUrl ก่อนถึงปล่อยห้อง AVAILABLE
  - **STAFF isolation invariant (security-critical)**: `prisma-secure.ts` STAFF branch scope ด้วย `propertyId IN (assignedPropertyIds)` จาก session. **assignedPropertyIds ว่าง = `{ in: [] }` = deny-all** — ห้ามเปลี่ยนเป็น "เห็นทุกอย่าง" เด็ดขาด. property = read-only สำหรับ STAFF
- **ครั้งหน้า:** (1) รอ owner push schema ก่อน test runtime · (2) Phase C ยังไม่ทำ — 50 route ที่เช็ค `role !== "OWNER"` ต้องเปิดให้ STAFF เฉพาะ daily-ops (จด/ออกบิล/approve/maintenance/parcel) แต่คง owner-only (สร้าง/ลบ property, PromptPay/legal, billing/SaaS, เพิ่ม staff) · (3) เพิ่ม negative-test STAFF cross-property ใน prisma-secure ก่อนถือว่า production-ready · (4) evict modal เดิม (`DELETE /api/owner/tenants/[id]` ลบบัญชีทันที) กลายเป็น dead code หลัง repoint ปุ่มย้ายออก → checkout — ต้องถาม owner ว่าจะลบทิ้งไหม

## 2026-07-15 · Phase C (เปิด STAFF เข้า daily-ops routes) — เจอ regression 21 tests ตอน implement
- **เกิดอะไร:** เขียน helper `canAccessProperty(role, userId, propertyId)` ที่ query `prisma.property.findUnique` ใหม่ทุกครั้งแม้กับ role OWNER (เพื่อเช็ค ownerId) — และอีก 2 ไฟล์ (`bills/bulk`, `bills/[id]`) ตัด check `ownerId !== session.user.id` ทิ้งไปเฉยๆ โดยเชื่อว่า `secureDb` (prisma-secure.ts) scope ให้แล้ว พอรัน `vitest run` เจอ 21 tests fail ทันที
- **ทำไม (root cause):** unit test มึงมึง mock `getSecurePrisma()`/`prisma.property.findUnique` แบบง่ายๆ (คืนค่าตามที่ mock ไว้ตรงๆ) **ไม่ได้จำลอง logic การ scope จริงของ prisma-secure.ts interceptor** — test พวกนี้ทดสอบว่า "route ต้องเช็ค ownership เองด้วย" (defense-in-depth) ไม่ใช่ทดสอบว่า secureDb scope ถูก ดังนั้นการเอา check ออกไปเฉยๆ หรือเปลี่ยนไป query ใหม่ (ที่ไม่ได้ mock) ทำให้ assumption เดิมของ test ผิดทันที
- **ครั้งหน้า:** (1) เวลาเพิ่ม role ใหม่ (STAFF) เข้า check ที่มีอยู่แล้ว **ต้องคง logic เดิมของ OWNER ไว้เป๊ะๆ** (เทียบ ownerId ตรงๆ จาก object ที่ fetch มาอยู่แล้ว ไม่ query ใหม่) แล้วค่อย "เพิ่ม" branch ใหม่สำหรับ role ใหม่ต่อท้าย — อย่า "ปรับ" logic เดิมแม้จะดู redundant กับ secureDb เพราะ test อาจ depend on มันอยู่ (2) **รัน `npx vitest run` เต็มชุดทุกครั้งหลังแก้ auth/permission logic** ก่อนถือว่าเสร็จ ไม่ใช่แค่ typecheck ผ่าน — เคสนี้ typecheck ผ่าน 0 error ทั้งที่ logic พังไป 21 test

## 2026-07-15 · Staff role Phase C/D เสร็จสมบูรณ์ — สรุปขอบเขตสิทธิ์สุดท้าย
- **เกิดอะไร:** เปิด STAFF เข้าถึง daily-ops routes ครบ (~25 ไฟล์) + สร้างหน้า /dashboard/owner/staff ให้ owner มอบหมาย/ถอนตึกได้ + เพิ่ม negative test 12 ตัว ยืนยัน cross-property isolation
- **ขอบเขตสิทธิ์ STAFF สุดท้าย (อ้างอิงเร็ว ไม่ต้องไล่โค้ดใหม่):**
  - **ทำได้:** rooms (GET/PATCH ไม่รวม DELETE/create), tenants (GET/PATCH ไม่รวม evict), bills (CRUD/bulk/checkin/approve/notify), maintenance (list/update/รูป), parcels (log/update), meter submissions (list/approve/reject), contract-parse/upload (เอกสารสัญญากระดาษ), room status action, ดูเงินประกัน (read-only)
  - **ทำไม่ได้ (owner-only เสมอ):** property CRUD+legal/PromptPay settings, contract template, SaaS billing ทั้งหมด (owner/bills,sms,upgrade,saas-status), สร้างห้อง/bulk-import (ติด plan-limit), checkout/refund, คืน/หักเงินประกัน, evict ผู้เช่า, จัดการ staff เอง, LINE OA settings
  - **prisma-secure.ts STAFF branch:** scope ด้วย `propertyId IN (assignedPropertyIds)`, property เป็น read-only, `assignedPropertyIds` ว่าง/undefined = deny-all (verified ด้วย test แล้ว)
- **เปิดค้างไว้ (ต้องถาม owner ก่อนตัดสินใจเอง):** `dashboard/page.tsx` แสดง revenue/profit breakdown (กำไรสุทธิประมาณการ) ให้ STAFF เห็นด้วย — เป็น business-policy call ไม่ใช่ security bug ควรถาม owner ว่าต้องการซ่อนตัวเลขกำไรจาก staff ไหม
- **ครั้งหน้า:** ก่อนเพิ่ม endpoint ใหม่ที่เช็ค `role === "OWNER"` ให้เช็ค list ขอบเขตด้านบนก่อนว่าควรเปิดให้ STAFF ไหม (daily-ops → เปิด, เงิน/legal/SaaS/staff-mgmt → ปิด)

## 2026-07-15 · Verify STAFF flow จริงใน browser เจอ 3 ปัญหา infra ซ้อนกัน กว่าจะเห็นผลจริง
- **เกิดอะไร:** หลังแก้โค้ด STAFF role เสร็จ เปิด preview ด้วย `.claude/launch.json` (config ชื่อ `jadhor-prod`) แล้วลิงก์/ฟีเจอร์ใหม่ไม่ขึ้นเลย ทั้งที่โค้ดถูกต้อง
- **ทำไม (3 ชั้นซ้อนกัน):**
  1. **`.claude/launch.json` รัน `next start` (production server) ไม่ใช่ `next dev`** — เสิร์ฟจาก `.next` build เก่าที่ compile ไว้ก่อนแก้โค้ดวันนี้ทั้งหมด ต้อง `npm run build` ใหม่ทุกครั้งก่อน preview ถึงจะเห็นโค้ดล่าสุด (ไม่มี hot reload)
  2. **`npx prisma db push` ที่ผู้ใช้รันเองรอบแรกไม่ได้ผลจริง** (schema ยังขาด enum STAFF/model PropertyStaff ทั้งที่ CLI แจ้งว่า "in sync") — พิสูจน์ได้จาก runtime error จริง (`P2021 table does not exist`, `invalid input value for enum`) ไม่ใช่แค่เชื่อข้อความ CLI
  3. **`prisma generate` ชนกับ Windows file lock** เมื่อรันขณะ preview server (ที่ query engine DLL) ยังทำงานอยู่ — ต้อง stop server ก่อน generate เสมอบน Windows
- **ครั้งหน้า:** เวลา verify ฟีเจอร์ใหม่ผ่าน `jadhor-prod` preview (production mode) **ต้อง `npm run build` ใหม่ทุกครั้งหลังแก้โค้ด** ก่อน — อย่าเชื่อว่า preview จะ auto-reflect · หลัง `prisma db push` ให้ verify ด้วยการยิง query จริงเทียบกับ error จริง ไม่ใช่เชื่อ exit message เฉยๆ · บน Windows ต้อง stop dev/preview server ก่อนรัน `prisma generate` เสมอ

## Stack / Test infra (อ้างอิงเร็ว)
- DB layer หลัก = **Prisma** (`@/lib/prisma`) + `prisma-secure.ts` (RLS ต่อ role: ADMIN/OWNER/TENANT + soft-delete). `@supabase/supabase-js` มีใน deps แต่ route หลักใช้ Prisma
- Auth = NextAuth (JWT strategy) + bcrypt · rate-limit = Upstash Redis + in-memory fallback (`@/lib/rate-limit`)
- Test: `npm test` (vitest run) · `npm run test:watch` · `npm run test:cov` · ไฟล์อยู่ `tests/lib` (pure logic) + `tests/api` (route handler, mock DB/auth)
