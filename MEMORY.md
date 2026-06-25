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

---

## Stack / Test infra (อ้างอิงเร็ว)
- DB layer หลัก = **Prisma** (`@/lib/prisma`) + `prisma-secure.ts` (RLS ต่อ role: ADMIN/OWNER/TENANT + soft-delete). `@supabase/supabase-js` มีใน deps แต่ route หลักใช้ Prisma
- Auth = NextAuth (JWT strategy) + bcrypt · rate-limit = Upstash Redis + in-memory fallback (`@/lib/rate-limit`)
- Test: `npm test` (vitest run) · `npm run test:watch` · `npm run test:cov` · ไฟล์อยู่ `tests/lib` (pure logic) + `tests/api` (route handler, mock DB/auth)
