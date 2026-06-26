# Vitest API-Testing Recipe (Next.js + TypeScript)

> Copy-paste playbook สำหรับวาง unit + API-route integration tests ในโปรเจกต์ Next.js (App Router) + TS
> ที่มา: ใช้จริงในโปรเจกต์ jad-human (80 tests ครอบ auth/payroll/leaves/login) — ดึงมาทำเป็น template
> **ถ้าคุณคือ Claude ที่ถูกสั่งให้ "ตั้ง test ตามไฟล์นี้": ทำตามลำดับ §1 → §7 ได้เลย แล้ว verify ด้วย `npm test`**

---

## 1. ติดตั้ง

```bash
npm install -D vitest                 # core (ใช้ v4.x)
npm install -D @vitest/coverage-v8    # ถ้าอยากดู coverage
# เฉพาะถ้าจะ test React component ด้วย (ไม่ใช่แค่ logic/API):
npm install -D @testing-library/react @testing-library/dom jsdom
```

> ⚠️ อย่ารัน `npm audit fix --force` หลังลง — บางโปรเจกต์ (Next.js) จะถูก downgrade พัง
> ถ้าเห็น "moderate vulnerabilities" ตรวจก่อนว่าเป็น dep เดิม (เช่น postcss ใน next) ไม่ใช่ของ vitest

---

## 2. `vitest.config.ts` (วางที่ root โปรเจกต์)

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',            // เปลี่ยนเป็น 'jsdom' เฉพาะไฟล์ที่ test component
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': root },           // ⚠️ ต้องตรงกับ paths ใน tsconfig.json
  },
});
```

**สำคัญ:** เปิด `tsconfig.json` ดู `compilerOptions.paths`. ถ้าเป็น `"@/*": ["./*"]` → alias คือ `{ '@': root }`.
ถ้าเป็น `"@/*": ["./src/*"]` → ต้องเป็น `{ '@': path.join(root, 'src') }`. ไม่ตรง = import ใน test พังหมด

---

## 3. `package.json` scripts

```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "test:cov": "vitest run --coverage"
}
```

---

## 4. คำสั่งรัน

| คำสั่ง | ใช้ตอน |
|--------|--------|
| `npm test` | รันครั้งเดียว (ก่อน commit / CI) |
| `npm run test:watch` | รันค้างตอนเขียนโค้ด แก้แล้วรันใหม่อัตโนมัติ |
| `npx vitest run tests/api/foo.test.ts` | รันเฉพาะไฟล์ |
| `npx vitest run -t "brute-force"` | รันเฉพาะ test ที่ชื่อ match |
| `npm run test:cov` | ดู coverage % |

---

## 5. 3 Pattern หลัก (หัวใจของการ test API route โดยไม่ต่อ DB/server จริง)

### (a) Mock DB ด้วย chainable Proxy + result queue
ทำให้ mock client ที่ chain `.from().select().eq().order()...` ได้ทั้งหมด โดยทุกครั้งที่ `await` chain
จะดึง "ผลถัดไป" จาก queue ที่เราโปรแกรมไว้ (เรียงตามลำดับ query ที่ handler ยิงจริง)

```ts
import { vi } from 'vitest';

// state ที่ share ระหว่าง test กับ mock factory — ต้องใช้ vi.hoisted
const sb = vi.hoisted(() => ({ queue: [] as any[], lastInsert: null as any, eqCalls: [] as [string, unknown][] }));

vi.mock('@supabase/supabase-js', () => {
  const makeChain = () => {
    const chain: any = new Proxy({}, {
      get(_t, prop) {
        if (prop === 'then') {                       // ← await chain มาถึงตรงนี้
          const r = sb.queue.length ? sb.queue.shift() : { data: null, error: null };
          return (res: (v: any) => any, rej: (e: any) => any) => Promise.resolve(r).then(res, rej);
        }
        if (prop === 'eq')     return (c: string, v: unknown) => { sb.eqCalls.push([c, v]); return chain; };
        if (prop === 'insert') return (rows: any) => { sb.lastInsert = rows; return chain; };
        if (prop === 'upsert') return (rows: any) => { sb.lastInsert = rows; return chain; };
        return () => chain;                          // method อื่น ๆ chain ต่อ
      },
    });
    return chain;
  };
  return { createClient: () => ({ from: () => makeChain() }) };
});
```

ใน test กำหนดผลตามลำดับ query:
```ts
sb.queue = [
  { data: { emp_code: 'EMP-004' }, error: null },     // query แรกที่ handler await
  { data: [{ id: 9 }], error: null },                 // query ที่สอง (insert().select())
];
// แล้วค่อยตรวจ payload ที่ถูกส่งเข้า DB:
expect(sb.lastInsert[0].tenant_id).toBe(3);
expect(sb.eqCalls).toContainEqual(['tenant_id', 3]);  // ตรวจ tenant scoping
```

> ใช้ pattern เดียวกันกับ Prisma/Drizzle ได้ — แค่เปลี่ยน `vi.mock('@prisma/client', ...)` และ shape ของ object ที่ return
> แนวคิด "queue ผลตามลำดับ await" ใช้ซ้ำได้หมด

### (b) คุม env ต่อ test ด้วย `vi.stubEnv` (อย่าแตะ `process.env` ตรง ๆ)
```ts
import { beforeEach, afterEach, vi } from 'vitest';
beforeEach(() => vi.stubEnv('ADMIN_SECRET', 'test-secret'));
afterEach(() => vi.unstubAllEnvs());
```

### (c) เรียก route handler ตรง ๆ (ไม่ต้องเปิด dev server)
```ts
import { POST } from '@/app/api/foo/route';

