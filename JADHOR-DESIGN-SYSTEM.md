# JadHor OS - Design System & UI Aesthetic Guide

เอกสารฉบับนี้สรุป **"แนวทางการดีไซน์ ตกแต่ง สีสัน แอนิเมชัน และลูกเล่นต่างๆ"** ของ JadHor OS (สไตล์ Apple Minimal × Mascot Theme) เพื่อให้คุณสามารถคัดลอกโค้ด CSS, Tailwind config และรูปแบบ UI ไปใช้งานกับโปรเจกต์อื่นๆ ได้ทันที

---

## 1. ชุดสีและการกำหนดธีมใน Tailwind CSS (`globals.css` @theme)

ระบบทำการจับคู่สี (Remap) สีหลักของ Tailwind เพื่อให้เวลาเรียกคลาสทั่วไป เช่น `bg-blue-600` หรือ `text-orange-500` จะแสดงผลเป็นสีประจำแบรนด์ของ JadHor เสมอโดยไม่ต้องสร้างคลาสใหม่:

```css
@theme {
  /* 💙 Brand Navy (น้ำเงินเข้มหลังคาบ้านมาสคอต) - ใช้แทนสี Blue ของ Tailwind */
  --color-blue-50: #f3f5fa;
  --color-blue-100: #e7ecf6;
  --color-blue-200: #c9d4ea;
  --color-blue-300: #a3b5d8;
  --color-blue-400: #6d87bd;
  --color-blue-500: #4565a1;
  --color-blue-600: #34508c;
  --color-blue-700: #2a4172;
  --color-blue-800: #22345c;
  --color-blue-900: #1b294a;
  --color-blue-950: #16264c;

  /* 💛 Brand Gold (สีทองกุญแจมาสคอต) - ใช้แทนสี Orange ของ Tailwind */
  --color-orange-50: #fdf8ee;
  --color-orange-100: #f8eed7;
  --color-orange-200: #f0ddb0;
  --color-orange-300: #e5c885;
  --color-orange-400: #dcb463;
  --color-orange-500: #d4a548;
  --color-orange-600: #b98a33;
  --color-orange-700: #936b23;
  --color-orange-800: #75551e;
  --color-orange-900: #5e451b;
  --color-orange-950: #44361a;
}
```

---

## 2. ตัวแปรโทนสีและขนาดโค้งเว้า (Design System CSS Tokens)

ตัวแปรดีไซน์เนมสเปซ `--jh-*` สำหรับการสร้างคอมโพเนนต์สไตล์ Apple/iCloud Minimal:

