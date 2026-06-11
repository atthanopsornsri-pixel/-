import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import Image from "next/image";
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

// solid = สีสดสำหรับชิปไอคอน, grad = ไล่เฉดอ่อนๆ บนพื้นการ์ด, ink = สีตัวเลข
const TONES: Record<Tone, { solid: string; gradFrom: string; gradTo: string; ink: string }> = {
  blue: { solid: "#007aff", gradFrom: "#f4f9ff", gradTo: "#e3f0ff", ink: "var(--jh-blue)" },
  green: { solid: "#34c759", gradFrom: "#f3fcf6", gradTo: "#e0f7e9", ink: "var(--jh-green-ink)" },
  orange: { solid: "#ff9500", gradFrom: "#fff9f2", gradTo: "#ffeed9", ink: "var(--jh-orange-ink)" },
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
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: string | number;
  sublabel: string;
}) {
  const t = TONES[tone];
  return (
    <div
      className="group rounded-[var(--jh-radius-2xl)] border border-white/60 p-6 shadow-[var(--jh-shadow-card)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[var(--jh-shadow-md)]"
      style={{ background: `linear-gradient(150deg, ${t.gradFrom} 0%, ${t.gradTo} 100%)` }}
    >
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
        <div className="flex items-center gap-5">
          {/* มาสคอตประจำ dashboard โผล่ข้างหัวข้อ */}
          <Image
            src={role === "TENANT" ? "/images/mascot/payment.png" : "/images/mascot/report.png"}
            alt="มาสคอต JadHor"
            width={1045}
            height={874}
            className="jh-float-soft hidden w-20 shrink-0 drop-shadow-[0_10px_24px_rgba(0,0,0,0.15)] lg:block"
          />
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
            <div
              className="group relative overflow-hidden rounded-[var(--jh-radius-2xl)] border border-white/60 p-8 shadow-[var(--jh-shadow-card)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[var(--jh-shadow-md)]"
              style={{ background: "linear-gradient(150deg, #f4f9ff 0%, #e3f0ff 100%)" }}
            >
              {/* มาสคอตถือ checklist มุมขวาล่าง */}
              <Image
                src="/images/mascot/invoice.png"
                alt=""
                width={924}
                height={808}
                aria-hidden
                className="jh-float-soft pointer-events-none absolute -bottom-3 right-3 w-24 opacity-80 drop-shadow-[0_8px_20px_rgba(0,0,0,0.12)]"
              />
              <div
                className="mb-5 flex h-12 w-12 items-center justify-center rounded-[var(--jh-radius-md)] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
                style={{ background: "#007aff", color: "#fff", boxShadow: "0 10px 22px -8px #007aff" }}
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
                  className="rounded-full bg-[var(--jh-blue)] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_-6px_#007aff] transition-all hover:bg-[var(--jh-blue-dark)] hover:-translate-y-0.5"
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
              {/* มาสคอตถือมือถือชำระเงิน มุมขวาล่าง */}
              <Image
                src="/images/mascot/payment.png"
                alt=""
                width={935}
                height={780}
                aria-hidden
                className="jh-float-soft pointer-events-none absolute -bottom-2 right-2 w-24 opacity-80 drop-shadow-[0_8px_20px_rgba(0,0,0,0.12)]"
              />
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
            style={{ background: "linear-gradient(150deg, #fff9f2 0%, #ffeed9 100%)" }}
          >
            <div
              className="mb-5 flex h-12 w-12 items-center justify-center rounded-[var(--jh-radius-md)] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
              style={{ background: "#ff9500", color: "#fff", boxShadow: "0 10px 22px -8px #ff9500" }}
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
