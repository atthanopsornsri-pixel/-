import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getDashboardMetrics } from "@/app/actions/dashboard";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
  Users,
  Building2,
  Wallet,
  Ticket,
  BedDouble,
  Clock,
  Settings2,
  Receipt,
  FileText,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { CountUpValue } from "@/components/count-up-value";
import { CircularProgress } from "@/components/circular-progress";
import { PropertySwitcher } from "@/components/PropertySwitcher";

type Tone = "blue" | "green" | "orange" | "indigo" | "purple" | "red";

// solid = สีสดสำหรับชิปไอคอน, grad = ไล่เฉดอ่อนๆ บนพื้นการ์ด, ink = สีตัวเลข
const TONES: Record<Tone, { solid: string; gradFrom: string; gradTo: string; ink: string }> = {
  blue: { solid: "#34508c", gradFrom: "#f3f5fa", gradTo: "#e4eaf5", ink: "var(--jh-blue)" },
  green: { solid: "#34c759", gradFrom: "#f3fcf6", gradTo: "#e0f7e9", ink: "var(--jh-green-ink)" },
  orange: { solid: "#d4a548", gradFrom: "#fdf8ee", gradTo: "#f6ecd6", ink: "var(--jh-orange-ink)" },
  indigo: { solid: "#5856d6", gradFrom: "#f6f6ff", gradTo: "#e8e7fb", ink: "var(--jh-indigo)" },
  purple: { solid: "#af52de", gradFrom: "#fbf5fe", gradTo: "#f3e3fb", ink: "var(--jh-purple)" },
  red: { solid: "#ff3b30", gradFrom: "#fff5f4", gradTo: "#ffe5e3", ink: "var(--jh-red)" },
};

function StatCard({
  icon: Icon,
  tone,
  label,
  value,
  sublabel,
  delay = 0,
  rightSlot,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: React.ReactNode;
  sublabel: string;
  delay?: number;
  rightSlot?: React.ReactNode;
}) {
  const t = TONES[tone];
  return (
    <div
      className="group relative overflow-hidden rounded-[var(--jh-radius-2xl)] border border-white/60 p-6 shadow-[var(--jh-shadow-card)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[var(--jh-shadow-md)] animate-in fade-in slide-in-from-bottom-4 [animation-fill-mode:both]"
      style={{
        background: `linear-gradient(150deg, ${t.gradFrom} 0%, ${t.gradTo} 100%)`,
        animationDelay: `${delay}ms`,
        animationDuration: "500ms",
      }}
    >
      {/* Right decoration: progress ring หรือ watermark icon */}
      {rightSlot ? (
        <div className="absolute right-5 top-1/2 -translate-y-1/2">{rightSlot}</div>
      ) : (
        <div
          className="pointer-events-none absolute -bottom-5 -right-5 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6"
          style={{ color: t.solid, opacity: 0.07 }}
        >
          <Icon className="h-32 w-32" strokeWidth={1} />
        </div>
      )}

      <div
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-[var(--jh-radius-md)] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
        style={{ background: t.solid, color: "#fff", boxShadow: `0 10px 22px -8px ${t.solid}` }}
      >
        <Icon className="h-[22px] w-[22px]" strokeWidth={2} />
      </div>
      <div className="text-[13px] font-medium text-[var(--jh-ink-secondary)]">{label}</div>
      <div
        className="mt-1.5 text-[34px] font-bold tracking-[-0.02em] tabular-nums leading-none"
        style={{ color: t.ink }}
      >
        {value}
      </div>
      <div className="mt-2 text-xs text-[var(--jh-ink-tertiary)]">{sublabel}</div>
    </div>
  );
}

