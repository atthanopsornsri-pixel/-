# Plan — แก้บั๊ก Partial Payment Accounting (paidAmount เขียนทับ ไม่บวกสะสม)

> **สำหรับ:** agent/นักพัฒนาที่จะลงมือ (เช่น Antigravity)
> **สถานะ:** รอลงมือ · ร่างโดย Claude Code (ออดิต 2026-09-09)
> **ระดับความเสี่ยง:** สูง — กระทบเงินจริง (ยอดค้างชำระตอนย้ายออก + ทวงหนี้)
>
> ### 🎯 ข้อสรุปที่ตัดสินแล้ว — ทำ **Option A** (เจ้าของมอบหมายให้เลือก, 2026-09-09)
> Auto-verify รับเฉพาะ "จ่ายเต็ม → PAID" · สลิปจ่ายไม่ครบให้ตกไป `PENDING` (เจ้าของอนุมัติเอง) ·
> ยอดสะสม PARTIAL ทำที่ `approvePartialBill()` ที่เดียว · **ไม่ต้องแตะ SlipOK / expectedAmount**
> รายละเอียดเต็มในข้อ 5. Option B เก็บไว้เป็นงานอนาคต — **อย่าทำ Option B ในรอบนี้**
>
> ⚠️ **อ่านให้จบก่อนแตะโค้ด** ไฟล์นี้ self-contained โดยตั้งใจ — โปรเจกต์ JadHor มีบทเรียนว่าโค้ดจาก
> agent ภายนอกเคยหลุด convention ของ repo (E-Contract: IDOR + route วางผิดที่ + ไม่มี status guard).
> ห้ามเดา convention เอง — ทำตามหัวข้อ "กฎเหล็กของ repo นี้" ด้านล่างทุกข้อ

---

## 1. อาการ (What's broken)

เมื่อผู้เช่าจ่ายบิลเป็น "บางส่วน" (partial) ระบบบันทึก `paidAmount` โดย **เขียนทับ** ด้วยยอดของสลิปล่าสุด
แทนที่จะ **บวกสะสม** เข้ากับยอดที่จ่ายมาก่อนหน้า

**ตัวอย่างที่พัง:** บิลยอดรวม ฿5,000 · ผู้เช่าจ่ายงวดแรก ฿3,000 → `paidAmount = 3000`, status `PARTIAL`
ต่อมาจ่ายงวดสอง ฿2,000 (ยอดที่เหลือ) → โค้ดเซ็ต `paidAmount = 2000` (ทับ 3,000 เดิม)
ผลลัพธ์: ระบบเชื่อว่าจ่ายแค่ 2,000/5,000 · **ยอด 3,000 ที่จ่ายไปก่อนหน้าหายจากระบบ** · บิลค้าง PARTIAL ตลอดไปแม้จ่ายครบแล้ว

## 2. จุดที่เป็นบั๊ก (ตำแหน่งจริงในโค้ด)

บั๊กเดียวกันถูก copy ไว้ **2 ที่** — ต้องแก้ทั้งคู่ (หรือรวมเป็น helper เดียว ดูข้อ 5):

1. **`src/app/api/bills/[id]/pay/route.ts`** (~บรรทัด 117-120) — REST endpoint ที่หน้า public `/pay/[id]` เรียก
   ```ts
   } else if (slipAmount > 0 && slipAmount < bill.totalAmount) {
     newStatus = "PARTIAL";
     paidAmount = slipAmount;        // ❌ เขียนทับ — ต้องเป็น (bill.paidAmount ?? 0) + slipAmount
   }
   ```

2. **`src/app/actions/tenant-payment.ts`** (~บรรทัด 204-219) — Server Action ตัวคู่ขนาน มี logic เดียวกันเป๊ะ
   ```ts
   newStatus = "PARTIAL";
   paidAmount = slipAmount;          // ❌ เขียนทับ เช่นกัน
   ```
   > ต้องเช็คก่อนว่า action นี้ยังถูกเรียกใช้อยู่จริงไหม (`grep -rn "tenant-payment" src`). ถ้าเป็น dead code
   > ให้เสนอลบทิ้งแทนการแก้ (อย่าลบเองโดยไม่ยืนยันกับเจ้าของ — ดูข้อ 8)

