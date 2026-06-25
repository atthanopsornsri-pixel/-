# spec.md — JadHor OS (apartment-system)

> Layer 3 ของ Global Rules · อ่านไฟล์นี้ก่อนเริ่ม session · อัปเดตเมื่อจบ task
> เอกสารนี้เขียนจาก **โค้ดจริงที่อ่านแล้ว** (as-built) — ไม่ใช่ requirement ที่เดาเอา
> ส่วนที่ยังไม่ได้ตรวจ จะกำกับ "(ยังไม่ verify)"

---

## 1. ภาพรวมผลิตภัณฑ์
**JadHor OS** — SaaS ระบบบริหารหอพัก/อพาร์ตเมนต์ (Thai-first) deploy บน Vercel
URL: https://jadhor.vercel.app · DB + ผู้ใช้อยู่ Singapore (`vercel.json regions: ["sin1"]`)

ขายแบบ subscription ต่อเจ้าของหอ (OWNER) แต่ละราย พร้อม add-on SMS

## 2. Stack (verified)
| ชั้น | เทคโนโลยี |
|------|-----------|
| Framework | Next.js 16.2.7 (App Router) + React 19 + TypeScript strict |
| DB | PostgreSQL (Supabase, Singapore) ผ่าน **Prisma** (`@prisma/adapter-pg`) |
| Auth | NextAuth v4 (JWT strategy) — Credentials + LINE provider · bcrypt |
| Rate limit | Upstash Redis + in-memory fallback (`@/lib/rate-limit`) |
| Encryption | AES-256-GCM credentials (`@/lib/encryption`) |
| Payment | PromptPay QR · slip verification ผ่าน SlipOK (`@/lib/slip-verification`) |
| Notify | LINE OA messaging (`@/lib/line`) · Email Resend (`@/lib/email`) · SMS |
| Monitoring | Sentry · AI = Anthropic SDK + Google GenAI |
| Deploy | Vercel (`sin1`) · มี Cloudflare next-on-pages config ด้วย |

## 3. Roles & สิทธิ์ (verified — `prisma-secure.ts`)
| Role | ขอบเขตข้อมูล |
|------|--------------|
| `ADMIN` | เห็นทุก tenant (bypass RLS) แต่ยังผ่าน soft-delete |
| `OWNER` | จำกัดด้วย `ownerId` — เห็นเฉพาะ property/room/tenant/bill/parcel/maintenance ของตัวเอง |
| `TENANT` | จำกัดด้วย `roomId`/`propertyId` ของตัวเอง · ส่วนใหญ่ read-only (สร้างได้เฉพาะ maintenance request ห้องตัวเอง) |

`getSecurePrisma()` = security gate กลาง — ไม่มี session โยน Unauthorized, role แปลกโยน Forbidden

## 4. Plan tiers (verified — `pricing.ts`)
| Plan | /เดือน | /ปี | ห้องสูงสุด |
|------|-------|-----|-----------|
| FREE_TRIAL | — | — | 30 (14 วัน) |
| STARTER | 199 | 1,990 | 30 |
| GROWTH | 599 | 5,990 | 100 |
| ENTERPRISE | 1,299 | 12,990 | ไม่จำกัด |

SMS add-on: SIZE_S 99฿/50, SIZE_M 199฿/120, SIZE_L 349฿/250 (ข้อความ/เดือน)
ค่าบริการเก็บผ่าน PromptPay ของ JadHor (`JADHOR_PROMPTPAY`)

## 5. Data model (verified — `schema.prisma`)
User · Property · Room · Tenant · Vehicle · Bill · Payment · MaintenanceRequest · Parcel ·
SystemSettings · Invoice/InvoiceItem · SmsAddon · RegistrationCode · (NextAuth: Account/Session/VerificationToken)
- Soft-delete: Property, Room, Tenant, Bill, Parcel, MaintenanceRequest (flag `isDeleted`)
- Bill flow: UNPAID → PENDING (รอตรวจสลิป) → PARTIAL/PAID · OVERDUE

