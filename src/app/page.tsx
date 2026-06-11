import Link from "next/link";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  Receipt,
  ScanLine,
  MessageCircle,
  Package,
  Wrench,
  FileText,
  Phone,
  Mail,
  ReceiptText,
  Calculator,
  AlarmClock,
  CheckCircle2,
} from "lucide-react";
import DashboardButton from "@/components/DashboardButton";
import PricingPlans from "@/components/marketing/PricingPlans";
import FAQ from "@/components/marketing/FAQ";
import HowItWorks from "@/components/marketing/HowItWorks";

const FEATURES = [
  {
    icon: Receipt,
    tint: "var(--jh-blue-tint)",
    color: "var(--jh-blue)",
    title: "ออกบิลค่าน้ำค่าไฟอัตโนมัติ",
    body: "จดมิเตอร์ปุ๊บ ระบบคำนวณยอดให้ปั๊บ พร้อมสร้างใบแจ้งหนี้ส่งตรงให้ลูกบ้านทันที หมดปัญหาคิดเลขผิด",
  },
  {
    icon: ScanLine,
    tint: "var(--jh-green-tint)",
    color: "var(--jh-green-ink)",
    title: "ระบบตรวจสลิปโอนเงิน",
    body: "ลูกบ้านสแกนชำระผ่าน QR Code ระบบตรวจสลิปและปรับสถานะการชำระเงินให้อัตโนมัติ (SlipOK API)",
  },
  {
    icon: MessageCircle,
    tint: "var(--jh-green-tint)",
    color: "var(--jh-green-ink)",
    title: "แจ้งเตือนผ่าน LINE",
    body: "ไม่พลาดทุกการเคลื่อนไหว แจ้งเตือนบิลใหม่ แจ้งซ่อม และรับพัสดุ ส่งตรงถึง LINE ลูกบ้านแบบเรียลไทม์",
  },
  {
    icon: Package,
    tint: "var(--jh-orange-tint)",
    color: "var(--jh-orange-ink)",
    title: "จัดการพัสดุ",
    body: "นิติบุคคลรับของปุ๊บ ระบบแจ้งเตือนลูกบ้านปั๊บ พร้อมให้ลูกบ้านเข้ามารับของได้อย่างเป็นระบบ ไม่ตกหล่น",
  },
  {
    icon: Wrench,
    tint: "var(--jh-red-tint)",
    color: "var(--jh-red)",
    title: "ระบบแจ้งซ่อมออนไลน์",
    body: "ลูกบ้านแจ้งปัญหาผ่านระบบ เจ้าของกดอัปเดตสถานะงานซ่อมได้ทันที หมดปัญหาโดนตามงานซ้ำซ้อน",
  },
  {
    icon: FileText,
    tint: "var(--jh-indigo-tint)",
    color: "var(--jh-indigo)",
    title: "จัดการสัญญาเช่า",
    body: "ร่างสัญญาเช่า พร้อมพิมพ์เป็นไฟล์ PDF ให้ลูกบ้านเซ็นได้ทันที เก็บประวัติสัญญาได้ตลอดอายุการใช้งาน",
  },
];

const PROBLEMS = [
  {
    icon: ReceiptText,
    tint: "var(--jh-green-tint)",
    color: "var(--jh-green-ink)",
    title: "ทุกเดือนต้องตามเก็บบิล–ค่าน้ำไฟ",
    body: "จดมิเตอร์ใส่กระดาษ คิดเลขในเครื่องคิดเลข แล้วพิมพ์บิลทีละห้อง เสียเวลาและพลาดง่าย",
  },
  {
    icon: Calculator,
    tint: "var(--jh-blue-tint)",
    color: "var(--jh-blue)",
    title: "คิดเลขมิเตอร์เองเสี่ยงผิดพลาด",
    body: "คูณเรตผิดนิดเดียว ยอดบิลก็เพี้ยน ต้องมานั่งทวนซ้ำ ลูกบ้านทักท้วงเรื่องยอดบ่อยครั้ง",
  },
  {
    icon: AlarmClock,
    tint: "var(--jh-orange-tint)",
    color: "var(--jh-orange-ink)",
    title: "ลูกบ้านลืมจ่าย ตามเก็บยาก",
    body: "ต้องไล่ทักทีละคนในแชต ไม่รู้ใครจ่ายแล้วใครยังค้าง สิ้นเดือนปวดหัวกับการตามเงิน",
  },
];