```css
:root {
  /* Neutrals (Apple Gray Scale) */
  --jh-white: #ffffff;
  --jh-gray-50: #f7f4ed;   /* สีพื้นหลังของแอป (Warm Cream) */
  --jh-gray-100: #efeae0;
  --jh-gray-200: #d9d3c5;  /* กรอบเส้นผม (Hairline Border) */
  --jh-gray-500: #8e8e93;  /* สีสำหรับตัวอักษรจาง / Placeholder */
  --jh-gray-600: #6e6e73;  /* สีอักษรรอง (Secondary Text) */
  --jh-gray-900: #1d1d1f;  /* สีอักษรหลัก (Primary Near-Black) */

  /* iOS System Colors */
  --jh-blue: #34508c;      /* ปุ่มและแอคชันหลัก */
  --jh-green: #34c759;     /* สำเร็จ / ค่าน้ำ */
  --jh-green-ink: #1f9d4d;
  --jh-indigo: #5856d6;
  --jh-orange: #d4a548;    /* แอคชันรอง / ค่าไฟ */
  --jh-orange-ink: #936b23;
  --jh-red: #ff3b30;       /* บิลเกินกำหนด / แจ้งลบ */

  /* Soft Accent Tints (สีพื้นหลังการ์ดหรือชิปข้อความแบบโปร่งแสง) */
  --jh-blue-tint: #e9eef7;
  --jh-green-tint: #e7f8ee;
  --jh-orange-tint: #f7efdc;
  --jh-red-tint: #ffe9e7;
  --jh-indigo-tint: #ecebfb;

  /* โค้งมนต่อเนื่อง (Continuous Corner Radii) */
  --jh-radius-md: 14px;   /* ช่องกรอกข้อมูล (Inputs), ปุ่มขนาดเล็ก */
  --jh-radius-lg: 18px;   /* การ์ดทั่วไป */
  --jh-radius-2xl: 32px;  /* การ์ดสรุปยอดเงิน / ฮีโร่การ์ดขนาดใหญ่ */

  /* มิติเงา (Neutral Shadows) */
  --jh-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06);
  --jh-shadow-card: 0 4px 20px rgba(0, 0, 0, 0.04);
  --jh-shadow-md: 0 8px 30px rgba(0, 0, 0, 0.08);
  --jh-shadow-lg: 0 18px 50px rgba(0, 0, 0, 0.12);

  /* เอฟเฟกต์การเคลื่อนไหวสไตล์ Apple */
  --jh-ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --jh-ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

---

## 3. ดีไซน์คอมโพเนนต์และการ์ดแบบพรีเมียม (Component Style Patterns)

### 🎴 1. รูปแบบการ์ด Gradient (Premium Stat Card)
*   **โครงสร้างหลัก:** ตัวการ์ดใช้การไล่โทนสีแบบเฉียง `linear-gradient(150deg, ...)` คู่กับกรอบสีขาวบางๆ และเงาฟุ้งลอย
*   **โค้ดตัวอย่างการ์ด (React/Tailwind):**
    ```tsx
    <div 
      className="group rounded-[32px] border border-white/60 p-5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] bg-white"
      style={{ background: "linear-gradient(150deg, #f3f5fa 0%, #e4eaf5 100%)" }}
    >
      {/* เนื้อหาภายในการ์ด */}
    </div>
    ```

### 🟩 2. ชิปไอคอนแบบเรืองแสง (Glowing Icon Chip)
*   **โครงสร้างหลัก:** ชิปเก็บไอคอนทรงสี่เหลี่ยมโค้งมนสีทึบสว่าง ตัวไอคอนสีขาว และทำเงาสีเรืองแสงแผ่ฟุ้งกระจาย (ใช้ค่าสีพื้นหลังชิปมาทำเป็นเงา) 
*   **โค้ดตัวอย่างชิปไอคอน (React/Tailwind):**
    ```tsx
    <div 
      className="flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
      style={{ 
        background: "#34508c", 
        color: "#fff", 
        boxShadow: "0 10px 22px -8px #34508c" 
      }}
    >
      <Zap className="h-5 w-5" strokeWidth={2} />
    </div>
    ```

### 🔘 3. ปุ่มแอคชันหลักและรอง (CTA Button Patterns)
*   **ปุ่มหลัก (Primary CTA):** พื้นหลังสีทึบหลักคู่กับเงาสีเรืองแสง เมื่อชี้จะยกตัวลอยขึ้นเบาๆ
*   **ปุ่มรอง (Secondary/Reject CTA):** พื้นหลังสีจาง (Tint) กรอบสีจาง และอักษรสีเข้มของโทนสีนั้นๆ
*   **โค้ดตัวอย่างปุ่มหลัก:**
    ```tsx
    <button
      className="flex items-center justify-center gap-1.5 px-6 py-3 text-sm font-black text-white rounded-xl shadow-lg active:scale-[0.98] transition-all hover:-translate-y-0.5 cursor-pointer"
      style={{ 
        background: "#34508c", 
        boxShadow: "0 8px 18px -6px #34508c" 
      }}
    >
      บันทึกข้อมูล
    </button>
    ```

---

## 4. แอนิเมชันการลอยขึ้น-ลง (Float Animations)

แอนิเมชันสำหรับทำให้ภาพ โลโก้ หรือตัวการ์ตูนมาสคอตหลัก มีลูกเล่นค่อยๆ ลอยขึ้นลงอย่างนุ่มนวลเป็นธรรมชาติ:

```css
/* ── Mascot float animation ── */
@keyframes jh-float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-14px) rotate(-1.5deg); }
}

@keyframes jh-float-soft {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-9px); }
}

/* คลาสเรียกใช้งาน */
.jh-float {
  animation: jh-float 5s ease-in-out infinite;
}

.jh-float-soft {
  animation: jh-float-soft 6.5s ease-in-out infinite;
}

/* ปิดการเคลื่อนไหวอัตโนมัติหากผู้ใช้ตั้งค่าปิด Motion ในระดับ OS */
@media (prefers-reduced-motion: reduce) {
  .jh-float, .jh-float-soft { 
    animation: none; 
  }
}
```
