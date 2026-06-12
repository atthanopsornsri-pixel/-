"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Sparkles, Building2, TrendingUp, Crown } from "lucide-react";

type Plan = {
  name: string;
  desc: string;
  monthlyNum: number;
  yearlyNum: number;
  features: string[];
  cta: string;
  href: string;
  featured?: boolean;
  Icon: React.ElementType;
  /** solid tone color */
  color: string;
  gradFrom: string;
  gradTo: string;
  /** ink color สำหรับตัวเลข */
  ink: string;
};

const PLANS: Plan[] = [
  {
    name: "Starter",
    desc: "เริ่มต้นอย่างโปร",
    monthlyNum: 199,
    yearlyNum: 1990,
    features: ["จัดการได้สูงสุด 30 ห้อง", "ระบบออกบิล & ส่ง LINE", "ระบบแจ้งซ่อม & พัสดุ"],
    cta: "ทดลองใช้ฟรี 14 วัน",
    href: "/register",
    Icon: Building2,
    color: "#34c759",
    gradFrom: "#f3fcf6",
    gradTo: "#e0f7e9",
    ink: "var(--jh-green-ink)",
  },
  {
    name: "Growth",
    desc: "สำหรับอพาร์ตเมนต์ที่กำลังขยาย",
    monthlyNum: 599,
    yearlyNum: 5990,
    features: ["จัดการได้สูงสุด 100 ห้อง", "ฟีเจอร์ทั้งหมดในแพ็กเกจ Starter", "ระบบตรวจสลิปอัตโนมัติ"],
    cta: "เริ่มใช้งานเลย",
    href: "/register",
    featured: true,
    Icon: TrendingUp,
    color: "#34508c",
    gradFrom: "#f3f5fa",
    gradTo: "#e4eaf5",
    ink: "var(--jh-blue)",
  },
  {
    name: "Enterprise",
    desc: "เสือนอนกิน โปรเจกต์ใหญ่",
    monthlyNum: 1299,
    yearlyNum: 12990,
    features: ["ไม่จำกัดจำนวนห้องพัก", "ฟีเจอร์ทั้งหมดในแพ็กเกจ Growth", "บริการ Support พิเศษ 24/7"],
    cta: "ติดต่อแอดมิน",
    href: "/register",
    Icon: Crown,
    color: "#5856d6",
    gradFrom: "#f6f6ff",
    gradTo: "#e8e7fb",
    ink: "var(--jh-indigo)",
  },
];

/** format เป็น ฿x,xxx */
const baht = (n: number) => `฿${n.toLocaleString()}`;