const LINE_BENEFITS = [
  "รับใบแจ้งหนี้อัตโนมัติทุกเดือน พร้อมยอดแยกค่าน้ำ–ค่าไฟ",
  "กดลิงก์ในแชต สแกน QR พร้อมเพย์จ่ายได้ทันที",
  "แนบสลิปยืนยันการโอนกลับมาในระบบได้เลย",
  "แจ้งเตือนทันทีเมื่อมีพัสดุมาส่งถึงหน้าหอ",
  "พิมพ์ถามยอดบิล–สถานะห้องกับระบบได้ตลอด 24 ชม.",
];


export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen overflow-x-hidden bg-white font-sans text-[var(--jh-ink)] selection:bg-[rgba(0,122,255,0.18)] antialiased">
      {/* ---------------- Header (iCloud glass toolbar) ---------------- */}
      <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-[var(--jh-glass-bg)] backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-[var(--jh-glass-bg)]">
        <div className="flex h-14 w-full items-center justify-between px-6 md:px-10 lg:px-14">
          <Link href="/" className="flex items-center gap-2.5 text-[18px] font-bold tracking-[-0.02em] text-[var(--jh-brand-navy)]">
            <Image src="/images/mascot/logo_avatar.png" alt="JadHor OS" width={30} height={30} className="h-[30px] w-[30px] object-contain rounded-md" />
            JadHor OS
          </Link>
          <nav className="flex items-center gap-7 text-sm text-[var(--jh-ink-secondary)]">
            <a href="#features" className="hidden transition-colors hover:text-[var(--jh-ink)] sm:inline">ฟีเจอร์</a>
            <a href="#how-it-works" className="hidden transition-colors hover:text-[var(--jh-ink)] sm:inline">วิธีใช้งาน</a>
            <a href="#pricing" className="hidden transition-colors hover:text-[var(--jh-ink)] sm:inline">แพ็กเกจ</a>
            <a href="#faq" className="hidden transition-colors hover:text-[var(--jh-ink)] sm:inline">คำถามที่พบบ่อย</a>
            {session ? (
              <DashboardButton className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-full bg-[var(--jh-gray-900)] px-5 text-sm font-semibold text-white transition-transform hover:bg-[var(--jh-gray-800)] active:scale-[0.97]" />
            ) : (
              <Link
                href="/login"
                className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-full bg-[var(--jh-gray-900)] px-5 text-sm font-semibold text-white transition-transform active:scale-[0.97]"
              >
                ลงชื่อเข้าใช้
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main>
        {/* ---------------- Hero ---------------- */}
        <section className="relative px-6 pt-20 pb-24 text-center">
          {/* Soft multi-color glow (iCloud+ / Apple Intelligence inspired by Mascot palette) */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-8 z-0 h-80 w-[460px] max-w-[90vw] -translate-x-1/2 opacity-55 blur-[56px]"
            style={{
              background:
                "radial-gradient(40% 55% at 35% 40%, rgba(22, 38, 76, 0.35), transparent 70%), radial-gradient(45% 55% at 70% 35%, rgba(212, 165, 72, 0.38), transparent 72%), radial-gradient(45% 50% at 55% 75%, rgba(255, 240, 210, 0.5), transparent 72%)",
            }}
          />
          <div className="relative z-10 mx-auto max-w-[1120px]">
            <Image
              src="/images/mascot/hero_landing.png"
              alt="มาสคอต JadHor"
              width={1146}
              height={888}
              priority
              className="mx-auto w-64 drop-shadow-[0_20px_44px_rgba(0,0,0,0.12)] sm:w-80 md:w-[420px] jh-float object-contain"
            />
            <h1 className="mt-7 text-[44px] font-semibold leading-[1.05] tracking-[-0.03em] md:text-[64px]">
              JadHor
              <span className="mt-2.5 block text-[22px] font-medium tracking-[-0.01em] text-[var(--jh-ink-tertiary)] md:text-[26px]">
                (จัดหอ)
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-[460px] text-[19px] font-medium leading-[1.45] tracking-[-0.01em] md:text-[21px]">
              พื้นที่ที่ดีที่สุดสำหรับจัดการหอพัก บิลค่าเช่า และลูกบ้านทั้งหมดของคุณ
            </p>

            <div className="mt-8">
              {session ? (
                <DashboardButton className="inline-flex h-[52px] items-center justify-center rounded-full bg-gradient-to-r from-[var(--jh-brand-gold)] to-[#ff9500] px-[30px] text-[17px] font-bold text-white shadow-[0_8px_18px_-6px_#d4a548] transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.97]" />
              ) : (
                <Link
                  href="/login"
                  className="inline-flex h-[52px] items-center justify-center rounded-full bg-gradient-to-r from-[var(--jh-brand-gold)] to-[#ff9500] px-[30px] text-[17px] font-bold text-white shadow-[0_8px_18px_-6px_#d4a548] transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.97]"
                >
                  เริ่มต้นใช้งานฟรี
                </Link>
              )}
            </div>

            {!session && (
              <p className="mt-6 text-sm text-[var(--jh-ink-secondary)]">
                ยังไม่มีบัญชีใช่หรือไม่?{" "}
                <Link href="/register" className="text-[var(--jh-blue)] hover:underline">
                  สร้างบัญชี JadHor OS ทันที
                </Link>
              </p>
            )}

          </div>
        </section>

        {/* ---------------- Problem (เล่าปัญหาก่อนเสนอทางแก้) ---------------- */}
        <section className="bg-[var(--jh-surface)] px-6 py-24">
          <div className="mx-auto max-w-[1120px]">
            <div className="mx-auto mb-14 max-w-[680px] text-center">
              <h2 className="text-[32px] font-semibold leading-[1.12] tracking-[-0.02em] md:text-[44px]">
                หมดปัญหาจุกจิกเรื่องหอพัก!
              </h2>
              <p className="mt-4 text-[17px] leading-[1.6] text-[var(--jh-ink-secondary)] md:text-[19px]">
                JadHor พร้อมช่วยเจ้าของหอพักและอพาร์ตเม้นท์ทุกขนาด
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {PROBLEMS.map((p) => (
                <div
                  key={p.title}
                  className="rounded-[var(--jh-radius-xl)] border border-black/[0.06] bg-white p-8 text-center shadow-[var(--jh-shadow-card)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[var(--jh-shadow-md)]"
                >
                  <div
                    className="mx-auto mb-5 flex h-[60px] w-[60px] items-center justify-center rounded-[var(--jh-radius-lg)]"
                    style={{ background: p.tint, color: p.color }}
                  >
                    <p.icon className="h-7 w-7" strokeWidth={1.75} />
                  </div>
                  <h3 className="mb-2.5 text-[19px] font-semibold tracking-[-0.01em]">{p.title}</h3>
                  <p className="mx-auto max-w-[280px] text-sm leading-[1.6] text-[var(--jh-ink-secondary)]">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- Features ---------------- */}
        <section id="features" className="px-6 py-24">
          <div className="mx-auto max-w-[1120px]">
            <div className="mx-auto mb-14 max-w-[680px] text-center">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--jh-blue)]">
                Core Features
              </span>
              <h2 className="mt-3.5 mb-4 text-[32px] font-semibold leading-[1.15] tracking-[-0.02em] md:text-[40px]">
                ที่เหลือ JadHor ทำงานให้อัตโนมัติ
                <span className="mt-1.5 block bg-gradient-to-r from-[var(--jh-blue)] to-[var(--jh-indigo)] bg-clip-text text-transparent">
                  นั่งรอเฉยๆ ก็ได้
                </span>
              </h2>
              <p className="text-[17px] leading-[1.6] text-[var(--jh-ink-secondary)]">
                ช่วยให้คุณประหยัดเวลา ลดความผิดพลาด และเพิ่มความพึงพอใจให้กับลูกบ้าน
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="rounded-[var(--jh-radius-xl)] border border-black/[0.06] bg-white p-8 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[var(--jh-shadow-md)]"
                >
                  <div
                    className="mb-5 flex h-[52px] w-[52px] items-center justify-center rounded-[var(--jh-radius-md)]"
                    style={{ background: f.tint, color: f.color }}
                  >
                    <f.icon className="h-[22px] w-[22px]" strokeWidth={1.75} />
                  </div>
                  <h3 className="mb-2.5 text-[19px] font-semibold tracking-[-0.01em]">{f.title}</h3>
                  <p className="text-sm leading-[1.6] text-[var(--jh-ink-secondary)]">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- How it works ---------------- */}
        <HowItWorks />

        {/* ---------------- LINE Mockup (เพียงแค่..รับบิลผ่าน LINE) ---------------- */}
        <section className="overflow-hidden px-6 py-24 bg-white">
          <div className="mx-auto grid max-w-[1120px] items-center gap-14 md:grid-cols-2">
            {/* Phone mockup image (dynamic glow) */}
            <div className="flex justify-center">
              <div className="relative w-full max-w-[320px]">
                {/* glow behind phone */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -inset-6 -z-10 opacity-70 blur-[50px]"
                  style={{
                    background:
                      "radial-gradient(50% 50% at 50% 35%, rgba(0,122,255,.32), transparent 70%), radial-gradient(45% 45% at 60% 80%, rgba(52,199,89,.28), transparent 72%)",
                  }}
                />
                <div className="relative group">
                  <Image
                    src="/images/tenant_bill_preview.png"
                    alt="ตัวอย่างการรับบิลผ่าน LINE ของ JadHor OS"
                    width={500}
                    height={1000}
                    className="w-full h-auto rounded-[36px] shadow-[0_20px_50px_rgba(0,0,0,0.12)] border border-slate-100 transform group-hover:-translate-y-1.5 transition-transform duration-500 ease-out"
                  />
                  {/* Decorative float badge */}
                  <span className="absolute -top-3 -right-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white font-bold shadow-lg animate-bounce">
                    ✓
                  </span>
                </div>
              </div>
            </div>

            {/* Text + checklist */}
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--jh-green-ink)]">
                Tenant Experience
              </span>
              <h2 className="mt-3.5 text-[32px] font-semibold leading-[1.12] tracking-[-0.02em] md:text-[42px]">
                เพียงแค่..ออกบิล
                <br />
                ที่เหลือส่งเข้า LINE ให้เอง
              </h2>
              <p className="mt-4 text-[17px] leading-[1.6] text-[var(--jh-ink-secondary)]">
                ลูกบ้านไม่ต้องโหลดแอปอะไรเพิ่ม รับทุกอย่างผ่านแอปพลิเคชัน LINE ที่ใช้ส่งข้อความอยู่ทุกวัน
              </p>
              <ul className="mt-7 space-y-3.5">
                {LINE_BENEFITS.map((b) => (
                  <li key={b} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-[22px] w-[22px] shrink-0 text-[var(--jh-green-ink)]" strokeWidth={2} />
                    <span className="text-[15px] leading-[1.5] text-[var(--jh-ink)]">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ---------------- Verification Mockup (ระบบตรวจสอบสลิปอัตโนมัติ) ---------------- */}
        <section className="overflow-hidden px-6 py-24 bg-[var(--jh-surface)]">
          <div className="mx-auto grid max-w-[1120px] items-center gap-14 md:grid-cols-2">
            
            {/* Text details (Order is swapped on desktop so image is on the right) */}
            <div className="order-2 md:order-1">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--jh-blue)]">
                Auto Verification
              </span>
              <h2 className="mt-3.5 text-[32px] font-semibold leading-[1.12] tracking-[-0.02em] md:text-[42px]">
                ตรวจสอบความถูกต้อง
                <br />
                และอนุมัติบิลในเสี้ยววินาที
              </h2>
              <p className="mt-4 text-[17px] leading-[1.6] text-[var(--jh-ink-secondary)]">
                เมื่อลูกบ้านส่งสลิปโอนเงิน ระบบจะประมวลผลเช็กยอดเงินจาก QR Code กับธนาคารผ่าน API SlipOK ทันที ตรวจจับสลิปซ้ำ สลิปปลอม หรือยอดเงินไม่ตรง
              </p>
              <ul className="mt-7 space-y-3.5">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-[22px] w-[22px] shrink-0 text-[var(--jh-blue)]" strokeWidth={2} />
                  <span className="text-[15px] leading-[1.5] text-[var(--jh-ink)]">อ่านรายละเอียด ยอดเงิน ประเภทสลิป จากธนาคารจริง</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-[22px] w-[22px] shrink-0 text-[var(--jh-blue)]" strokeWidth={2} />
                  <span className="text-[15px] leading-[1.5] text-[var(--jh-ink)]">ระบบตรวจสอบและปิดยอดชำระแบบเรียลไทม์ไม่ต้องรอคุณกด</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-[22px] w-[22px] shrink-0 text-[var(--jh-blue)]" strokeWidth={2} />
                  <span className="text-[15px] leading-[1.5] text-[var(--jh-ink)]">แจ้งเตือนแอดมิน/เจ้าของหอพักทันทีเมื่อมียอดโอนเข้ามาใหม่</span>
                </li>
              </ul>
              <div className="mt-8">
                <Link
                  href="/register"
                  className="inline-flex h-[48px] items-center justify-center rounded-full bg-[#34c759] px-[26px] text-base font-bold text-white shadow-[0_8px_18px_-6px_#34c759] transition-transform active:scale-[0.97] hover:-translate-y-0.5"
                >
                  เริ่มใช้งานฟรี!
                </Link>
              </div>
            </div>

            {/* Phone mockup image showing slip OK verify */}
            <div className="order-1 md:order-2 flex justify-center">
              <div className="relative w-full max-w-[320px]">
                {/* glow behind phone */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -inset-6 -z-10 opacity-70 blur-[50px]"
                  style={{
                    background:
                      "radial-gradient(50% 50% at 50% 35%, rgba(175,82,222,.32), transparent 70%), radial-gradient(45% 45% at 60% 80%, rgba(0,122,255,.28), transparent 72%)",
                  }}
                />
                <div className="relative group">
                  <Image
                    src="/images/owner_billing_verify.png"
                    alt="ระบบอนุมัติบิลและตรวจสลิปโอนเงินอัตโนมัติ"
                    width={500}
                    height={1000}
                    className="w-full h-auto rounded-[36px] shadow-[0_20px_50px_rgba(0,0,0,0.12)] border border-slate-100 transform group-hover:-translate-y-1.5 transition-transform duration-500 ease-out"
                  />
                  {/* Green badge arrow doodle indicator */}
                  <span className="absolute bottom-12 -left-4 inline-flex items-center gap-1 bg-[#34c759] text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-lg">
                    ✓ สลิปถูกต้อง
                  </span>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ---------------- Pricing ---------------- */}
        <section id="pricing" className="bg-[var(--jh-surface)] px-6 py-24">
          <div className="mx-auto max-w-[1120px]">
            <div className="mx-auto max-w-[640px] text-center">
              <h2 className="text-[32px] font-semibold tracking-[-0.02em] md:text-[40px]">
                แพ็กเกจที่เติบโตไปพร้อมธุรกิจคุณ
              </h2>
              <p className="mt-4 text-[17px] leading-[1.6] text-[var(--jh-ink-secondary)]">
                เลือกแพ็กเกจที่เหมาะกับขนาดหอพักของคุณ จ่ายเท่าที่ใช้งานจริง
              </p>
            </div>
            <PricingPlans />
          </div>
        </section>

        {/* ---------------- FAQ ---------------- */}
        <section id="faq" className="px-6 py-24">
          <div className="mx-auto max-w-[1120px]">
            <FAQ />
          </div>
        </section>

        {/* ---------------- Contact ---------------- */}
        <section id="contact" className="border-t border-black/[0.06] bg-[var(--jh-surface)] px-6 py-24">
          <div className="mx-auto max-w-[920px]">
            <div className="overflow-hidden rounded-[var(--jh-radius-2xl)] border border-black/[0.06] bg-white shadow-[var(--jh-shadow-card)]">
              <div className="flex flex-col md:flex-row">
              <div className="bg-[var(--jh-brand-navy)] p-10 text-white md:w-2/5">
                <h3 className="text-[22px] font-semibold tracking-[-0.01em] text-[var(--jh-brand-gold-tint)]">ติดต่อทีมงาน</h3>
                <p className="mt-3 text-sm leading-[1.6] text-white/70">
                  มีคำถามเกี่ยวกับระบบ หรือต้องการให้ทีมงานช่วยตั้งค่าระบบให้? ติดต่อเราได้เลย ทีมงานพร้อมดูแลคุณ
                </p>
                <div className="mt-8 space-y-4 text-sm text-white/85">
                  <div className="flex items-center gap-3">
                    <Phone className="h-[18px] w-[18px] shrink-0 text-[var(--jh-brand-gold)]" strokeWidth={1.75} />
                    064-035-3806
                  </div>
                  <div className="flex items-center gap-3 break-all">
                    <Mail className="h-[18px] w-[18px] shrink-0 text-[var(--jh-brand-gold)]" strokeWidth={1.75} />
                    atthanop.sornsri@gmail.com
                  </div>
                </div>
              </div>

              <div className="p-10 md:w-3/5">
                <form className="space-y-5" action="/api/contact" method="POST">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>ชื่อ-นามสกุล</Label>
                      <Input name="name" placeholder="สมชาย ใจดี" required className="h-11 rounded-[var(--jh-radius-md)]" />
                    </div>
                    <div className="space-y-2">
                      <Label>เบอร์โทรศัพท์</Label>
                      <Input name="phone" placeholder="081-xxx-xxxx" required className="h-11 rounded-[var(--jh-radius-md)]" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>ชื่อหอพัก / อพาร์ตเม้นท์ (ถ้ามี)</Label>
                    <Input name="property" placeholder="สบายดี อพาร์ตเม้นท์" className="h-11 rounded-[var(--jh-radius-md)]" />
                  </div>
                  <div className="space-y-2">
                    <Label>อีเมล</Label>
                    <Input name="email" type="email" placeholder="email@example.com" required className="h-11 rounded-[var(--jh-radius-md)]" />
                  </div>
                  <div className="space-y-2">
                    <Label>เรื่องที่ต้องการสอบถาม</Label>
                    <textarea
                      name="message"
                      required
                      placeholder="พิมพ์ข้อความของคุณที่นี่..."
                      className="flex min-h-[100px] w-full resize-none rounded-[var(--jh-radius-md)] border border-[var(--jh-border)] bg-white px-3.5 py-2.5 text-sm outline-none transition-shadow focus:border-[var(--jh-blue)] focus:ring-4 focus:ring-[var(--jh-focus-ring)]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[var(--jh-brand-navy)] text-sm font-semibold text-white shadow-[0_8px_18px_-6px_rgba(22,38,76,0.6)] transition-all hover:bg-[var(--jh-brand-navy-dark)] hover:-translate-y-0.5 active:scale-[0.99]"
                  >
                    ส่งข้อความ
                  </button>
                </form>
              </div>
            </div>
            </div>
          </div>
        </section>
      </main>

      {/* ---------------- Footer ---------------- */}
      <footer className="bg-[var(--jh-brand-navy)] px-6 pt-16 pb-8 text-[var(--jh-ink-tertiary)] border-t border-white/5">
        <div className="mx-auto max-w-[1120px]">
          <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-[1.7fr_1fr_1fr_1.4fr]">
            {/* Brand + tagline */}
            <div>
              <div className="inline-flex items-center gap-2.5">
                <Image src="/images/mascot/logo_avatar.png" alt="JadHor OS" width={40} height={40} className="h-10 w-10 object-contain rounded-md" />
                <span className="text-[20px] font-bold tracking-[-0.02em] text-white">JadHor OS</span>
              </div>
              <p className="mt-4 max-w-[300px] text-[13px] leading-[1.7] text-[var(--jh-ink-tertiary)]">
                แพลตฟอร์มบริหารจัดการหอพักยุคใหม่ ออกบิล–เก็บค่าเช่า–ดูแลลูกบ้าน จบครบในที่เดียว
              </p>
            </div>

            {/* บริการของเรา */}
            <div>
              <h4 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-white/90">บริการของเรา</h4>
              <ul className="mt-4 space-y-3 text-sm">
                <li><a href="#features" className="transition-colors hover:text-white">ฟีเจอร์</a></li>
                <li><a href="#how-it-works" className="transition-colors hover:text-white">วิธีใช้งาน</a></li>
                <li><a href="#pricing" className="transition-colors hover:text-white">แพ็กเกจทั้งหมด</a></li>
              </ul>
            </div>

            {/* ช่วยเหลือ */}
            <div>
              <h4 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-white/90">ช่วยเหลือ</h4>
              <ul className="mt-4 space-y-3 text-sm">
                <li><a href="#faq" className="transition-colors hover:text-white">คำถามที่พบบ่อย</a></li>
                <li><a href="#contact" className="transition-colors hover:text-white">ติดต่อทีมงาน</a></li>
                <li><Link href="/login" className="transition-colors hover:text-white">เข้าสู่ระบบ</Link></li>
              </ul>
            </div>

            {/* ติดต่อเรา */}
            <div>
              <h4 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-white/90">ติดต่อเรา</h4>
              <div className="mt-4 space-y-3 text-sm">
                <a href="tel:0640353806" className="flex items-center gap-2.5 transition-colors hover:text-white">
                  <Phone className="h-[18px] w-[18px] shrink-0 text-white/50" strokeWidth={1.75} />
                  064-035-3806
                </a>
                <a href="mailto:atthanop.sornsri@gmail.com" className="flex items-center gap-2.5 break-all transition-colors hover:text-white">
                  <Mail className="h-[18px] w-[18px] shrink-0 text-white/50" strokeWidth={1.75} />
                  atthanop.sornsri@gmail.com
                </a>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 md:flex-row">
            <p className="text-[13px]">© 2026 JadHor OS. All rights reserved.</p>
            <div className="flex gap-6 text-[13px]">
              <Link href="/terms" className="transition-colors hover:text-white">เงื่อนไขการใช้งาน</Link>
              <Link href="/privacy" className="transition-colors hover:text-white">นโยบายความเป็นส่วนตัว</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
