# Pre-Launch Audit Report — JadHor OS — 2026-07-19

**Scope:** ทั้งระบบ (71 API routes, dashboard pages, server actions)
**Stack:** Next.js 16 + Prisma + PostgreSQL (Supabase) + NextAuth
**Production URL:** jadhor.vercel.app (ยังไม่ปล่อยตลาดจริง ตามที่เจ้าของโปรเจกต์ยืนยัน)

---

## Layer 1: Automated Checks

| Check | ผล | รายละเอียด |
|---|---|---|
| `npm run build` | ✅ | build ผ่าน ไม่มี error |
| `npm run lint` | ❌ | **30 errors**, 15 warnings (ดูรายละเอียดใน L03/L04) |
| `npx tsc --noEmit` | ✅ | 0 error |
| `npm audit --production` | ❌ | 6 vulnerabilities (2 high, 4 moderate) — ดู L01 |
| `npm test -- --coverage` | ✅ | **242/242 tests ผ่าน** (28 test files) — coverage โดยรวม 54.4% statements / 46.6% branches (ดู M04 สำหรับจุดที่ coverage ต่ำผิดปกติ) |

---

## Layer 2: Findings

### 🔴 C01 — Fail-open authentication: ถ้า secret env var ไม่ถูกตั้งค่า ระบบข้ามการตรวจสอบสิทธิ์เงียบๆ

**Files (6 จุด, pattern เดียวกันทั้งหมด):**
- `src/app/api/webhook/line/route.ts` L8-10 (`LINE_CHANNEL_SECRET`)
- `src/app/api/cron/backup/route.ts` L21
- `src/app/api/cron/bill-reminder/route.ts` L25
- `src/app/api/cron/meter-reminder/route.ts` L12
- `src/app/api/cron/pdpa-retention/route.ts` L27
- `src/app/api/cron/health/route.ts` L19
(5 ไฟล์หลังใช้ `CRON_SECRET`)