export default function PricingPlans() {
  const [mode, setMode] = useState<"monthly" | "yearly">("monthly");
  const [swap, setSwap] = useState(false);
  const [shownMode, setShownMode] = useState<"monthly" | "yearly">("monthly");

  // Animated segmented-control thumb
  const monthlyRef = useRef<HTMLButtonElement>(null);
  const yearlyRef = useRef<HTMLButtonElement>(null);
  const [thumb, setThumb] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const btn = mode === "monthly" ? monthlyRef.current : yearlyRef.current;
    if (btn) setThumb({ left: btn.offsetLeft, width: btn.offsetWidth });
  }, [mode]);

  // Animate the price swap when the billing mode changes
  useEffect(() => {
    setSwap(true);
    const t = setTimeout(() => {
      setShownMode(mode);
      setSwap(false);
    }, 170);
    return () => clearTimeout(t);
  }, [mode]);

  return (
    <div>
      {/* Billing toggle */}
      <div className="mt-6 flex items-center justify-center">
        <div className="relative inline-flex rounded-full border border-black/[0.06] bg-[var(--jh-surface)] p-1">
          <span
            className="absolute top-1 z-0 h-9 rounded-full bg-[var(--jh-blue)] shadow-[var(--jh-shadow-sm)]"
            style={{
              left: thumb.left,
              width: thumb.width,
              transition:
                "transform .4s var(--jh-ease-spring), width .4s var(--jh-ease-spring), left .4s var(--jh-ease-spring)",
            }}
          />
          <button
            ref={monthlyRef}
            onClick={() => setMode("monthly")}
            className={`relative z-10 h-9 whitespace-nowrap rounded-full px-[22px] text-sm font-semibold transition-colors duration-300 ${
              mode === "monthly" ? "text-white" : "text-[var(--jh-ink-secondary)]"
            }`}
          >
            รายเดือน
          </button>
          <button
            ref={yearlyRef}
            onClick={() => setMode("yearly")}
            className={`relative z-10 h-9 whitespace-nowrap rounded-full px-[22px] text-sm font-semibold transition-colors duration-300 ${
              mode === "yearly" ? "text-white" : "text-[var(--jh-ink-secondary)]"
            }`}
          >
            รายปี
          </button>
        </div>
        <span
          className={`ml-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--jh-green-tint)] px-3.5 py-1.5 text-[13px] font-semibold text-[var(--jh-green-ink)] transition-all duration-300 ${
            mode === "yearly" ? "translate-x-0 opacity-100" : "pointer-events-none -translate-x-2 opacity-0"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          ประหยัด 17%
        </span>
      </div>

      {/* Plans */}
      <div className="mt-12 grid items-stretch gap-5 md:grid-cols-3">
        {PLANS.map((plan) => {
          const isYearly = shownMode === "yearly";
          const Icon = plan.Icon;
          // รายปี → แสดงราคาเฉลี่ยต่อเดือน (จ่าย 10 เดือน ได้ใช้ 12 เดือน)
          const bigPrice = isYearly ? Math.round(plan.yearlyNum / 12) : plan.monthlyNum;
          return (
            <div
              key={plan.name}
              className={`group relative flex flex-col overflow-hidden rounded-[var(--jh-radius-2xl)] p-8 transition-all duration-300 ease-out hover:-translate-y-1.5 ${
                plan.featured
                  ? "border border-transparent text-white shadow-[0_20px_50px_rgba(0,122,255,0.28)] hover:shadow-[0_26px_60px_rgba(0,122,255,0.34)]"
                  : "border border-white/60 shadow-[var(--jh-shadow-card)] hover:shadow-[var(--jh-shadow-md)]"
              }`}
              style={
                plan.featured
                  ? { background: "linear-gradient(160deg, #2b94ff 0%, #34508c 55%, #0062cc 100%)" }
                  : { background: `linear-gradient(150deg, ${plan.gradFrom} 0%, ${plan.gradTo} 100%)` }
              }
            >
              {/* Decorative glow blob (featured only) */}
              {plan.featured && (
                <div
                  className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-30 blur-2xl"
                  style={{ background: "radial-gradient(circle, #ffffff 0%, transparent 70%)" }}
                />
              )}

              {/* Header row: icon chip + recommended badge */}
              <div className="relative flex items-center justify-between">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-[var(--jh-radius-md)] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
                  style={
                    plan.featured
                      ? { background: "rgba(255,255,255,0.18)", color: "#fff", boxShadow: "0 10px 22px -8px rgba(0,0,0,0.25)" }
                      : { background: plan.color, color: "#fff", boxShadow: `0 10px 22px -8px ${plan.color}` }
                  }
                >
                  <Icon className="h-6 w-6" strokeWidth={2} />
                </div>
                {plan.featured && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-[var(--jh-blue)] shadow-[var(--jh-shadow-sm)]">
                    <Sparkles className="h-3 w-3" strokeWidth={2.5} />
                    ยอดนิยม
                  </span>
                )}
              </div>

              {/* Name + desc */}
              <div className="relative mt-5">
                <div className="text-[20px] font-bold tracking-[-0.01em]">{plan.name}</div>
                <div
                  className={`mt-1 text-[13px] ${
                    plan.featured ? "text-white/70" : "text-[var(--jh-ink-secondary)]"
                  }`}
                >
                  {plan.desc}
                </div>
              </div>

              {/* Price */}
              <div
                className="relative mt-5 transition-all duration-300"
                style={{
                  transform: swap ? "translateY(10px)" : "translateY(0)",
                  opacity: swap ? 0 : 1,
                }}
              >
                <div className="flex items-baseline gap-2">
                  {isYearly && (
                    <span
                      className={`text-[17px] font-medium tabular-nums line-through ${
                        plan.featured ? "text-white/45" : "text-[var(--jh-ink-tertiary)]"
                      }`}
                    >
                      {baht(plan.monthlyNum)}
                    </span>
                  )}
                  <span
                    className="text-[44px] font-bold tracking-[-0.02em] tabular-nums leading-none"
                    style={plan.featured ? { color: "#fff" } : { color: plan.ink }}
                  >
                    {baht(bigPrice)}
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      plan.featured ? "text-white/70" : "text-[var(--jh-ink-tertiary)]"
                    }`}
                  >
                    / เดือน
                  </span>
                </div>
                <div
                  className={`mt-1.5 text-[13px] font-medium ${
                    plan.featured ? "text-white/70" : "text-[var(--jh-ink-tertiary)]"
                  }`}
                >
                  {isYearly ? `ชำระรายปี ${baht(plan.yearlyNum)} / ปี` : "ชำระแบบรายเดือน"}
                </div>
              </div>

              {/* Feature list */}
              <ul className="relative my-6 flex flex-1 flex-col gap-3.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <span
                      className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full"
                      style={
                        plan.featured
                          ? { background: "rgba(255,255,255,0.22)" }
                          : { background: plan.color }
                      }
                    >
                      <Check className="h-3 w-3 text-white" strokeWidth={3} />
                    </span>
                    <span className={plan.featured ? "text-white/95" : "text-[var(--jh-ink)]"}>{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                href={plan.href}
                className="relative inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]"
                style={
                  plan.featured
                    ? { background: "#fff", color: "var(--jh-blue)", boxShadow: "0 8px 18px -6px rgba(0,0,0,0.25)" }
                    : { background: plan.color, color: "#fff", boxShadow: `0 8px 18px -6px ${plan.color}` }
                }
              >
                {plan.cta}
              </Link>
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-center text-[13px] text-[var(--jh-ink-tertiary)]">
        * หรือเลือกชำระแบบรายปี ลดทันที 2 เดือน (จ่ายเพียง 10 เดือน)
      </p>
    </div>
  );
}
