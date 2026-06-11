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
          <Link href="/" className="flex items-center gap-2.5 text-[18px] font-bold tracking-[-0.02em]">
            <Image src="/images/logo.png" alt="JadHor OS" width={30} height={30} className="h-[30px] w-[30px] object-contain" />
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
              src="/images/mascot-hero.png"
              alt="มาสคอต JadHor"
              width={1146}
              height={888}
              priority
              className="mx-auto w-64 drop-shadow-[0_20px_44px_rgba(0,0,0,0.12)] sm:w-80 md:w-[420px]"
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
        <section className="overflow-hidden px-6 py-24">
          <div className="mx-auto grid max-w-[1120px] items-center gap-14 md:grid-cols-2">
            {/* Phone mockup (CSS only) */}
            <div className="flex justify-center md:justify-start">
              <div className="relative w-[290px]">
                {/* glow behind phone */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -inset-6 -z-10 opacity-60 blur-[50px]"
                  style={{
                    background:
                      "radial-gradient(50% 50% at 50% 35%, rgba(0,122,255,.30), transparent 70%), radial-gradient(45% 45% at 60% 80%, rgba(52,199,89,.28), transparent 72%)",
                  }}
                />
                {/* phone frame */}
                <div className="rounded-[44px] border-[10px] border-[var(--jh-gray-900)] bg-[var(--jh-gray-900)] shadow-[var(--jh-shadow-lg)]">
                  <div className="overflow-hidden rounded-[34px] bg-[#8ab4e8]">
                    {/* LINE chat header */}
                    <div className="flex items-center gap-2.5 bg-[var(--jh-gray-900)] px-4 py-3 text-white">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-[15px]">🏠</div>
                      <div className="leading-tight">
                        <div className="text-[13px] font-semibold">JadHor แจ้งบิล</div>
                        <div className="text-[10px] text-white/60">ออนไลน์</div>
                      </div>
                    </div>
                    {/* chat body */}
                    <div className="space-y-2 px-3 py-4">
                      <div className="ml-1 max-w-[88%] rounded-2xl rounded-tl-md bg-white px-3.5 py-3 text-[11px] leading-[1.55] text-[var(--jh-ink)] shadow-sm">
                        <div className="font-bold">🧾 ใบแจ้งหนี้ค่าเช่า — อนา เพลส</div>
                        <div className="text-[var(--jh-ink-secondary)]">สวัสดีคุณลัดดาวัลย์ 🙏</div>
                        <div className="my-1.5 border-t border-dashed border-black/10" />
                        <div>🏠 อนา เพลส</div>
                        <div>🚪 ห้อง 001 · ประจำเดือน 6/2569</div>
                        <div className="my-1.5 border-t border-dashed border-black/10" />
                        <div>• ค่าเช่าห้อง: ฿3,500</div>
                        <div>• ค่าน้ำ (36 หน่วย): ฿612</div>
                        <div>• ค่าไฟ (149.9 หน่วย): ฿1,049.3</div>
                        <div className="my-1.5 border-t border-dashed border-black/10" />
                        <div className="font-bold text-[var(--jh-ink)]">💰 ยอดรวม: ฿5,161.3</div>
                        <div className="text-[var(--jh-ink-secondary)]">📅 ครบกำหนด: 5 ก.ค. 2569</div>
                      </div>
                      <div className="ml-1 max-w-[88%] rounded-2xl rounded-tl-md bg-[var(--jh-blue)] px-3.5 py-2.5 text-[11px] font-semibold text-white shadow-sm">
                        👉 แตะเพื่อชำระเงินและแนบสลิป
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Text + checklist */}
            <div>
              <h2 className="text-[32px] font-semibold leading-[1.12] tracking-[-0.02em] md:text-[42px]">
                เพียงแค่..ออกบิล
                <br />
                ที่เหลือส่งเข้า LINE ให้เอง
              </h2>
              <p className="mt-4 text-[17px] leading-[1.6] text-[var(--jh-ink-secondary)]">
                ลูกบ้านไม่ต้องโหลดแอปอะไรเพิ่ม รับทุกอย่างผ่าน LINE ที่ใช้อยู่ทุกวัน
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
                    className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[var(--jh-blue)] text-sm font-semibold text-white shadow-[var(--jh-shadow-sm)] transition-all hover:bg-[var(--jh-blue-dark)] active:scale-[0.99]"
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