**รายละเอียด:**
ทุกจุดใช้ pattern เดียวกัน:
```ts
const expected = process.env.CRON_SECRET; // หรือ LINE_CHANNEL_SECRET
if (expected && authHeader !== `Bearer ${expected}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```
ถ้า `expected` เป็น `undefined`/`""` (env var ไม่ได้ตั้งค่าใน production) เงื่อนไข `if (expected && ...)` จะเป็น `false` ทันที — **ข้ามการตรวจสอบทั้งหมดไปเลย ไม่ error ไม่ log ที่มองเห็นง่าย** (เฉพาะ LINE webhook มี `console.warn` แต่ cron routes ไม่มีแม้แต่ warning) ระบบจะทำงานราวกับว่าไม่มีการป้องกันอยู่เลย

ผลกระทบต่อ endpoint:
- **LINE webhook** — เสี่ยงสูงสุด: ใครก็ส่ง POST มาปลอมเป็น LINE event ได้ รวมถึง flow ผูกบัญชี (`JAD-XXXX`) ที่จะยิ่งอันตรายเมื่อรวมกับ H02
- **cron routes** — ใครก็ trigger job เหล่านี้ซ้ำๆ ได้โดยไม่ต้องมี secret (bill-reminder/meter-reminder = สแปม LINE/SMS ไปหาลูกบ้านจริง, backup = เปลือง storage write, pdpa-retention = ยิง anonymize ก่อนกำหนด)

**ข้อเสนอแก้:** เปลี่ยนเป็น fail-closed — ถ้า `expected` ไม่ถูกตั้งค่า ให้ reject คำขอทันที (ไม่ใช่ปล่อยผ่าน) และ log เป็น error ระดับสูงเพื่อให้เห็นตอน deploy ทันทีถ้าลืมตั้งค่า

---

### 🔴 C02 — Backup ที่มีอยู่ กู้คืนระบบให้กลับมาใช้งานได้จริงไม่ได้

**File:** `src/app/api/cron/backup/route.ts` L33-64

**รายละเอียด:**
Backup ที่รันทุกวัน (`Vercel Cron 02:00 UTC`) เป็นการ export JSON ของ **6 ตารางเท่านั้น**: `users` (ไม่มี password), `properties`, `rooms`, `bills` (**เฉพาะ 30 วันล่าสุด**, L44), `tenants`, `invoices` — เขียนโค้ดคอมเมนต์ไว้ตรงๆ ว่า "ไม่เก็บ: passwords, tokens, credentials"

ตารางที่**ไม่ถูก backup เลย**: `MeterSubmission`, `Checkout`, `PropertyStaff`, `Vehicle`, `MaintenanceRequest`, `Parcel`, `Notification`, `Payment`, `Account`/`Session` (NextAuth), `SmsAddon`, `RegistrationCode`, `SystemSettings`

ถ้าฐานข้อมูลจริงเสียหาย/หายไป แล้วเอา backup นี้มากู้คืน:
1. **User ทุกคน login ไม่ได้** (ไม่มี password ในไฟล์ backup)
2. บิลที่เก่ากว่า 30 วันหายถาวร
3. ข้อมูล staff assignment, checkout, มิเตอร์, พัสดุ, แจ้งซ่อม หายทั้งหมด — **ไม่มีทางกู้คืน**

นี่คือกับดักที่ playbook เตือนไว้ตรงๆ: "ไม่ใช่แค่มี backup แต่ไม่เคยทดสอบ restore" — backup นี้ไม่ใช่แค่ยังไม่เคยทดสอบ แต่ **ตามการออกแบบแล้วไม่สามารถกู้คืนระบบให้กลับมาใช้งานได้เลย** เป็นแค่ data export สำหรับดูย้อนหลัง ไม่ใช่ disaster-recovery backup

**ข้อเสนอแก้:** ต้องมี real database backup แยกต่างหาก (เช่น Supabase point-in-time recovery ที่เปิดใช้งานจริง หรือ pg_dump เต็มฐานข้อมูลรวม auth tables) ก่อนปล่อยตลาดจริง — ของเดิมเก็บไว้เป็น "audit trail export" ได้ แต่ไม่ควรเรียกว่า "backup"

---

### 🟠 H01 — `/api/public/bills/[id]` (ไม่ต้อง login) คืนข้อมูลบิลทั้ง record แทนที่จะคืนเฉพาะที่จำเป็น

**File:** `src/app/api/public/bills/[id]/route.ts` L9-30
**ใช้โดย:** `src/app/pay/[id]/page.tsx` L127-225

**รายละเอียด:**
Endpoint นี้ไม่มี authentication ใดๆ (ตั้งใจให้ public เพื่อส่งลิงก์จ่ายเงินได้) แต่ `prisma.bill.findUnique(...)` ไม่มี `select` เลย คืนค่าทุก field กลับไป รวมถึง `slipUrl` (รูปสลิปที่เคยแนบ), `slipTransRef` (เลขอ้างอิงธุรกรรมธนาคาร), `tenantId`, `paidAmount`, `paymentDate` — แต่หน้า `/pay/[id]` ใช้จริงแค่ `totalAmount, rentAmount, waterAmount, electricAmount, dueDate, status, waivedReason, room.number, room.property.{name,promptPayNo,promptPayName}`

ใครก็ตามที่มี/เดา/เจอ bill `id` (เช่น จาก screenshot, ลิงก์หลุด, referrer) จะเห็นเลขอ้างอิงธุรกรรมธนาคารและรูปสลิปเก่าของบิลนั้นได้โดยไม่ต้อง login เลย

**ข้อเสนอแก้:** เพิ่ม `select` ให้คืนเฉพาะ field ที่หน้า pay จริงๆ ต้องใช้

---

### 🟠 H02 — รหัสผูกบัญชี LINE (`JAD-XXXX`) มีแค่ 4 หลัก ไม่มี rate limit ไม่มีวันหมดอายุ

**Files:**
- Generate: `src/app/api/users/me/route.ts` L54 — `` `JAD-${Math.floor(1000 + Math.random() * 9000)}` ``
- Consume: `src/app/api/webhook/line/route.ts` L144-188
- Schema: `prisma/schema.prisma` L24 — `lineBindingCode String?` (ไม่มี field วันหมดอายุ)

**รายละเอียด:**
รหัสมีแค่ 9,000 ค่าที่เป็นไปได้ (1000-9999) ไม่มี expiry timestamp (comment ในสคีมาบอกว่า "ชั่วคราว" แต่โค้ดไม่ได้บังคับจริง — โค้ดแค่ล้างเป็น `null` หลัง bind สำเร็จเท่านั้น) และ webhook ที่ consume โค้ดนี้ (L146-147: `prisma.user.findFirst({ where: { lineBindingCode: bindCode } })`) ไม่มี rate limit ใดๆ

ถ้ามีคนพิมพ์ `JAD-0000` ถึง `JAD-9999` เข้าไปในแชท (ผ่านบัญชี LINE จริง ไม่ต้องผ่านเว็บเลย) ภายในช่วงที่เหยื่อสร้างรหัสไว้แต่ยังไม่ทันผูก จะมีโอกาสสุ่มโดนและได้ผูก LINE ของตัวเองเข้ากับบัญชีเหยื่อ — ทำให้เห็นการแจ้งเตือนบิล/ข้อมูลผ่าน chatbot ของบัญชีนั้นแทน

**ข้อเสนอแก้:** เพิ่มความยาวรหัส (เช่น 8 ตัวอักษรผสมตัวเลข-ตัวอักษร), เพิ่ม `lineBindingCodeExpiresAt` แล้วเช็คก่อนอนุญาตผูก (เช่น หมดอายุใน 10 นาที), และเพิ่ม rate-limit ที่ webhook สำหรับ pattern `JAD-XXXX`

---

### 🟠 H03 — หน้า Login ไม่มี rate limit (ขณะที่ forgot-password/register/reset-password มี)

**File:** `src/lib/auth.ts` L81 (`authorize` callback ของ NextAuth CredentialsProvider)

**รายละเอียด:**
เช็คแล้วพบว่ามีแค่ 7 จาก 71 routes ที่เรียก `rateLimit(...)`: `forgot-password`, `register`, `reset-password`, `contact`, `owner/sms-credentials`, `rooms/[id]/draft-post`, `sign/[token]` — **ไม่มี `login` (`authorize` callback) อยู่ในนั้นเลย** ทั้งที่เป็น endpoint ที่สำคัญที่สุดสำหรับป้องกัน brute-force/credential-stuffing (playbook ระบุตรงๆ ว่า auth ต้องมี rate limit ก่อนใครเลย)

**ข้อเสนอแก้:** เพิ่ม `rateLimit` ใน `authorize()` ก่อนเช็ค password เช่น จำกัด 5 ครั้ง/15 นาที ต่อ email หรือต่อ IP (มี `getClientIp` อยู่แล้วใน `@/lib/rate-limit`)

---

### 🟡 M01 — Multi-step write ไม่ atomic เสี่ยง state ค้าง (พบ 2 จุด, pattern เดียวกัน)

**Files:**
1. `src/app/api/auth/register-tenant/route.ts` — สร้าง/แก้ user+tenantProfile (L59-87, nested write จึง atomic) แล้ว **แยก** `prisma.room.update` (L91-94) เพื่อเปลี่ยนสถานะห้องเป็น OCCUPIED — ถ้าขั้นนี้ fail หลังสร้าง tenant สำเร็จ ห้องจะค้างสถานะ AVAILABLE ทั้งที่มีผู้เช่าแล้ว
2. `src/app/api/bills/checkin/route.ts` — สร้าง `bill.create` (L82-99) ที่มี `securityDeposit` แล้ว **แยก** `prisma.tenant.update` (L104-109) เพื่อ sync `depositAmount` เข้า Tenant — ถ้าขั้นนี้ fail หลังสร้างบิลสำเร็จ `Tenant.depositAmount` จะไม่ตรงกับที่เรียกเก็บจริง **และค่านี้ถูกใช้เป็นค่าตั้งต้นในหน้า check-out (`/dashboard/tenants/[id]/checkout`) สำหรับคำนวณเงินคืนประกัน** — แปลว่าถ้า race นี้เกิดขึ้น การคำนวณเงินคืนตอนย้ายออกจะผิด

**เทียบกับจุดที่ทำถูก:** `src/app/api/tenants/[id]/checkout/complete/route.ts` L83-97 ใช้ `prisma.$transaction([...])` ครอบ Checkout+Tenant+Room ไว้ด้วยกันถูกต้องแล้ว — ใช้ pattern นี้เป็นต้นแบบได้เลย

**ข้อเสนอแก้:** ห่อทั้ง 2 จุดด้วย `prisma.$transaction([...])` เหมือนที่ checkout/complete ทำไว้

---

### 🟡 M02 — `submitPaymentSlip` (ทางจ่ายบิลหลักของผู้เช่า) เช็ค-แล้ว-เขียนไม่ atomic

**File:** `src/app/actions/tenant-payment.ts` L65-68 (เช็ค `bill.status`) → L109-117 (เขียน `status: "PENDING"` แบบไม่มีเงื่อนไข)

**รายละเอียด:**
เช็ค `bill.status === "PAID"`/`"PENDING"` ก่อน (L65-68) แล้วค่อยเขียนทีหลังโดยไม่มี guard ซ้ำตอนเขียนจริง ต่างจาก `src/app/api/bills/[id]/approve/route.ts` L45 ที่ใช้ `where: { id, status: { not: "PAID" } }` ปิดช่องว่างระหว่างเช็คกับเขียนไว้ถูกต้อง — ถ้าผู้เช่ากดส่งสลิปซ้ำเร็วๆ (double-click/network retry) มีโอกาสแข่งกันเขียนสถานะและเรียก SlipOK verify ซ้ำซ้อน

**ข้อเสนอแก้:** เปลี่ยนการเขียนบรรทัด 109 ให้ใช้ compound where แบบเดียวกับ `bills/[id]/approve/route.ts`

---

### 🟡 M03 — มีแค่ `global-error.tsx` ไม่มี error boundary ย่อยตามหน้า

**File:** `src/app/global-error.tsx` (มีไฟล์เดียว), ไม่พบ `error.tsx` ใน `src/app/dashboard/**`

**รายละเอียด:** ถ้า component ใดหน้าใดใน `/dashboard/*` throw error ที่ไม่ได้ catch เอง จะลอยขึ้นไปโดน boundary บนสุด (global) แทนที่จะถูกจำกัดวงแค่หน้านั้น — dashboard ทั้งหน้าจะขาว ไม่ใช่แค่ widget ที่พัง

**ข้อเสนอแก้:** เพิ่ม `error.tsx` อย่างน้อยที่ `src/app/dashboard/error.tsx` เพื่อกันไม่ให้หน้าอื่นใน sidebar โดนดึงลงไปด้วย

---

### 🟡 M04 — ไฟล์ security-critical ที่สุด มี test coverage ต่ำที่สุด

**ผลจาก `npm test -- --coverage`:**
- `src/lib/prisma-secure.ts` (ตัวคุม row-level access ทั้งระบบ — เทียบเท่า RLS) — **27.8% statements**
- `src/lib/auth.ts` (NextAuth config, password check, session) — **6.57% statements**
- `src/lib/staff-auth.ts` (`canAccessProperty` ที่ใช้กันทุก route ของ STAFF) — 33.3%

เทียบกับ coverage เฉลี่ยรวม 54.4% — ไฟล์ที่ถ้าพังแล้วกระทบทุก route ในระบบกลับเป็นไฟล์ที่ test คุ้มครองน้อยที่สุด การแก้ไขไฟล์เหล่านี้ในอนาคตเสี่ยง regression ที่ไม่มี test จับได้

**ข้อเสนอแก้:** ไม่ต้อง 100% แต่ควรมี test ครอบ branch หลักของ `prisma-secure.ts` (แต่ละ role × แต่ละ model) และ `auth.ts` (`authorize` callback ทุก failure path: wrong password, user not found, missing fields)

---

### 🟢 L01 — `npm audit`: 6 vulnerabilities แต่ 2 ตัว "high" มาจาก dev-tooling ที่ไม่ได้ใช้จริงใน production

**รายละเอียด:** เช็คแล้ว `hono`/`ws` (2 high) เป็น transitive dependency ของ `@modelcontextprotocol/sdk` และ `@cloudflare/next-on-pages` — grep `src/` ทั้งโปรเจกต์ไม่พบการ import ทั้งสอง package นี้เลย แปลว่าไม่ได้ถูกเรียกใช้ใน request path ของแอปที่ deploy จริงบน Vercel (คนละ target กับ `pages:build` script) ความเสี่ยงจริงต่ำกว่าที่ severity บอกไว้มาก แต่ควรพิจารณาลบ dependency ที่ไม่ได้ใช้ทิ้ง

ส่วน `postcss`/`uuid` (4 moderate) ต้อง `npm audit fix --force` ซึ่งจะ downgrade `next`/`next-auth` — **ตาม MEMORY.md ของโปรเจกต์นี้เอง ห้ามรันคำสั่งนี้** (เคยทำให้ build พังมาแล้ว) แนะนำรอ next/next-auth เวอร์ชันที่แก้ vulnerability นี้เองแทน

### 🟢 L02 — 30 ESLint errors, ทุกตัวเป็น `react-hooks/set-state-in-effect` เดิมซ้ำ

**Files (14 ไฟล์):** `dashboard/rooms/page.tsx`, `dashboard/subscription/page.tsx` (5 จุด), `dashboard/meters/page.tsx`, `dashboard/settings/page.tsx`, `dashboard/owner/staff/page.tsx`, `dashboard/my-meters/report/page.tsx`, `dashboard/billing/page.tsx`, `dashboard/tenants/page.tsx`, `register/tenant/page.tsx`, `tour/page.tsx`, `components/SignOutButton.tsx`, `components/marketing/PricingPlans.tsx`

เรียก `setState()` ตรงๆ ในตัว effect โดยไม่มี condition กันเป็นวงจร (`react-hooks/set-state-in-effect`) — ไม่ใช่บั๊กที่ทำให้พังทันที แต่ทำให้เกิด extra re-render และเป็น anti-pattern ที่ React ทีมแนะนำให้เลี่ยง ควรทยอยแก้แต่ไม่ block การปล่อย

### 🟢 L03 — สมัครสมาชิกไม่เช็ครูปแบบอีเมล

**File:** `src/app/api/auth/register/route.ts` L26 — เช็คแค่ `password.length < 6` ไม่มีการเช็ครูปแบบ email เลย (พึ่ง Prisma unique constraint อย่างเดียว) อาจได้ email ที่หน้าตาผิดปกติเข้าระบบ ทำให้ส่งอีเมลแจ้งเตือน/reset password ไม่ได้ภายหลัง

### 🟢 L04 — `/api/upload` (รูปทั่วไป) ไม่มี rate limit

**File:** `src/app/api/upload/route.ts` — มี auth + จำกัดชนิด/ขนาดไฟล์ (5MB) ครบ แต่ authenticated user คนเดียวยิงซ้ำได้ไม่จำกัดครั้ง เสี่ยงเปลืองพื้นที่ storage โดยไม่ตั้งใจ/ตั้งใจ

---

## Layer 3: Operational Checklist

- [ ] **Environment variables ครบและถูกต้องใน production** — ตรวจไม่ได้จากโค้ด (Vercel dashboard อยู่นอกสิทธิ์เข้าถึงของผม) โค้ด reference ตัวที่สำคัญไว้: `CRON_SECRET`, `LINE_CHANNEL_SECRET`, `SLIPOK_API_KEY`/`SLIPOK_BRANCH_ID`, `DATABASE_URL`/`DIRECT_URL`, `NEXTAUTH_URL`/`NEXTAUTH_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`/`NEXT_PUBLIC_SUPABASE_URL`, Sentry DSN ตัวแปร — **ต้องให้คุณยืนยันเองว่าตั้งครบใน Vercel** โดยเฉพาะ `CRON_SECRET`/`LINE_CHANNEL_SECRET` เพราะ C01 ทำให้การ "ลืมตั้ง" อันตรายกว่าปกติ (ไม่ error ให้เห็น)
- [ ] **Database backup ทำงานอัตโนมัติและเคย restore drill จริงแล้ว** — **FAIL**: มี backup job รันจริง แต่ตามที่วิเคราะห์ใน C02 กู้คืนระบบให้ใช้งานได้จริงไม่ได้ (ไม่มี password, ขาดหลายตาราง, บิลเก่ากว่า 30 วันหาย) — ยังไม่เคย/ไม่ควรทำ restore drill กับของที่มีอยู่ตอนนี้เพราะจะกู้ไม่ได้จริง
- [ ] **Rate limiting ครอบ API route สำคัญ** — **PARTIAL**: มีแค่ 7/71 routes, ขาด login (H03) และ payment/mutation routes ส่วนใหญ่
- [~] **Error boundary ครอบทุกหน้าหลัก** — **PARTIAL**: มี global-error.tsx แต่ไม่มีระดับ segment (M03)
- [ ] **Rollback plan ที่ทดสอบแล้วว่าทำได้จริง** — ตรวจจากโค้ดไม่ได้ ต้องถามคุณ: ถ้า deploy ล่าสุดพัง คุณมีขั้นตอน rollback ที่เคยลองจริงหรือยัง? (เช่น Vercel "Instant Rollback" ไปเวอร์ชันก่อนหน้า)
- [x] **Monitoring/alerting เปิดใช้งาน** — Sentry config มีครบ 3 ไฟล์ (client/server/edge) ในโค้ด — ต้องยืนยันว่า DSN ตั้งค่าจริงใน prod env และมีคนดู alert จริง
- [x] **Log ไม่มีข้อมูล sensitive หลุด** — สุ่มตรวจ `console.log/error` ที่เกี่ยวกับ password/token ทุกจุดแล้ว (5 จุด) พบว่า log แค่ error object/label ไม่มีการ log ค่าจริงของ password/token — ผ่าน (ไม่ได้ตรวจทุกบรรทัด console.log ในระบบ 100%)

---

## สรุปสถานะพร้อมปล่อยหรือไม่

**อัปเดต 2026-07-19 (หลังแก้):** เจ้าของโปรเจกต์อนุมัติให้แก้ทั้งหมด — ดำเนินการแล้วตามลำดับ severity

| ID | สถานะ | หมายเหตุ |
|---|---|---|
| C01 | ✅ แก้แล้ว | `src/lib/cron-auth.ts` (helper fail-closed) + webhook LINE + cron 5 ตัว — มี test `tests/lib/cron-auth.test.ts` |
| C02 | ⚠️ code แก้แล้ว / **infra ยังต้องทำ** | backup export ครบทุกตาราง ไม่มี cutoff แล้ว แต่ **disaster recovery จริงต้องตั้ง Supabase PITR หรือ off-site pg_dump** — ดู `DISASTER_RECOVERY.md` |
| H01 | ✅ แก้แล้ว | `/api/public/bills` ใช้ `select` คืนเฉพาะ field ที่จำเป็น (ไม่คืน slipUrl/transRef/tenantId) |
| H02 | ✅ code แก้แล้ว / **ต้อง db push** | รหัส 6 ตัว crypto-random + expiry 10 นาที + rate-limit webhook — **ต้อง `prisma db push` field `lineBindingCodeExpiresAt`** |
| H03 | ✅ แก้แล้ว | rate-limit ต่อบัญชีใน `authorize()` (5/15 นาที) |
| M01 | ✅ แก้แล้ว | register-tenant + bills/checkin ห่อ `$transaction` |
| M02 | ✅ แก้แล้ว | submitPaymentSlip ใช้ `updateMany` + compound-where |
| M03 | ✅ แก้แล้ว | `src/app/dashboard/error.tsx` |
| M04 | ✅ แก้แล้ว | +14 tests (staff-auth, cron-auth) — รวม 256 tests ผ่านหมด |
| L03/L04 | ✅ แก้แล้ว | email validation + upload rate-limit |
| L01 | ⏸️ เว้นไว้ | audit vuln เป็น dev-dep ไม่ได้ใช้ใน prod / fix จะ downgrade next (ห้ามตาม MEMORY) |
| L02 | ⏸️ เว้นไว้ตั้งใจ | 30 lint `set-state-in-effect` — code-quality ไม่ใช่บั๊ก, บาง case เป็น mount-guard ที่ถูกต้อง (เลี่ยง bulk-refactor 14 ไฟล์ก่อน launch) |

**Verify หลังแก้:** build ✅ · tsc ✅ 0 error · **test ✅ 256/256 ผ่าน**

**เหลือ 2 action ก่อนพร้อมจริง (นอกโค้ด):**
1. `prisma db push` เพื่อเพิ่ม field `lineBindingCodeExpiresAt` (H02) — ต้องทำก่อน deploy ไม่งั้นการผูก LINE ใหม่จะ error
2. ตั้ง Supabase PITR หรือ off-site pg_dump + ทำ restore drill (C02) — ดู `DISASTER_RECOVERY.md`