3. **`src/app/actions/payment-approval.ts`** — `approvePartialBill(billId, paidAmount)` (~บรรทัด 72-81)
   ```ts
   status: "PARTIAL",
   paidAmount: paidAmount,           // ⚠️ owner กรอกเอง — ต้องนิยามให้ชัดว่าเป็น "ยอดสะสมทั้งหมด" หรือ "ยอดงวดนี้"
   ```
   อันนี้ owner เป็นคนกรอก จึงไม่ใช่บั๊กตรงๆ แต่ **ความหมายกำกวม** — ต้องล็อกให้ชัด (ดูข้อ 5) และให้ label ใน UI ตรงกับความหมายที่เลือก

## 3. ทำไมถึงอันตราย (Impact — ทำไมต้องแก้ก่อนขึ้น prod จริงจัง)

`paidAmount` ถูกใช้คำนวณ **"ยอดคงค้าง" (`totalAmount - paidAmount`)** ในหลายที่ที่กระทบเงินจริง:

| ไฟล์ | ใช้ paidAmount ทำอะไร | ผลถ้า paidAmount ผิด |
| :--- | :--- | :--- |
| `src/app/api/tenants/[id]/checkout/route.ts:80` | รวมยอดค้างทุกบิลตอนผู้เช่าย้ายออก (settlement) | คิดเงินคืน/หักประกันผิด — **กระทบเงินจริง** |
| `src/app/api/cron/bill-reminder/route.ts:109,125` | แสดง "ยอดคงค้าง" ในข้อความทวงผ่าน LINE/SMS | ทวงยอดผิด ผู้เช่าสับสน |
| `src/app/actions/dashboard.ts` | คำนวณ Outstanding Debt บนแดชบอร์ด | ตัวเลขรายได้/หนี้ค้างเพี้ยน |

> เมื่อแก้ให้ `paidAmount` เป็นยอดสะสมจริง ต้อง **verify ว่า consumer ทั้ง 3 ตัวนี้ยังคำนวณถูก** (ส่วนใหญ่จะถูกอยู่แล้ว
> เพราะมันคาดหวังยอดสะสมอยู่แล้ว — บั๊กคือฝั่ง "เขียน" ไม่ใช่ฝั่ง "อ่าน")

## 4. บริบทเพิ่ม: SlipOK บล็อกสลิป "ยอดที่เหลือ" อยู่แล้ว (ต้องรู้ก่อนออกแบบ)

`verifySlip()` ใน `src/lib/slip-verification.ts` ส่ง `amount = expectedAmount` ให้ SlipOK เสมอ และ pay route
ส่ง `expectedAmount: bill.totalAmount` (ยอดเต็ม) → SlipOK คืน **code 1013 (amountMismatch)** ถ้ายอดบนสลิป ≠ ยอดเต็ม

ผลคือ: เมื่อเปิด SlipOK สลิป "ยอดที่เหลือ" (เช่น 2,000 ของบิล 5,000) จะโดน reject ที่
`pay/route.ts:84` (`AMOUNT_MISMATCH`) **ก่อนถึง branch PARTIAL ด้วยซ้ำ** → auto-PARTIAL branch แทบเป็น
dead code เมื่อ SlipOK เปิด. แปลว่าการ "แก้ให้บวกสะสม" อย่างเดียวยังไม่ทำให้ auto partial top-up ใช้งานได้จริง
ต้องตัดสินใจเรื่อง `expectedAmount` ด้วย (ดูข้อ 5)

## 5. แนวทางที่ตัดสินแล้ว (Design decision)

**เลือก Option A แล้ว** (เจ้าของมอบหมายให้ Claude Code เลือก 2026-09-09 — เจ้าของแจ้งว่าไม่ถนัดด้านเทคนิค
จึงให้ตัดสินโดยยึดความปลอดภัยเป็นหลัก). Option B ด้านล่างเป็นเอกสารอ้างอิงงานอนาคตเท่านั้น — **ห้ามทำในรอบนี้**