export default async function DashboardPage(props: {
  searchParams?: Promise<any> | any;
}) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  const rawSearchParams = props.searchParams ? (typeof props.searchParams.then === 'function' ? await props.searchParams : props.searchParams) : {};
  const propertyId = rawSearchParams?.propertyId || "";
  const role = session.user.role;

  // ==========================================
  // 🔴 โซนของ ADMIN (Platform Manager)
  // ==========================================
  if (role === "ADMIN") {
    const totalOwners = await prisma.user.count({ where: { role: "OWNER" } });
    const totalProperties = await prisma.property.count({ where: { isDeleted: false } });

    const revenueAgg = await prisma.invoice.aggregate({
      where: { status: "PAID" },
      _sum: { totalAmount: true },
    });
    const totalRevenue = revenueAgg._sum.totalAmount || 0;

    const pendingInvites = await prisma.registrationCode.count({ where: { isUsed: false } });

    return (
      <div className="mx-auto max-w-6xl space-y-8 duration-500 ease-out animate-in fade-in slide-in-from-bottom-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.02em] text-[var(--jh-ink)] md:text-[32px]">
            ภาพรวมระบบ (Super Admin)
          </h1>
          <p className="mt-2 text-sm text-[var(--jh-ink-secondary)] md:text-[15px]">
            ยินดีต้อนรับกลับมา, ตรวจสอบสถานะการทำงานของแพลตฟอร์ม JadHor OS
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Users} tone="blue" label="เจ้าของหอพักทั้งหมด" value={<CountUpValue target={totalOwners} />} sublabel="บัญชีผู้ให้บริการในระบบ" delay={0} />
          <StatCard icon={Building2} tone="green" label="หอพักในระบบ" value={<CountUpValue target={totalProperties} />} sublabel="สถานที่ให้บริการทั้งหมด" delay={80} />
          <StatCard icon={Wallet} tone="indigo" label="รายได้แพลตฟอร์ม (SaaS)" value={<CountUpValue target={totalRevenue} prefix="฿" />} sublabel="ยอดชำระแล้วรวม" delay={160} />
          <StatCard icon={Ticket} tone="orange" label="Invite Code รอใช้งาน" value={<CountUpValue target={pendingInvites} />} sublabel="โค้ดที่ยังไม่ถูกเปิดใช้" delay={240} />
        </div>
      </div>
    );
  }

  // ==========================================
  // 🔵 โซนของ OWNER (Property Owner) และ TENANT
  // ==========================================
  let metrics = {
    totalProperties: 0,
    totalRooms: 0,
    occupiedRooms: 0,
    occupancyRate: 0,
    outstandingDebt: 0,
    totalRevenue: 0,
    saasExpenseHidden: false,
  };

  let ownerProperties: any[] = [];

  if (role === "OWNER") {
    const result = await getDashboardMetrics(undefined, undefined, propertyId || undefined);
    if (result.success && result.data) {
      metrics = result.data as any;
    }
    ownerProperties = await prisma.property.findMany({
      where: { ownerId: session.user.id, isDeleted: false },
      select: { id: true, name: true }
    });
  }

  const formatIncome = (amount: number) => {
    if (amount >= 10000) {
      return `฿${(amount / 1000).toFixed(1)}K`;
    }
    return `฿${amount.toLocaleString()}`;
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 duration-500 ease-out animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-5">
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.02em] text-[var(--jh-ink)] md:text-[32px]">
              {role === "TENANT" ? "หน้าหลัก" : "ภาพรวมระบบ"}
            </h1>
            <p className="mt-2 text-sm text-[var(--jh-ink-secondary)] md:text-[15px]">
              {role === "TENANT"
                ? "ยินดีต้อนรับกลับมา! ดูบิล แจ้งซ่อม และจัดการห้องพักของคุณได้ที่นี่"
                : "ยินดีต้อนรับกลับมา, ขอให้วันนี้เป็นวันที่ดีในการบริหารจัดการ"}
            </p>
          </div>
        </div>
        {role === "OWNER" && (
          <div className="flex flex-wrap items-center gap-3">
            <PropertySwitcher properties={ownerProperties} currentValue={propertyId} />
            <Link href="/dashboard/properties">
              <Button className="rounded-full bg-[var(--jh-blue)] px-6 font-semibold text-white shadow-[var(--jh-shadow-sm)] transition-all hover:bg-[var(--jh-blue-dark)] hover:-translate-y-0.5 cursor-pointer">
                + เพิ่มหอพักใหม่
              </Button>
            </Link>
          </div>
        )}
      </div>

      {role === "OWNER" ? (
        <>
          {/* Summary metric cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Building2} tone="blue" label="อพาร์ตเม้นท์ของคุณ" value={<CountUpValue target={metrics.totalProperties} />} sublabel="สถานที่ทั้งหมดในระบบ" delay={0} />
            <StatCard
              icon={BedDouble} tone="green"
              label="อัตราการเข้าพัก"
              value={<CountUpValue target={metrics.occupancyRate} suffix="%" decimals={2} />}
              sublabel={`${metrics.occupiedRooms} จากทั้งหมด ${metrics.totalRooms} ห้อง`}
              delay={80}
              rightSlot={<CircularProgress value={metrics.occupancyRate} color="#34c759" />}
            />
            <StatCard icon={Clock} tone="orange" label="หนี้ค้างชำระ (เดือนนี้)" value={formatIncome(metrics.outstandingDebt)} sublabel="กำลังรอการชำระเงิน" delay={160} />
            <StatCard icon={Wallet} tone="indigo" label="รายรับเดือนนี้ (ประเมิน)" value={formatIncome(metrics.totalRevenue)} sublabel="จากค่าเช่าและบริการ" delay={240} />
          </div>

          {/* Cashflow Breakdown Section */}
          <div
            className="rounded-[var(--jh-radius-2xl)] border border-white/60 p-6 md:p-8 shadow-[var(--jh-shadow-card)] animate-in fade-in duration-500 delay-300"
            style={{ background: "linear-gradient(150deg, #fdf8ee 0%, #f6ecd6 100%)" }}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-[var(--jh-radius-md)]"
                    style={{ background: "#d4a548", color: "#fff", boxShadow: "0 8px 18px -6px #d4a548" }}
                  >
                    <Wallet className="h-4.5 w-4.5" strokeWidth={2} />
                  </div>
                  <h2 className="text-lg font-bold text-[var(--jh-ink)]">สรุปกระแสเงินสด (ประมาณการประจำเดือน)</h2>
                </div>
                <p className="text-xs text-[var(--jh-ink-tertiary)] max-w-xl">
                  * รายจ่ายประมาณการคำนวณจากค่าน้ำ/ค่าไฟต้นทุนจ่ายหลวง (ประมาณ 70% ค่าน้ำ และ 60% ค่าไฟ ของบิลผู้เช่าที่ชำระแล้ว){metrics.saasExpenseHidden ? " (ระบบไม่นำค่าบริการรายเดือน SaaS มารวมคำนวณ เนื่องจากกรองแบบรายหอพัก)" : " ร่วมกับค่าบริการรายเดือน SaaS ที่จ่ายแล้วจริงในเดือนนี้"}
                </p>
              </div>
              
              <div className="text-right">
                <div className="text-xs font-semibold text-[var(--jh-ink-secondary)]">กำไรสุทธิประมาณการ (เดือนนี้)</div>
                <div className="text-3xl font-extrabold text-[var(--jh-orange-ink)] mt-1">
                  {formatIncome((metrics as any).estNetProfit || 0)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t border-white/40">
              <div className="bg-white/50 border border-white/80 rounded-2xl p-4">
                <span className="text-xs font-semibold text-[var(--jh-ink-secondary)]">รายรับจริง (ที่ชำระแล้ว)</span>
                <div className="text-xl font-bold text-[var(--jh-green-ink)] mt-1">
                  + {formatIncome(metrics.totalRevenue)}
                </div>
                <p className="text-[11px] text-[var(--jh-ink-tertiary)] mt-1">จากบิลค่าเช่า/บริการที่ผู้เช่าจ่ายแล้ว</p>
              </div>
              <div className="bg-white/50 border border-white/80 rounded-2xl p-4">
                <span className="text-xs font-semibold text-[var(--jh-ink-secondary)]">รายจ่ายประมาณการรวม</span>
                <div className="text-xl font-bold text-[var(--jh-red)] mt-1">
                  - {formatIncome((metrics as any).totalEstExpenses || 0)}
                </div>
                <p className="text-[11px] text-[var(--jh-ink-tertiary)] mt-1">
                  {metrics.saasExpenseHidden ? "ค่าไฟหลวง + ค่าน้ำหลวง (ไม่รวมค่าฟี SaaS)" : "ค่าไฟหลวง + ค่าน้ำหลวง + SaaS Fee"}
                </p>
              </div>
              <div className="bg-white/50 border border-white/80 rounded-2xl p-4">
                <span className="text-xs font-semibold text-[var(--jh-ink-secondary)]">รายละเอียดรายจ่ายประมาณการ</span>
                <div className="text-xs text-[var(--jh-ink-secondary)] space-y-1.5 mt-2">
                  <div className="flex justify-between">
                    <span>⚡ ต้นทุนไฟ (60%):</span>
                    <span className="font-bold">฿{((metrics as any).estElectricCost || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>💧 ต้นทุนน้ำ (70%):</span>
                    <span className="font-bold">฿{((metrics as any).estWaterCost || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>🖥️ SaaS Platform Fee:</span>
                    {metrics.saasExpenseHidden ? (
                      <span className="font-bold text-slate-400 italic">ไม่รวม (ยอดส่วนกลาง)</span>
                    ) : (
                      <span className="font-bold">฿{((metrics as any).saasExpense || 0).toLocaleString()}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div
              className="group relative overflow-hidden rounded-[var(--jh-radius-2xl)] border border-white/60 p-8 shadow-[var(--jh-shadow-card)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[var(--jh-shadow-md)]"
              style={{ background: "linear-gradient(150deg, #f3f5fa 0%, #e4eaf5 100%)" }}
            >
              <div
                className="mb-5 flex h-12 w-12 items-center justify-center rounded-[var(--jh-radius-md)] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
                style={{ background: "#34508c", color: "#fff", boxShadow: "0 10px 22px -8px #34508c" }}
              >
                <Settings2 className="h-[22px] w-[22px]" strokeWidth={2} />
              </div>
              <h2 className="text-lg font-semibold text-[var(--jh-ink)]">เริ่มต้นการตั้งค่าระบบ</h2>
              <p className="mt-2 mb-6 text-sm leading-relaxed text-[var(--jh-ink-secondary)]">
                สร้างอพาร์ตเม้นท์ของคุณ เพิ่มห้องพัก และรับผู้เช่าใหม่เข้าสู่ระบบ เพื่อเริ่มต้นการบริหารจัดการที่มีประสิทธิภาพ
              </p>
              <div className="flex gap-3">
                <Link
                  href="/dashboard/rooms"
                  className="rounded-full bg-[var(--jh-blue)] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_-6px_#34508c] transition-all hover:bg-[var(--jh-blue-dark)] hover:-translate-y-0.5"
                >
                  จัดการห้องพัก →
                </Link>
                <Link
                  href="/dashboard/tenants"
                  className="rounded-full bg-white/70 px-4 py-2 text-sm font-semibold text-[var(--jh-ink-secondary)] transition-colors hover:bg-white"
                >
                  ดูรายชื่อผู้เช่า
                </Link>
              </div>
            </div>

            <div
              className="group relative overflow-hidden rounded-[var(--jh-radius-2xl)] border border-white/60 p-8 shadow-[var(--jh-shadow-card)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[var(--jh-shadow-md)]"
              style={{ background: "linear-gradient(150deg, #f3fcf6 0%, #e0f7e9 100%)" }}
            >
              <div
                className="mb-5 flex h-12 w-12 items-center justify-center rounded-[var(--jh-radius-md)] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
                style={{ background: "#34c759", color: "#fff", boxShadow: "0 10px 22px -8px #34c759" }}
              >
                <Receipt className="h-[22px] w-[22px]" strokeWidth={2} />
              </div>
              <h2 className="text-lg font-semibold text-[var(--jh-ink)]">ออกบิลอัตโนมัติ</h2>
              <p className="mt-2 mb-6 text-sm leading-relaxed text-[var(--jh-ink-secondary)]">
                ระบบจัดการบิลให้ง่ายขึ้น คุณสามารถกดออกบิลรายเดือนส่งให้ผู้เช่า หรือติดตามสถานะการชำระได้ทันที
              </p>
              <Link
                href="/dashboard/billing"
                className="inline-block rounded-full bg-[#34c759] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_-6px_#34c759] transition-all hover:brightness-105 hover:-translate-y-0.5"
              >
                ออกบิลเดือนนี้ →
              </Link>
            </div>
          </div>
        </>
      ) : (
        /* Tenant dashboard */
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div
            className="group rounded-[var(--jh-radius-2xl)] border border-white/60 p-8 shadow-[var(--jh-shadow-card)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[var(--jh-shadow-md)]"
            style={{ background: "linear-gradient(150deg, #f6f6ff 0%, #e8e7fb 100%)" }}
          >
            <div
              className="mb-5 flex h-12 w-12 items-center justify-center rounded-[var(--jh-radius-md)] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
              style={{ background: "#5856d6", color: "#fff", boxShadow: "0 10px 22px -8px #5856d6" }}
            >
              <FileText className="h-[22px] w-[22px]" strokeWidth={2} />
            </div>
            <h2 className="text-xl font-semibold text-[var(--jh-ink)]">บิลค่าเช่าของฉัน</h2>
            <p className="mt-2 mb-6 text-sm leading-relaxed text-[var(--jh-ink-secondary)]">
              ดูรายละเอียดค่าใช้จ่ายประจำเดือน และชำระเงินผ่าน QR Code ได้อย่างง่ายดาย
            </p>
            <Link href="/dashboard/my-bills">
              <Button className="rounded-full bg-[var(--jh-indigo)] px-6 font-semibold text-white shadow-[var(--jh-shadow-sm)] transition-all hover:opacity-90 hover:-translate-y-0.5">
                จ่ายบิล / ดูใบเสร็จ →
              </Button>
            </Link>
          </div>

          <div
            className="group rounded-[var(--jh-radius-2xl)] border border-white/60 p-8 shadow-[var(--jh-shadow-card)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[var(--jh-shadow-md)]"
            style={{ background: "linear-gradient(150deg, #fdf8ee 0%, #f6ecd6 100%)" }}
          >
            <div
              className="mb-5 flex h-12 w-12 items-center justify-center rounded-[var(--jh-radius-md)] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
              style={{ background: "#d4a548", color: "#fff", boxShadow: "0 10px 22px -8px #d4a548" }}
            >
              <Wrench className="h-[22px] w-[22px]" strokeWidth={2} />
            </div>
            <h2 className="text-xl font-semibold text-[var(--jh-ink)]">บริการแจ้งซ่อม</h2>
            <p className="mt-2 mb-6 text-sm leading-relaxed text-[var(--jh-ink-secondary)]">
              พบปัญหาการใช้งานภายในห้อง? แจ้งให้ช่างนิติบุคคลเข้าตรวจสอบและแก้ไขได้ทันที
            </p>
            <Link href="/dashboard/maintenance">
              <Button className="rounded-full bg-[var(--jh-orange)] px-6 font-semibold text-white shadow-[var(--jh-shadow-sm)] transition-all hover:opacity-90 hover:-translate-y-0.5">
                แจ้งซ่อมด่วน →
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
