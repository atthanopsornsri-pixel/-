"use client";
import { useState } from "react";

const STEPS = [
  {
    num: 1,
    color: "#34508c",
    gradFrom: "#f3f5fa",
    gradTo: "#e4eaf5",
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
    color: "#d4a548",
    gradFrom: "#fdf8ee",
    gradTo: "#f6ecd6",
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
                className="rounded-[var(--jh-radius-2xl)] border border-white/60 p-8 shadow-[var(--jh-shadow-card)] transition-all duration-500 min-h-[380px] flex items-center justify-center"
                style={{ background: `linear-gradient(150deg, ${step.gradFrom} 0%, ${step.gradTo} 100%)` }}
              >
                {/* CSS Phone frame */}
                <div className="w-[230px] transition-all duration-300">
                  <div className="rounded-[38px] border-[9px] border-[var(--jh-gray-900)] bg-[var(--jh-gray-900)] shadow-[var(--jh-shadow-lg)] overflow-hidden">
                    <div className="overflow-hidden rounded-[29px] bg-[#8ab4e8] min-h-[290px] flex flex-col">
                      
                      {/* ──── Dynamic Render based on Active Step ──── */}
                      {active === 0 && (
                        /* Step 1: ลงทะเบียน & สร้างหอพัก */
                        <div className="flex-1 flex flex-col bg-slate-50 text-[10px] p-3 text-[var(--jh-ink)]">
                          <div className="font-bold border-b pb-1.5 mb-2 flex items-center gap-1.5 text-[var(--jh-blue)]">
                            <span className="text-base">🏢</span> สร้างหอพักใหม่
                          </div>
                          <div className="space-y-2 flex-1">
                            <div className="bg-white p-2 rounded-lg border border-slate-100">
                              <span className="text-slate-400 block text-[8px]">ชื่อหอพัก</span>
                              <span className="font-bold">สบายดี อพาร์ตเม้นท์</span>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              <div className="bg-white p-2 rounded-lg border border-slate-100">
                                <span className="text-slate-400 block text-[8px]">เรทค่าไฟ</span>
                                <span className="font-bold text-blue-600">฿8 / หน่วย</span>
                              </div>
                              <div className="bg-white p-2 rounded-lg border border-slate-100">
                                <span className="text-slate-400 block text-[8px]">เรทค่าน้ำ</span>
                                <span className="font-bold text-emerald-600">฿18 / หน่วย</span>
                              </div>
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-slate-100 flex justify-between items-center">
                              <div>
                                <span className="text-slate-400 block text-[8px]">การจัดตั้งห้อง</span>
                                <span className="font-semibold">ห้อง 101 - 310</span>
                              </div>
                              <span className="text-[9px] font-bold text-emerald-500">30 ห้อง ✓</span>
                            </div>
                          </div>
                          <div className="mt-2 text-center py-1.5 bg-blue-600 text-white rounded-lg font-bold text-[9px]">
                            บันทึกข้อมูลหอพัก
                          </div>
                        </div>
                      )}

                      {active === 1 && (
                        /* Step 2: เพิ่มผู้เช่าเข้าห้อง */
                        <div className="flex-1 flex flex-col">
                          {/* LINE Header */}
                          <div className="flex items-center gap-2 bg-[var(--jh-gray-900)] px-3 py-2 text-white">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs">🚪</div>
                            <div className="leading-tight">
                              <div className="text-[10px] font-semibold">เชิญลูกบ้าน</div>
                              <div className="text-[8px] text-white/50">ออนไลน์</div>
                            </div>
                          </div>
                          {/* Chat body */}
                          <div className="flex-1 space-y-2 px-2 py-3 text-[9px] leading-relaxed">
                            <div className="max-w-[90%] rounded-xl rounded-tl-md bg-white p-2.5 text-[var(--jh-ink)] shadow-sm">
                              <div className="font-bold text-emerald-600">🔑 ลิงก์เชิญเข้าห้องพัก</div>
                              <div className="text-slate-500">ห้อง 101 | สบายดี อพาร์ตเม้นท์</div>
                              <div className="my-1 border-t border-dashed border-black/10" />
                              <div className="font-mono bg-slate-50 p-1 text-center rounded border font-semibold text-slate-800 text-[10px]">
                                รหัสเชิญ: JAD-A896
                              </div>
                              <div className="text-[8px] text-slate-400 mt-1">กดลิงก์ด้านล่างเพื่อผูกบัญชี LINE</div>
                            </div>
                            <div className="max-w-[90%] rounded-xl rounded-tl-md bg-[#34c759] p-2 text-center font-bold text-white shadow-sm cursor-pointer">
                              👉 ลงทะเบียนลูกบ้านห้อง 101
                            </div>
                          </div>
                        </div>
                      )}

                      {active === 2 && (
                        /* Step 3: จดมิเตอร์ ออกบิลอัตโนมัติ */
                        <div className="flex-1 flex flex-col">
                          {/* LINE Header */}
                          <div className="flex items-center gap-2 bg-[var(--jh-gray-900)] px-3 py-2 text-white">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs">🧾</div>
                            <div className="leading-tight">
                              <div className="text-[10px] font-semibold">JadHor แจ้งบิล</div>
                              <div className="text-[8px] text-white/50">ส่งบิลล่าสุด</div>
                            </div>
                          </div>
                          {/* Chat body */}
                          <div className="flex-1 space-y-2 px-2 py-3 text-[9px] leading-relaxed">
                            <div className="max-w-[90%] rounded-xl rounded-tl-md bg-white p-2.5 text-[var(--jh-ink)] shadow-sm">
                              <div className="font-bold">🧾 ใบแจ้งหนี้ค่าเช่า — ห้อง 101</div>
                              <div className="my-1 border-t border-dashed border-black/10" />
                              <div>• ค่าเช่าห้อง: ฿4,000</div>
                              <div>• ค่าน้ำ (12 หน่วย): ฿216</div>
                              <div>• ค่าไฟ (90 หน่วย): ฿720</div>
                              <div className="my-1 border-t border-dashed border-black/10" />
                              <div className="font-bold text-orange-600">💰 ยอดรวม: ฿4,936</div>
                            </div>
                            <div className="max-w-[90%] rounded-xl rounded-tl-md bg-[#d4a548] p-2 text-center font-bold text-white shadow-sm">
                              👉 แตะเพื่อชำระเงินและแนบสลิป
                            </div>
                          </div>
                        </div>
                      )}

                      {active === 3 && (
                        /* Step 4: รับเงิน & ตรวจสลิปออนไลน์ */
                        <div className="flex-1 flex flex-col bg-slate-50 text-[10px] p-3 text-[var(--jh-ink)]">
                          <div className="font-bold border-b pb-1.5 mb-2 flex justify-between items-center text-[var(--jh-indigo)]">
                            <span>🔍 ระบบตรวจสลิปอัตโนมัติ</span>
                            <span className="text-[8px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold">SlipOK</span>
                          </div>
                          <div className="space-y-2 flex-1">
                            <div className="bg-white p-2 rounded-lg border border-slate-100 flex items-center gap-2">
                              <span className="text-xl">🧾</span>
                              <div className="flex-1">
                                <span className="text-slate-400 block text-[8px]">ตรวจพบสลิปธนาคาร</span>
                                <span className="font-bold text-slate-800">กสิกรไทย (K-Plus)</span>
                              </div>
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-slate-100 flex justify-between items-center">
                              <div>
                                <span className="text-slate-400 block text-[8px]">ยอดเงินโอน</span>
                                <span className="font-bold text-slate-800">฿4,936.00</span>
                              </div>
                              <span className="text-[8px] bg-emerald-500 text-white font-bold px-1.5 py-0.5 rounded">ตรงยอดบิล ✓</span>
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-slate-100">
                              <span className="text-slate-400 block text-[8px]">สถานะบิล</span>
                              <span className="font-extrabold text-emerald-600 text-[10px]">ชำระเงินเสร็จสิ้น (PAID) ✓</span>
                            </div>
                          </div>
                          <div className="mt-2 text-center py-1.5 bg-[#5856d6] text-white rounded-lg font-bold text-[9px]">
                            ปิดยอดบิลเรียบร้อย
                          </div>
                        </div>
                      )}

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