## 6. Security invariants (มี test ครอบแล้ว ✅)
- RLS gate ต่อ role — ไม่มี session/role แปลก = ปฏิเสธ
- Password เก็บแบบ bcrypt เสมอ (register, reset, tenant set-password)
- Reset token: เก็บเฉพาะ `sha256(token)`, หมดอายุ, **ใช้ครั้งเดียว** (ล้างหลังใช้)
- Forgot-password: ตอบ generic เสมอ กัน account enumeration
- Anti-spoof: tenant แก้ได้เฉพาะข้อมูลตัวเอง (`session.user.id`), เช็คเบอร์ซ้ำแบบ `NOT self`
- Rate limit ทุก auth endpoint (register/forgot/reset)
- Slip: ตรวจกับธนาคาร, กันสลิปซ้ำ (1012)/ยอดไม่ตรง (1013), fallback manual เมื่อ provider ล่ม

## 7. การทดสอบ (สถานะปัจจุบัน)
- Vitest (node env) · `npm test` · alias `@ → src/` (ดู `vitest.config.ts`)
- **179 tests / 18 ไฟล์ ผ่านทั้งหมด** — ดู `tests/lib/*` (pure logic) + `tests/api/*` (route handler, mock Prisma/auth)
- Pattern: mock `@/lib/prisma` + `@/lib/rate-limit` + `getServerSession`, เรียก handler ตรง (ดู VITEST-API-TESTING-GUIDE.md)
- after() ใน Next.js mock เป็น `vi.fn((fn) => fn())` เพื่อให้ fire-and-forget รันได้ใน test

## 8. ข้อจำกัดโครงสร้าง — ห้ามแตะ (จาก AGENTS.md)
- `vercel.json` ต้องคง `"regions": ["sin1"]` (ไม่งั้น TTFB +1.5s ข้ามแปซิฟิก)
- UI ต้องตาม design system "Vibrant Tonal Cards × Mascot" (navy/gold/cream) — ref `dashboard/page.tsx` + `globals.css --jh-*`

## 9. Build readiness — ผ่านแล้ว (verified 2026-06-25)
`npm run build` **สำเร็จ** · `tsc --noEmit` = **0 errors** · `npm test` = 81 ผ่าน
- ⚠️ **บทเรียน**: `next.config.ts` ไม่ได้ตั้ง `typescript.ignoreBuildErrors` → type error ใด ๆ บล็อก build
- ⚠️ **กับดักสำคัญ**: หลังรัน `npm install` ใด ๆ npm จะ reinstall `@prisma/client` ทับ generated client
  แต่ postinstall (`prisma generate`) อาจถูก allow-scripts บล็อก → type ของ Prisma หายหมด →
  เกิด type error ลวง 90+ ตัวทั่วโปรเจกต์ **ต้องรัน `npx prisma generate` เองทุกครั้งหลัง install**
  (เคยทำให้เข้าใจผิดว่ามี errors เดิม — จริง ๆ คือ client stale)

## 10. Coverage gaps อื่น ๆ (ยังไม่ทำ)
- **prisma-secure RLS เชิงลึก**: ปัจจุบัน test แค่ auth gate (no-session/invalid-role/ADMIN/OWNER) ยังไม่ได้ test ว่า where-clause ถูก inject `ownerId`/`roomId` จริงต่อ query — ต้องใช้ integration test กับ test DB
- Routes ที่ยังไม่มี test: `tenants/[id]/contract-*`, `owner/*` (upgrade/sms), `admin/*`, `bills/checkin`, `bills/smart-alert`, `parcels/*`, `maintenance/*`
- ยังไม่มี component test (ต้องเพิ่ม jsdom + @testing-library ถ้าจะทำ)

---
*อัปเดตล่าสุด: 2026-06-25 — เพิ่ม test suite รอบ 2: bills-crud, bills-id, bills-approve-notify, tenants-id, cron-backup (65 tests ใหม่) → รวม 179 tests / 18 files ผ่านหมด*
