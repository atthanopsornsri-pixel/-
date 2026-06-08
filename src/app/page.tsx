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
} from "lucide-react";
import DashboardButton from "@/components/DashboardButton";
import PricingPlans from "@/components/marketing/PricingPlans";

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

const STEPS = [
  {
    title: "ลงทะเบียน & สร้างตึก",
    body: "สร้างบัญชีเจ้าของ ระบุจำนวนห้องพัก ตั้งค่าราคาและสิ่งอำนวยความสะดวกพื้นฐาน",
  },
  {
    title: "เพิ่มผู้เช่าเข้าห้อง",
    body: "ลงทะเบียนผู้เช่าใหม่ ออกสัญญาเช่าให้เซ็น และเชิญผู้เช่าเข้าสู่ระบบ",
  },
  {
    title: "จัดการบิล & รับเงิน",
    body: "สิ้นเดือนกรอกแค่มิเตอร์ ระบบส่งบิลเข้า LINE ลูกบ้าน จ่ายปุ๊บ ระบบอัปเดตยอดให้ปั๊บ",
  },
];

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen overflow-x-hidden bg-white font-sans text-[var(--jh-ink)] selection:bg-[rgba(0,122,255,0.18)] antialiased">
      {/* ---------------- Header (iCloud glass toolbar) ---------------- */}
      <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-[var(--jh-glass-bg)] backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-[var(--jh-glass-bg)]">
        <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5 text-[18px] font-bold tracking-[-0.02em]">
            <Image src="/images/logo.png" alt="JadHor OS" width={30} height={30} className="h-[30px] w-[30px] object-contain" />
            JadHor OS
          </Link>
          <nav className="flex items-center gap-7 text-sm text-[var(--jh-ink-secondary)]">
            <a href="#features" className="hidden transition-colors hover:text-[var(--jh-ink)] sm:inline">ฟีเจอร์</a>
            <a href="#how-it-works" className="hidden transition-colors hover:text-[var(--jh-ink)] sm:inline">วิธีใช้งาน</a>
            <a href="#pricing" className="hidden transition-colors hover:text-[var(--jh-ink)] sm:inline">แพ็กเกจ</a>
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
        <section className="relative px-6 pt-20 text-center">
          {/* Soft multi-color glow (iCloud+ / Apple Intelligence) */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-8 z-0 h-80 w-[460px] max-w-[90vw] -translate-x-1/2 opacity-55 blur-[56px]"
            style={{
              background:
                "radial-gradient(40% 55% at 35% 40%, rgba(0,122,255,.45), transparent 70%), radial-gradient(45% 55% at 70% 35%, rgba(175,82,222,.40), transparent 72%), radial-gradient(45% 50% at 55% 75%, rgba(48,176,199,.38), transparent 72%)",
            }}
          />
          <div className="relative z-10 mx-auto max-w-[1120px]">
            <Image
              src="/images/logo.png"
              alt="JadHor OS"
              width={120}
              height={120}
              priority
              className="mx-auto h-28 w-28 object-contain drop-shadow-[0_12px_30px_rgba(0,0,0,0.12)] transition-transform duration-500 hover:scale-105 md:h-30 md:w-30"
            />
            <h1 className="mt-7 text-[44px] font-semibold leading-[1.05] tracking-[-0.03em] md:text-[64px]">
              JadHor OS
              <span className="mt-2.5 block text-[22px] font-medium tracking-[-0.01em] text-[var(--jh-ink-tertiary)] md:text-[26px]">
                (จัดหอ)
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-[460px] text-[19px] font-medium leading-[1.45] tracking-[-0.01em] md:text-[21px]">
              พื้นที่ที่ดีที่สุดสำหรับจัดการหอพัก บิลค่าเช่า และลูกบ้านทั้งหมดของคุณ
            </p>

            <div className="mt-8">
              {session ? (
                <DashboardButton className="inline-flex h-[52px] items-center justify-center rounded-full bg-[var(--jh-gray-900)] px-[30px] text-[17px] font-semibold text-white shadow-[var(--jh-shadow-sm)] transition-transform hover:bg-[var(--jh-gray-800)] active:scale-[0.97]" />
              ) : (
                <Link
                  href="/login"
                  className="inline-flex h-[52px] items-center justify-center rounded-full bg-[var(--jh-gray-900)] px-[30px] text-[17px] font-semibold text-white shadow-[var(--jh-shadow-sm)] transition-transform active:scale-[0.97]"
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

            {/* Dashboard mockup */}
            <div className="mx-auto mt-16 max-w-[1000px] overflow-hidden rounded-[var(--jh-radius-2xl)] border border-black/[0.06] shadow-[var(--jh-shadow-lg)]">
              <Image
                src="/images/dashboard-mockup.png"
                alt="JadHor OS Dashboard"
                width={1400}
                height={900}
                priority
                className="block h-auto w-full"
              />
            </div>
          </div>
        </section>

        {/* ---------------- Features ---------------- */}
        <section id="features" className="px-6 py-24">
          <div className="mx-auto max-w-[1120px]">
            <div className="mx-auto mb-14 max-w-[640px] text-center">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--jh-blue)]">
                Core Features
              </span>
              <h2 className="mt-3.5 mb-4 text-[32px] font-semibold leading-[1.15] tracking-[-0.02em] md:text-[40px]">
                ทุกอย่างที่เจ้าของหอพักต้องการ ในที่เดียว
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
        <section id="how-it-works" className="bg-[var(--jh-surface)] px-6 py-24">
          <div className="mx-auto max-w-[1120px]">
            <div className="mb-14 text-center">
              <h2 className="text-[32px] font-semibold tracking-[-0.02em] md:text-[40px]">
                เริ่มต้นใช้งานง่ายๆ ใน 3 ขั้นตอน
              </h2>
            </div>
            <div className="grid gap-10 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <div key={s.title} className="text-center">
                  <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--jh-blue)] text-[22px] font-semibold text-white shadow-[0_10px_24px_rgba(0,122,255,0.28)]">
                    {i + 1}
                  </div>
                  <h4 className="mb-2 text-[18px] font-semibold">{s.title}</h4>
                  <p className="mx-auto max-w-[320px] text-sm leading-[1.6] text-[var(--jh-ink-secondary)]">
                    {s.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- Pricing ---------------- */}
        <section id="pricing" className="px-6 py-24">
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

        {/* ---------------- Contact ---------------- */}
        <section id="contact" className="border-t border-black/[0.06] bg-[var(--jh-surface)] px-6 py-24">
          <div className="mx-auto max-w-[920px] overflow-hidden rounded-[var(--jh-radius-2xl)] border border-black/[0.06] bg-white shadow-[var(--jh-shadow-card)]">
            <div className="flex flex-col md:flex-row">
              <div className="bg-[var(--jh-gray-900)] p-10 text-white md:w-2/5">
                <h3 className="text-[22px] font-semibold tracking-[-0.01em]">ติดต่อทีมงาน</h3>
                <p className="mt-3 text-sm leading-[1.6] text-white/70">
                  มีคำถามเกี่ยวกับระบบ หรือต้องการให้ทีมงานช่วยตั้งค่าระบบให้? ติดต่อเราได้เลย ทีมงานพร้อมดูแลคุณ
                </p>
                <div className="mt-8 space-y-4 text-sm text-white/85">
                  <div className="flex items-center gap-3">
                    <Phone className="h-[18px] w-[18px] shrink-0 text-white/60" strokeWidth={1.75} />
                    064-035-3806
                  </div>
                  <div className="flex items-center gap-3 break-all">
                    <Mail className="h-[18px] w-[18px] shrink-0 text-white/60" strokeWidth={1.75} />
                    atthanop.sornsri@gmail.com
                  </div>
                </div>
              </div>

              <div className="p-10 md:w-3/5">
                <form className="space-y-5" action="/api/contact" method="POST">
                  <div className="grid grid-cols-2 gap-4">
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
                    className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[var(--jh-blue)] text-sm font-semibold text-white shadow-[var(--jh-shadow-sm)] transition-all hover:bg-[var(--jh-blue-dark)] active:scale-[0.99]"
                  >
                    ส่งข้อความ
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ---------------- Footer ---------------- */}
      <footer className="bg-[var(--jh-gray-900)] px-6 py-12 text-[var(--jh-gray-500)]">
        <div className="mx-auto flex max-w-[1120px] flex-col items-center justify-between gap-6 md:flex-row">
          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-2 rounded-[var(--jh-radius-md)] bg-white px-3 py-1.5">
              <Image src="/images/logo.png" alt="JadHor OS" width={26} height={26} className="h-[26px] w-[26px] object-contain" />
              <span className="font-bold tracking-[-0.02em] text-[var(--jh-gray-900)]">JadHor OS</span>
            </div>
            <p className="mt-3.5 text-[13px] text-[var(--jh-gray-500)]">
              แพลตฟอร์มบริหารจัดการหอพักยุคใหม่
              <br />© 2026 JadHor OS. All rights reserved.
            </p>
          </div>
          <div className="flex gap-7 text-sm">
            <Link href="/terms" className="transition-colors hover:text-white">เงื่อนไขการใช้งาน</Link>
            <Link href="/privacy" className="transition-colors hover:text-white">นโยบายความเป็นส่วนตัว</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
