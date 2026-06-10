"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "ข้อมูลหอพักและผู้เช่าปลอดภัยไหม?",
    a: "ปลอดภัยครับ ข้อมูลทั้งหมดเก็บบนฐานข้อมูลที่เข้ารหัส มีระบบแยกสิทธิ์การเข้าถึง (เจ้าของเห็นเฉพาะหอตัวเอง · ผู้เช่าเห็นเฉพาะห้องตัวเอง) และไม่มีการนำข้อมูลไปใช้เพื่อการอื่น",
  },
  {
    q: "ผู้เช่าต้องโหลดแอปเพิ่มไหม?",
    a: "ไม่ต้องเลยครับ ผู้เช่ารับบิล แจ้งเตือน และชำระเงินผ่าน LINE ที่ใช้อยู่ทุกวัน หรือเปิดลิงก์ในเบราว์เซอร์ได้ทันที ไม่ต้องติดตั้งแอปใหม่",
  },
  {
    q: "ระบบรองรับได้กี่ห้อง กี่หอพัก?",
    a: "รองรับตั้งแต่หอเล็กไม่กี่ห้อง ไปจนถึงอพาร์ตเม้นท์หลายร้อยห้อง คุณสร้างได้หลายหอในบัญชีเดียว และจำนวนห้องขึ้นอยู่กับแพ็กเกจที่เลือก (เริ่มต้น 30 ห้อง จนถึงไม่จำกัด)",
  },
  {
    q: "ระบบตรวจสลิปอัตโนมัติทำงานยังไง?",
    a: "เมื่อผู้เช่าแนบสลิปโอนเงิน ระบบจะอ่านยอดและตรวจสอบกับธนาคารให้อัตโนมัติ ถ้ายอดตรงและบัญชีถูกต้อง จะปิดบิลให้ทันที พร้อมกันสลิปซ้ำ/สลิปปลอม หากตรวจไม่ผ่านจะส่งให้เจ้าของกดอนุมัติเองได้",
  },
  {
    q: "เริ่มใช้งานต้องตั้งค่าอะไรบ้าง?",
    a: "แค่ 3 ขั้น: สร้างหอพัก+เพิ่มห้อง → ใส่เรตค่าน้ำค่าไฟและเบอร์พร้อมเพย์ → เชิญผู้เช่าเข้าระบบ เท่านี้ก็ออกบิลส่ง LINE ได้เลย ใช้เวลาตั้งค่าครั้งแรกไม่ถึง 10 นาที",
  },
  {
    q: "ถ้ายกเลิกแพ็กเกจ ข้อมูลจะหายไหม?",
    a: "ไม่หายครับ ข้อมูลยังอยู่ในระบบ เพียงแต่ฟีเจอร์บางส่วนจะถูกจำกัดจนกว่าจะต่ออายุ คุณสามารถกลับมาใช้งานต่อได้ทุกเมื่อโดยข้อมูลเดิมยังครบถ้วน",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr] md:gap-14">
      {/* Left: heading */}
      <div className="md:sticky md:top-28 md:self-start">
        <h2 className="text-[32px] font-semibold leading-[1.12] tracking-[-0.02em] md:text-[42px]">
          คำถามที่พบบ่อย
        </h2>
        <p className="mt-4 text-[15px] leading-[1.6] text-[var(--jh-ink-secondary)]">
          ไม่เจอคำตอบที่ต้องการ?
          <br />
          ติดต่อทีมงานได้ที่{" "}
          <a href="#contact" className="font-semibold text-[var(--jh-blue)] hover:underline">
            แบบฟอร์มด้านล่าง
          </a>{" "}
          เรายินดีช่วยเสมอ
        </p>
      </div>

      {/* Right: accordion */}
      <div className="space-y-3">
        {FAQS.map((item, i) => {
          const isOpen = open === i;
          return (
            <div
              key={item.q}
              className={`overflow-hidden rounded-[var(--jh-radius-lg)] border bg-white transition-colors duration-200 ${
                isOpen ? "border-[var(--jh-blue)]/30 shadow-[var(--jh-shadow-card)]" : "border-black/[0.06]"
              }`}
            >
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
              >
                <span className="text-[16px] font-semibold tracking-[-0.01em] text-[var(--jh-ink)]">
                  {item.q}
                </span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-[var(--jh-ink-tertiary)] transition-transform duration-300 ${
                    isOpen ? "rotate-180 text-[var(--jh-blue)]" : ""
                  }`}
                  strokeWidth={2}
                />
              </button>
              <div
                className="grid transition-all duration-300 ease-out"
                style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <p className="px-6 pb-5 text-[14px] leading-[1.7] text-[var(--jh-ink-secondary)]">
                    {item.a}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
