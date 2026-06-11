"use client";
import { useState } from "react";

const STEPS = [
  {
    num: 1,
    color: "#007aff",
    gradFrom: "#f4f9ff",
    gradTo: "#e3f0ff",
    title: "ลงทะเบียน & สร้างหอพัก",
    body: "สร้างบัญชีเจ้าของ ระบุจำนวนห้องพัก ตั้งค่าราคาและสิ่งอำนวยความสะดวก พร้อมตั้งค่าอัตราค่าน้ำ–ค่าไฟ",
  },
  {
    num: 2,
    color: "#34c759",
    gradFrom: "#f3fcf6",
    gradTo: "#e0f7e9",
    title: "เพิ่มผู้เช่าเข้าห้อง",
    body: "ลงทะเบียนผู้เช่าใหม่ ออกสัญญาเช่า และเชิญผู้เช่าเข้าสู่ระบบ เพื่อรับบิลและชำระเงินออนไลน์ได้ทันที",
  },
  {
    num: 3,
    color: "#ff9500",
    gradFrom: "#fff9f2",
    gradTo: "#ffeed9",
    title: "จดมิเตอร์ ออกบิลอัตโนมัติ",
    body: "สิ้นเดือนกรอกแค่มิเตอร์น้ำ–ไฟ ระบบคำนวณยอด สร้างใบแจ้งหนี้ และส่งเข้า LINE ลูกบ้านทันที",
  },
  {
    num: 4,
    color: "#5856d6",
    gradFrom: "#f6f6ff",
    gradTo: "#e8e7fb",
    title: "รับเงิน & ตรวจสลิปออนไลน์",
    body: "ลูกบ้านสแกน QR PromptPay จ่าย แนบสลิปกลับมา ระบบตรวจสอบและอัปเดตสถานะให้อัตโนมัติ",
  },
];

export default function HowItWorks() {
  const [active, setActive] = useState(0);
  const step = STEPS[active];

  return (
    <section id="how-it-works" className="bg-[var(--jh-surface)] px-6 py-24">
      <div className="mx-auto max-w-[1120px]">
        {/* Heading */}
        <div className="mb-14 text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--jh-blue)]">
            How it works
          </span>
          <h2 className="mt-3.5 text-[32px] font-semibold tracking-[-0.02em] md:text-[40px]">
            เริ่มใช้งานง่าย ๆ แค่ 4 ขั้นตอน
          </h2>
          <p className="mt-3 text-[17px] text-[var(--jh-ink-secondary)]">
            ไม่ซับซ้อน ใช้งานได้ทันที
          </p>
        </div>

        {/* 2-col layout */}
        <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">

          {/* ── Left: LINE phone mockup ── */}
          <div className="flex justify-center">
            <div className="relative">
              {/* Step number badge */}
              <div
                className="absolute -right-4 -top-4 z-10 flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold text-white transition-all duration-300"
                style={{ background: step.color, boxShadow: `0 10px 24px -6px ${step.color}` }}
              >
                {step.num}
              </div>

              {/* Tonal card wrapping the phone */}
              <div
                className="rounded-[var(--jh-radius-2xl)] border border-white/60 p-8 shadow-[var(--jh-shadow-card)] transition-all duration-500"
                style={{ background: `linear-gradient(150deg, ${step.gradFrom} 0%, ${step.gradTo} 100%)` }}
              >
                {/* CSS Phone frame */}
                <div className="w-[220px]">
                  <div className="rounded-[38px] border-[9px] border-[var(--jh-gray-900)] bg-[var(--jh-gray-900)] shadow-[var(--jh-shadow-lg)]">
                    <div className="overflow-hidden rounded-[29px] bg-[#8ab4e8]">
                      {/* LINE header */}
                      <div className="flex items-center gap-2 bg-[var(--jh-gray-900)] px-3.5 py-3 text-white">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 text-[13px]">🏠</div>
                        <div className="leading-tight">
                          <div className="text-[12px] font-semibold">JadHor แจ้งบิล</div>
                          <div className="text-[9px] text-white/60">ออนไลน์</div>
                        </div>
                      </div>
                      {/* Chat body */}
                      <div className="space-y-2 px-2.5 py-3.5">
                        <div className="max-w-[90%] rounded-2xl rounded-tl-md bg-white px-3 py-2.5 text-[10px] leading-[1.6] text-[var(--jh-ink)] shadow-sm">
                          <div className="font-bold">🧾 ใบแจ้งหนี้ค่าเช่า</div>
                          <div className="text-[var(--jh-ink-secondary)]">สวัสดีคุณลัดดาวัลย์ 🙏</div>
                          <div className="my-1.5 border-t border-dashed border-black/10" />
                          <div>🏠 ห้อง 001 · 6/2569</div>
                          <div className="my-1.5 border-t border-dashed border-black/10" />
                          <div>• ค่าเช่า: ฿3,500</div>
                          <div>• ค่าน้ำ: ฿612</div>
                          <div>• ค่าไฟ: ฿1,049</div>
                          <div className="my-1.5 border-t border-dashed border-black/10" />
                          <div className="font-bold">💰 ยอดรวม: ฿5,161</div>
                          <div className="text-[var(--jh-ink-secondary)]">📅 ครบกำหนด: 5 ก.ค.</div>
                        </div>
                        <div className="max-w-[90%] rounded-2xl rounded-tl-md px-3 py-2 text-[10px] font-semibold text-white shadow-sm" style={{ background: step.color }}>
                          👉 แตะเพื่อชำระเงิน
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right: steps list ── */}
          <div className="space-y-3">
            {STEPS.map((s, i) => (
              <button
                key={s.num}
                onClick={() => setActive(i)}
                className="group w-full rounded-[var(--jh-radius-xl)] border px-5 py-4 text-left transition-all duration-200"
                style={
                  active === i
                    ? {
                        background: `linear-gradient(150deg, ${s.gradFrom} 0%, ${s.gradTo} 100%)`,
                        borderColor: `${s.color}40`,
                        boxShadow: `0 4px 20px -6px ${s.color}30`,
                      }
                    : {
                        background: "white",
                        borderColor: "rgba(0,0,0,0.06)",
                      }
                }
              >
                <div className="flex items-center gap-4">
                  {/* Number badge */}
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all duration-200"
                    style={
                      active === i
                        ? { background: s.color, color: "#fff", boxShadow: `0 6px 16px -4px ${s.color}` }
                        : { background: "var(--jh-surface)", color: "var(--jh-ink-tertiary)", border: "1.5px solid rgba(0,0,0,0.08)" }
                    }
                  >
                    {s.num}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div
                      className="text-[15px] font-semibold tracking-[-0.01em] transition-colors duration-200"
                      style={{ color: active === i ? "var(--jh-ink)" : "var(--jh-ink-secondary)" }}
                    >
                      {s.title}
                    </div>
                    <div
                      className="overflow-hidden transition-all duration-300 ease-out"
                      style={{ maxHeight: active === i ? "80px" : "0px", opacity: active === i ? 1 : 0 }}
                    >
                      <p className="mt-1.5 text-sm leading-[1.55] text-[var(--jh-ink-secondary)]">
                        {s.body}
                      </p>
                    </div>
                  </div>

                  {/* Arrow */}
                  <svg
                    className="h-4 w-4 shrink-0 transition-all duration-200"
                    style={{
                      color: active === i ? s.color : "var(--jh-ink-tertiary)",
                      transform: active === i ? "translateX(2px)" : "none",
                    }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