### ✅ Option A — Auto-verify รับเฉพาะ "จ่ายเต็ม", partial ให้เจ้าของตรวจเอง ← **ทำอันนี้**
- **pay route / tenant-payment:** auto-verify คงไว้เฉพาะเคส "ยอดครบ → PAID" เท่านั้น
  ลบ/ปิด branch auto-PARTIAL — ถ้าสลิปยอดไม่ครบ ให้ตกไป `PENDING` (เจ้าของเปิดดูแล้วอนุมัติเอง) ไม่แตะ `paidAmount`
- **ยอดสะสมทำที่เดียว:** ให้ `approvePartialBill()` เป็นทางเดียวที่เขียน PARTIAL
  นิยาม argument ให้ชัดว่าเป็น **"ยอดสะสมทั้งหมดที่จ่ายมาแล้ว"** (owner เห็นยอดเดิม + กรอกยอดใหม่รวม)
  แล้ว auto-เลื่อนเป็น `PAID` ถ้า `paidAmount >= totalAmount`
- ข้อดี: ไม่ต้องยุ่งกับ `expectedAmount` ของ SlipOK, ไม่มี edge case จ่ายเกิน/สลิปซ้ำในหน้าต่างเดียวกัน, แก้บั๊กเงินจบ
- ผลข้างเคียง: `isPublicPayableStatus()` (ดูข้อ 7) คง PARTIAL ออกจากหน้า public ต่อไป — สอดคล้องกับสถานะปัจจุบัน

### Option B — รองรับ auto partial top-up เต็มรูปแบบ (งานอนาคต — ห้ามทำในรอบนี้)
เก็บไว้เผื่อเจ้าของอยากเปิดให้ผู้เช่าจ่ายเป็นงวดผ่านหน้า `/pay` ได้เองแบบอัตโนมัติในภายหลัง:
- `expectedAmount = totalAmount - (bill.paidAmount ?? 0)` (ยอดที่เหลือ) เพื่อให้สลิปงวดถัดไป verify ผ่าน
- `newPaidAmount = (bill.paidAmount ?? 0) + slipAmount` (บวกสะสม)
- status: `newPaidAmount >= totalAmount ? "PAID" : "PARTIAL"`
- ต้องจัดการ edge case: จ่ายเกิน (cap ที่ totalAmount หรือบันทึกส่วนเกิน?), สลิปซ้ำ (มี `slipTransRef` guard อยู่แล้ว — verify ว่ายังกันได้), race condition สองสลิปพร้อมกัน (ใช้ atomic update `where: { id, status: { not: "PAID" } }` แบบ approve route)
- เปิด PARTIAL ใน `isPublicPayableStatus()` **หลัง** งานนี้เสร็จและมีเทสต์ครบ

> **Option ถูกตัดสินแล้ว = A** — ไม่ต้องถามเจ้าของซ้ำเรื่องนี้ ลงมือ Option A ได้เลย
> (ถ้าระหว่างทำเจอเหตุผลทางเทคนิคที่ทำให้ Option A เป็นไปไม่ได้ ค่อยรายงานกลับ อย่าเงียบๆ สลับไป B เอง)

## 6. กฎเหล็กของ repo นี้ (ห้ามละเมิด — Antigravity เคยหลุดข้อพวกนี้)

1. **โครงสร้าง Next.js:** ทุก route/page ต้องอยู่ใต้ `src/app/` (App Router). ห้ามวางไฟล์ route นอก `src/app/`
   (เคยพลาด: หน้าเซ็นสัญญาถูกวางที่ `src/sign/...` → 404 ตลอด). API route = `src/app/api/**/route.ts`, page = `**/page.tsx`