const res = await POST(new Request('http://localhost/api/foo', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ name: 'x' }),
}) as any);

expect(res.status).toBe(201);
expect(await res.json()).toMatchObject({ id: expect.any(Number) });
```

ถ้า handler ใช้ `req.nextUrl.searchParams` (NextRequest) ให้ส่ง object ปลอมแทน:
```ts
const req = {
  nextUrl: new URL('http://localhost/api/foo?month=06/2569'),
  headers: new Headers({ authorization: 'Bearer x' }),
  json: async () => ({ /* body */ }),
} as any;
```

ถ้า handler มี dependency อื่น (auth helper, ส่งอีเมล/LINE) → mock ทิ้ง:
```ts
const auth = vi.hoisted(() => ({ hr: vi.fn(), employee: vi.fn() }));
vi.mock('@/lib/api-auth', () => ({
  ApiAuth: class { hr = auth.hr; employee = auth.employee; },
  UNAUTHORIZED: () => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
}));
vi.mock('@/lib/line-notify', () => ({ sendLineNotify: vi.fn().mockResolvedValue(undefined), msgX: vi.fn() }));
```

---

## 6. กับดักที่เจอจริง

| กับดัก | แก้ |
|--------|-----|
| `vi.mock` ถูก hoist ขึ้นบนสุดเสมอ — อ้าง state ภายนอกไม่ได้ | ห่อ state ด้วย `vi.hoisted(() => ({...}))` |
| `require('@/...')` ใน test ไม่ผ่าน vite alias | ใช้ `import` ปกติบนหัวไฟล์เท่านั้น |
| test เรื่อง token/expiry แตกเพราะเวลา | `vi.useFakeTimers()` + `vi.setSystemTime(Date.now()+ms)` แล้ว `vi.useRealTimers()` ใน afterEach |
| module side-effect (อีเมล/แจ้งเตือน) ยิงจริงตอน test | `vi.mock()` ให้เป็น no-op |
| import route **ก่อน** ลง `vi.mock` | วาง `import { POST } from '...'` **ใต้** บล็อก `vi.mock` (vitest hoist mock ให้อยู่แล้ว แต่เรียงแบบนี้อ่านง่าย) |
| alias ไม่ตรง tsconfig | ดู §2 — mirror `paths` ให้เป๊ะ |

---

## 7. Checklist "ครอบคลุม" ต่อ 1 route

- [ ] **Auth gate** — ไม่มี token → 401 · ผิด tenant/สิทธิ์ → 403
- [ ] **Validation** — field จำเป็นหาย → 400
- [ ] **Happy path** — status ถูก + body ถูก (`toMatchObject`)
- [ ] **DB error** — query คืน `{ error }` → ตอบ 4xx/5xx ไม่ throw หลุด
- [ ] **Security invariant เฉพาะ route** — เช่น tenant isolation, anti-spoof (ผู้ใช้แก้ของคนอื่นไม่ได้), rate-limit/brute-force
- [ ] **Pure logic** — คำนวณเงิน/ภาษี/วันที่/รหัส → assert ค่าจริงตรงสูตร (ดึงผ่าน response หรือ payload ที่ capture ไว้)

---

## 8. โครงไฟล์ที่แนะนำ

```
tests/
├── lib/                 # unit: ฟังก์ชัน pure / auth core (เร็ว, ไม่ mock เยอะ)
│   ├── password.test.ts
│   └── token.test.ts
└── api/                 # integration: route handler (mock DB + auth)
    ├── login.test.ts
    └── employees.test.ts
```

เริ่มจาก `lib/` (security-critical pure logic) ก่อนเสมอ — คุ้มสุด เสี่ยงต่ำสุด แล้วค่อยขยับไป `api/`

---
*Template นี้ DB-agnostic: ใช้ได้ทั้ง Supabase / Prisma / Drizzle — เปลี่ยนแค่ target ของ `vi.mock` และ shape ของผลใน queue*
