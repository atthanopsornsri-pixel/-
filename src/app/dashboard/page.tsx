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

type Tone = "blue" | "green" | "orange" | "indigo" | "purple" | "red";

const TONES: Record<Tone, { tint: string; color: string }> = {
  blue: { tint: "var(--jh-blue-tint)", color: "var(--jh-blue)" },
  green: { tint: "var(--jh-green-tint)", color: "var(--jh-green-ink)" },
  orange: { tint: "var(--jh-orange-tint)", color: "var(--jh-orange-ink)" },
  indigo: { tint: "var(--jh-indigo-tint)", color: "var(--jh-indigo)" },
  purple: { tint: "var(--jh-purple-tint)", color: "var(--jh-purple)" },
  red: { tint: "var(--jh-red-tint)", color: "var(--jh-red)" },
};

function StatCard({
  icon: Icon,
  tone,
  label,
  value,
  sublabel,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: string | number;
  sublabel: string;
}) {
  const t = TONES[tone];
  return (
    <div className="rounded-[var(--jh-radius-2xl)] border border-black/[0.06] bg-white p-6 shadow-[var(--jh-shadow-card)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[var(--jh-shadow-md)]">
      <div
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-[var(--jh-radius-md)]"
        style={{ background: t.tint, color: t.color }}
      >
        <Icon className="h-[22px] w-[22px]" strokeWidth={1.75} />
      </div>
      <div className="text-[13px] font-medium text-[var(--jh-ink-secondary)]">{label}</div>
      <div className="mt-1.5 text-[34px] font-semibold tracking-[-0.02em] tabular-nums leading-none text-[var(--jh-ink)]">
        {value}
      </div>
      <div className="mt-2 text-xs text-[var(--jh-ink-tertiary)]">{sublabel}</div>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

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
          <StatCard icon={Users} tone="blue" label="เจ้าของหอพักทั้งหมด" value={totalOwners} sublabel="บัญชีผู้ให้บริการในระบบ" />
          <StatCard icon={Building2} tone="green" label="หอพักในระบบ" value={totalProperties} sublabel="สถานที่ให้บริการทั้งหมด" />
          <StatCard icon={Wallet} tone="indigo" label="รายได้แพลตฟอร์ม (SaaS)" value={`฿${totalRevenue.toLocaleString()}`} sublabel="ยอดชำระแล้วรวม" />
          <StatCard icon={Ticket} tone="orange" label="Invite Code รอใช้งาน" value={pendingInvites} sublabel="โค้ดที่ยังไม่ถูกเปิดใช้" />
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
  };

  if (role === "OWNER") {
    const result = await getDashboardMetrics();
    if (result.success && result.data) {
      metrics = result.data;
    }
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
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.02em] text-[var(--jh-ink)] md:text-[32px]">
            ภาพรวมระบบ
          </h1>
          <p className="mt-2 text-sm text-[var(--jh-ink-secondary)] md:text-[15px]">
            ยินดีต้อนรับกลับมา, ขอให้วันนี้เป็นวันที่ดีในการบริหารจัดการ
          </p>
        </div>
        {role === "OWNER" && (
          <Link href="/dashboard/properties">
            <Button className="rounded-full bg-[var(--jh-blue)] px-6 font-semibold text-white shadow-[var(--jh-shadow-sm)] transition-all hover:bg-[var(--jh-blue-dark)] hover:-translate-y-0.5">
              + เพิ่มหอพักใหม่
            </Button>
          </Link>
        )}
      </div>

      {role === "OWNER" ? (
        <>
          {/* Summary metric cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Building2} tone="blue" label="อพาร์ตเม้นท์ของคุณ" value={metrics.totalProperties} sublabel="สถานที่ทั้งหมดในระบบ" />
            <StatCard icon={BedDouble} tone="green" label="อัตราการเข้าพัก" value={`${metrics.occupancyRate}%`} sublabel={`${metrics.occupiedRooms} จากทั้งหมด ${metrics.totalRooms} ห้อง`} />
            <StatCard icon={Clock} tone="orange" label="หนี้ค้างชำระ (เดือนนี้)" value={formatIncome(metrics.outstandingDebt)} sublabel="กำลังรอการชำระเงิน" />
            <StatCard icon={Wallet} tone="indigo" label="รายรับเดือนนี้ (ประเมิน)" value={formatIncome(metrics.totalRevenue)} sublabel="จากค่าเช่าและบริการ" />
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="rounded-[var(--jh-radius-2xl)] border border-black/[0.06] bg-white p-8 shadow-[var(--jh-shadow-card)]">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-[var(--jh-radius-md)] bg-[var(--jh-blue-tint)] text-[var(--jh-blue)]">
                <Settings2 className="h-[22px] w-[22px]" strokeWidth={1.75} />
              </div>
              <h2 className="text-lg font-semibold text-[var(--jh-ink)]">เริ่มต้นการตั้งค่าระบบ</h2>
              <p className="mt-2 mb-6 text-sm leading-relaxed text-[var(--jh-ink-secondary)]">
                สร้างอพาร์ตเม้นท์ของคุณ เพิ่มห้องพัก และรับผู้เช่าใหม่เข้าสู่ระบบ เพื่อเริ่มต้นการบริหารจัดการที่มีประสิทธิภาพ
              </p>
              <div className="flex gap-3">
                <Link
                  href="/dashboard/rooms"
                  className="rounded-full bg-[var(--jh-blue-tint)] px-4 py-2 text-sm font-semibold text-[var(--jh-blue)] transition-colors hover:bg-[#dbeafe]"
                >
                  จัดการห้องพัก →
                </Link>
                <Link
                  href="/dashboard/tenants"
                  className="rounded-full bg-[var(--jh-surface)] px-4 py-2 text-sm font-semibold text-[var(--jh-ink-secondary)] transition-colors hover:bg-[var(--jh-surface-hover)]"
                >
                  ดูรายชื่อผู้เช่า
                </Link>
              </div>
            </div>

            <div className="rounded-[var(--jh-radius-2xl)] border border-black/[0.06] bg-white p-8 shadow-[var(--jh-shadow-card)]">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-[var(--jh-radius-md)] bg-[var(--jh-green-tint)] text-[var(--jh-green-ink)]">
                <Receipt className="h-[22px] w-[22px]" strokeWidth={1.75} />
              </div>
              <h2 className="text-lg font-semibold text-[var(--jh-ink)]">ออกบิลอัตโนมัติ</h2>
              <p className="mt-2 mb-6 text-sm leading-relaxed text-[var(--jh-ink-secondary)]">
                ระบบจัดการบิลให้ง่ายขึ้น คุณสามารถกดออกบิลรายเดือนส่งให้ผู้เช่า หรือติดตามสถานะการชำระได้ทันที
              </p>
              <Link
                href="/dashboard/billing"
                className="inline-block rounded-full bg-[var(--jh-green-tint)] px-4 py-2 text-sm font-semibold text-[var(--jh-green-ink)] transition-colors hover:bg-[#d5f3e1]"
              >
                ออกบิลเดือนนี้ →
              </Link>
            </div>
          </div>
        </>
      ) : (
        /* Tenant dashboard */
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="rounded-[var(--jh-radius-2xl)] border border-black/[0.06] bg-white p-8 shadow-[var(--jh-shadow-card)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[var(--jh-shadow-md)]">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-[var(--jh-radius-md)] bg-[var(--jh-indigo-tint)] text-[var(--jh-indigo)]">
              <FileText className="h-[22px] w-[22px]" strokeWidth={1.75} />
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

          <div className="rounded-[var(--jh-radius-2xl)] border border-black/[0.06] bg-white p-8 shadow-[var(--jh-shadow-card)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[var(--jh-shadow-md)]">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-[var(--jh-radius-md)] bg-[var(--jh-orange-tint)] text-[var(--jh-orange-ink)]">
              <Wrench className="h-[22px] w-[22px]" strokeWidth={1.75} />
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