2. **อ่าน guide ก่อนเขียน:** นี่ไม่ใช่ Next.js เวอร์ชันที่คุณคุ้น — อ่าน `node_modules/next/dist/docs/` และ `AGENTS.md` ก่อน
3. **DB access:** ใช้ `@/lib/prisma`. งานที่ผูก role/ownership ให้ผ่าน `@/lib/prisma-secure.ts` (`getSecurePrisma`) —
   มันเติม `where: { ownerId }` / soft-delete ให้อัตโนมัติตาม role (ADMIN/OWNER/TENANT/STAFF)
4. **Ownership check (กัน IDOR):** endpoint ที่แตะบิลของ owner ต้องยืนยันว่าบิลเป็นของ property ที่ผู้ใช้เข้าถึงได้
   ดู pattern จริงที่ `src/app/api/bills/[id]/notify/route.ts` (ใช้ `canAccessProperty(role, userId, ownerId, propertyId)` จาก `@/lib/staff-auth`)
   **เพิ่ม role ใหม่ห้าม "ปรับ" logic OWNER เดิม** ให้ "เพิ่ม branch" ต่อท้ายเท่านั้น (เทสต์เดิม depend on logic OWNER)
5. **Status guard (lock สถานะที่จบแล้ว):** ทุก mutation บนบิลต้องเช็คสถานะก่อนเขียน —
   `pay` และ `approve` route บล็อก `status === "PAID"` อยู่แล้ว (คงไว้). ห้ามยอมให้เขียนทับบิลที่ PAID แล้วเด็ดขาด
6. **กันสลิปซ้ำ:** logic duplicate-slip (`verification.duplicate` + เช็ค `slipTransRef` ข้ามบิล) ใน pay route ต้องคงอยู่ ห้ามรื้อ
7. **หน้า public `/pay/[id]` ไม่มี session:** pay route ข้าม room-check เมื่อไม่มี session โดยตั้งใจ (ลิงก์ LINE ให้ guest จ่าย) — คงพฤติกรรมนี้
8. **UI ต้องตรงกับดีไซน์:** ถ้าแตะ UI ให้ตาม "Vibrant Tonal Cards × Mascot" ใน `AGENTS.md` (Thai-first copy)
9. **ห้ามแตะ `vercel.json`** (`"regions": ["sin1"]` ล็อกไว้)

## 7. จุดที่เกี่ยวเนื่อง (อย่าลืม)

- **`src/lib/bill-status.ts`** — `isPublicPayableStatus()` = `UNPAID || OVERDUE` (PARTIAL ถูกกันออกจากหน้า public
  โดยตั้งใจเพราะบั๊กนี้). ถ้าเลือก Option B และแก้เสร็จ → เพิ่ม `PARTIAL` ที่นี่ + อัปเดตเทสต์ `tests/lib/bill-status.test.ts`
- **`src/app/dashboard/my-bills/page.tsx`** — `canPay()` = `UNPAID || OVERDUE || PARTIAL` (เปิด PARTIAL อยู่แล้ว —
  ถ้าทำ Option A ให้พิจารณาถอด PARTIAL ออกจาก `canPay` ให้สอดคล้อง หรือ route PARTIAL ไปหน้า "ติดต่อเจ้าของ")
- **ข้อความแจ้ง owner** ใน pay route (บรรทัด ~144-146) อ้าง `paidAmount` — ต้องอัปเดตให้แสดงยอดสะสมถูกหลังแก้

## 8. Acceptance Criteria (นิยาม "เสร็จ")

