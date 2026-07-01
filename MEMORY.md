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

---

## Stack / Test infra (อ้างอิงเร็ว)
- DB layer หลัก = **Prisma** (`@/lib/prisma`) + `prisma-secure.ts` (RLS ต่อ role: ADMIN/OWNER/TENANT + soft-delete). `@supabase/supabase-js` มีใน deps แต่ route หลักใช้ Prisma
- Auth = NextAuth (JWT strategy) + bcrypt · rate-limit = Upstash Redis + in-memory fallback (`@/lib/rate-limit`)
- Test: `npm test` (vitest run) · `npm run test:watch` · `npm run test:cov` · ไฟล์อยู่ `tests/lib` (pure logic) + `tests/api` (route handler, mock DB/auth)