- [x] เลือก Option แล้ว = **Option A** (ตัดสินโดย Claude Code ตามที่เจ้าของมอบหมาย 2026-09-09) — ทำตาม Option A เท่านั้น
- [ ] ไม่มีที่ไหนเขียน `paidAmount = slipAmount` แบบเขียนทับอีก (ทั้ง `pay/route.ts` และ `tenant-payment.ts`)
- [ ] บิล PARTIAL ที่จ่ายจนครบ → status กลายเป็น `PAID` และ `paidAmount === totalAmount` (ไม่ค้าง PARTIAL)
- [ ] `approvePartialBill` มีความหมายของ argument ที่ชัดเจน (documented) และ UI label ตรงกัน
- [ ] consumer ทั้ง 3 (`checkout`, `bill-reminder`, `dashboard`) แสดง "ยอดคงค้าง" ถูกหลังแก้ (ไล่ทดสอบด้วยข้อมูลจริง)
- [ ] เพิ่ม test (ดูข้อ 9) และ **`npx vitest run` เต็มชุดผ่านหมด** (ไม่ใช่แค่ typecheck — โปรเจกต์นี้เคยเจอ typecheck ผ่านแต่ 21 เทสต์พัง)
- [ ] `npx tsc --noEmit` clean
- [ ] ถ้าแตะ schema (ไม่น่าต้อง) — เจ้าของเป็นคนรัน `npx prisma db push` prod เอง (ไม่มี migrations)

## 9. Test ที่ต้องเพิ่ม (ตาม VITEST-API-TESTING-GUIDE.md)

ไฟล์เทสต์อยู่ `tests/api/` (route handler, mock DB/auth) และ `tests/lib/` (pure logic). ดู pattern จาก
`tests/api/bills-approve-notify.test.ts`. ต้อง mock `next/cache` (`revalidatePath: vi.fn()`) ที่หัวไฟล์
และจำลอง nested relation ให้ครบตามที่ route `include` (เช่น `room.property.owner`).

เคสบังคับ (อย่างน้อย):
1. บิล UNPAID จ่ายเต็มผ่าน pay route → `PAID`, `paidAmount === totalAmount`
2. **pay route: สลิปยอดไม่ครบ (auto-verified amount < totalAmount) → status `PENDING`, `paidAmount` ไม่ถูกแตะ (ไม่เขียนทับ)** — Option A ไม่มี auto-PARTIAL แล้ว
3. **`approvePartialBill`: บิลจ่ายมาแล้ว 3000/5000 → owner บันทึกยอดสะสมเป็น 5000 → status `PAID`, paidAmount=5000** (auto เลื่อนเป็น PAID เมื่อครบ)
4. `approvePartialBill`: ยอดสะสมยังไม่ครบ (เช่น 3000/5000) → ยังเป็น `PARTIAL`, paidAmount สะสมถูก
5. พยายามจ่าย/อนุมัติบิลที่ `PAID` แล้ว → ถูกบล็อก (status guard)
6. สลิปซ้ำ (`transRef` เดิม) → ถูกปฏิเสธ (`DUPLICATE_SLIP`)
7. negative/ownership: owner คนอื่นเรียก approve บิลข้าม property → 403 (ดูกฎข้อ 6.4)

## 10. Out of scope (อย่าทำเกิน)

- ไม่ต้องแก้ระบบ SlipOK integration เอง (`slip-verification.ts`) เกินกว่าการส่ง `expectedAmount` (เฉพาะถ้าเลือก Option B)
- ไม่ต้องเพิ่มฟีเจอร์ "ประวัติการจ่ายหลายงวด" (payment history table) — นอกขอบเขต ถ้าเจ้าของอยากได้ให้เปิดงานใหม่
- ไม่แตะเรื่อง OVERDUE gate ที่หน้า public (แก้ไปแล้วใน branch `fix/pay-overdue-gate` / PR #1)

## 11. Checklist ก่อนส่งงานกลับ (สำหรับผู้ลงมือ)

1. `npx prisma generate` (ถ้าเพิ่งแตะ deps/schema — โปรเจกต์นี้ postinstall ถูกบล็อก type จะเพี้ยนถ้าไม่ generate)
2. `npx tsc --noEmit` → 0 error
3. `npx vitest run` → ผ่านทั้งหมด
4. เปิด PR เข้า `main` (แยก branch เช่น `fix/partial-payment-accounting`) พร้อมระบุ Option ที่เลือก + ผลเทสต์
5. **อย่าเชื่อว่า "เสร็จ" เพราะ compile ผ่าน** — เจ้าของ (หรือ Claude Code) จะ verify diff เทียบ convention + ยิง query จริงอีกรอบก่อน merge
