import { getRevenueAnalytics, getDashboardMetrics } from "@/app/actions/dashboard";
import { TrendingUp, TrendingDown, Minus, BarChart3, Wallet, Calendar, Sparkles } from "lucide-react";

// หน้านี้ต้องอ่าน session (headers) เสมอ — ปิด static prerender
export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const [analyticsResult, metricsResult] = await Promise.all([
    getRevenueAnalytics(),
    getDashboardMetrics(),
  ]);

  if (!analyticsResult.success) {
    return (
      <div className="text-center py-24 text-slate-400">ไม่สามารถโหลดข้อมูลได้</div>
    );
  }

  const { data, prediction, totalRevenue6M, avgMonthly, trendPct } = analyticsResult;
  const metrics = metricsResult.success ? metricsResult.data! : null;

  const TrendIcon = trendPct > 3 ? TrendingUp : trendPct < -3 ? TrendingDown : Minus;
  const trendColor = trendPct > 3 ? "text-[var(--jh-green-ink)]" : trendPct < -3 ? "text-[var(--jh-red)]" : "text-[var(--jh-ink-tertiary)]";

  const fmt = (n: number) =>
    n >= 1_000_000
      ? `฿${(n / 1_000_000).toFixed(1)}M`
      : n >= 10_000
      ? `฿${(n / 1_000).toFixed(1)}K`
      : `฿${n.toLocaleString()}`;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--jh-radius-md)]"
          style={{ background: "#5856d6", color: "#fff", boxShadow: "0 10px 22px -8px #5856d6" }}
        >
          <BarChart3 className="h-[22px] w-[22px]" strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-[var(--jh-ink)]">วิเคราะห์รายได้</h1>
          <p className="text-[15px] text-[var(--jh-ink-secondary)] mt-0.5">สรุปรายได้ย้อนหลัง 6 เดือน พร้อมคาดการณ์เดือนถัดไป</p>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* รายได้รวม 6 เดือน */}
        <div
          className="group rounded-[var(--jh-radius-2xl)] border border-white/60 p-6 shadow-[var(--jh-shadow-card)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--jh-shadow-md)]"
          style={{ background: "linear-gradient(150deg, #f6f6ff 0%, #e8e7fb 100%)" }}
        >
          <div
            className="mb-4 flex h-11 w-11 items-center justify-center rounded-[var(--jh-radius-md)]"
            style={{ background: "#5856d6", color: "#fff", boxShadow: "0 10px 22px -8px #5856d6" }}
          >
            <Wallet className="h-5 w-5" strokeWidth={2} />
          </div>
          <div className="text-[13px] font-medium text-[var(--jh-ink-secondary)]">รายได้รวม 6 เดือน</div>
          <div className="mt-1.5 text-[28px] font-bold tabular-nums tracking-[-0.02em]" style={{ color: "var(--jh-indigo)" }}>
            {fmt(totalRevenue6M)}
          </div>
          <div className="mt-1 text-xs text-[var(--jh-ink-tertiary)]">ยอดชำระแล้วสะสม</div>
        </div>

        {/* เฉลี่ยต่อเดือน */}
        <div
          className="group rounded-[var(--jh-radius-2xl)] border border-white/60 p-6 shadow-[var(--jh-shadow-card)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--jh-shadow-md)]"
          style={{ background: "linear-gradient(150deg, #f4f9ff 0%, #e3f0ff 100%)" }}
        >
          <div
            className="mb-4 flex h-11 w-11 items-center justify-center rounded-[var(--jh-radius-md)]"
            style={{ background: "#007aff", color: "#fff", boxShadow: "0 10px 22px -8px #007aff" }}
          >
            <Calendar className="h-5 w-5" strokeWidth={2} />
          </div>
          <div className="text-[13px] font-medium text-[var(--jh-ink-secondary)]">เฉลี่ยต่อเดือน</div>
          <div className="mt-1.5 text-[28px] font-bold tabular-nums tracking-[-0.02em]" style={{ color: "var(--jh-blue)" }}>
            {fmt(avgMonthly)}
          </div>
          <div className={`mt-1 flex items-center gap-1 text-xs font-medium ${trendColor}`}>
            <TrendIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
            {trendPct > 0 ? `+${trendPct}%` : `${trendPct}%`} แนวโน้ม
          </div>
        </div>

        {/* คาดการณ์เดือนหน้า */}
        <div
          className="group rounded-[var(--jh-radius-2xl)] border border-white/60 p-6 shadow-[var(--jh-shadow-card)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--jh-shadow-md)]"
          style={{ background: "linear-gradient(150deg, #f3fcf6 0%, #e0f7e9 100%)" }}
        >
          <div
            className="mb-4 flex h-11 w-11 items-center justify-center rounded-[var(--jh-radius-md)]"
            style={{ background: "#34c759", color: "#fff", boxShadow: "0 10px 22px -8px #34c759" }}
          >
            <Sparkles className="h-5 w-5" strokeWidth={2} />
          </div>
          <div className="text-[13px] font-medium text-[var(--jh-ink-secondary)]">คาดการณ์เดือนหน้า</div>
          <div className="mt-1.5 text-[28px] font-bold tabular-nums tracking-[-0.02em]" style={{ color: "var(--jh-green-ink)" }}>
            {fmt(prediction)}
          </div>
          <div className="mt-1 text-xs text-[var(--jh-ink-tertiary)]">ประมาณการจากแนวโน้มย้อนหลัง</div>
        </div>
      </div>

      {/* ── Revenue Bar Chart ── */}
      <div className="rounded-[var(--jh-radius-2xl)] border border-black/[0.06] bg-white shadow-[var(--jh-shadow-card)] p-8">
        <h2 className="text-base font-semibold text-[var(--jh-ink)] mb-6">รายได้รายเดือน (ย้อนหลัง 6 เดือน)</h2>
        <div className="space-y-4">
          {data.map((d) => (
            <div key={`${d.year}-${d.month}`} className="flex items-center gap-4">
              {/* label */}
              <span className="w-14 text-xs font-semibold text-[var(--jh-ink-secondary)] text-right shrink-0">
                {d.label}
              </span>
              {/* bar track */}
              <div className="flex-1 h-8 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                <div
                  className="h-full rounded-full flex items-center justify-end pr-3 transition-all duration-700"
                  style={{
                    width: `${Math.max(d.pct, d.revenue > 0 ? 4 : 0)}%`,
                    background: d.pct >= 80
                      ? "linear-gradient(90deg, #5856d6, #007aff)"
                      : d.pct >= 50
                      ? "linear-gradient(90deg, #007aff, #34c759)"
                      : "linear-gradient(90deg, #34c759, #30d158)",
                  }}
                >
                  {d.pct >= 20 && (
                    <span className="text-[10px] font-bold text-white tabular-nums">
                      {fmt(d.revenue)}
                    </span>
                  )}
                </div>
              </div>
              {/* value (ถ้า bar แคบเกินไป) */}
              {d.pct < 20 && (
                <span className="w-24 text-xs font-bold tabular-nums text-[var(--jh-ink-secondary)] text-left shrink-0">
                  {d.revenue > 0 ? fmt(d.revenue) : "—"}
                </span>
              )}
              {/* outstanding badge */}
              {d.outstanding > 0 && (
                <span className="text-[10px] font-semibold text-[var(--jh-red)] bg-[var(--jh-red-tint)] px-2 py-0.5 rounded-full shrink-0">
                  ค้าง {fmt(d.outstanding)}
                </span>
              )}
            </div>
          ))}

          {/* Prediction bar */}
          <div className="flex items-center gap-4 pt-2 border-t border-dashed border-slate-200">
            <span className="w-14 text-xs font-semibold text-[var(--jh-green-ink)] text-right shrink-0">
              คาดการณ์
            </span>
            <div className="flex-1 h-8 bg-emerald-50 rounded-full overflow-hidden border border-emerald-100">
              <div
                className="h-full rounded-full flex items-center justify-end pr-3"
                style={{
                  width: `${Math.round((prediction / Math.max(...data.map(d => d.revenue), prediction, 1)) * 100)}%`,
                  background: "repeating-linear-gradient(45deg, #34c759 0px, #34c759 4px, #30d158 4px, #30d158 8px)",
                  opacity: 0.8,
                }}
              >
                <span className="text-[10px] font-bold text-white tabular-nums drop-shadow">
                  {fmt(prediction)}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-medium text-[var(--jh-green-ink)] shrink-0">✨ คาดการณ์</span>
          </div>
        </div>
      </div>

      {/* ── Occupancy + Outstanding ── */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Occupancy donut (CSS) */}
          <div className="rounded-[var(--jh-radius-2xl)] border border-black/[0.06] bg-white shadow-[var(--jh-shadow-card)] p-6">
            <h3 className="text-sm font-semibold text-[var(--jh-ink)] mb-4">อัตราการเข้าพัก</h3>
            <div className="flex items-center gap-6">
              {/* SVG donut */}
              <div className="relative w-20 h-20 shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f5f9" strokeWidth="3.5" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke="#34c759" strokeWidth="3.5"
                    strokeDasharray={`${metrics.occupancyRate} ${100 - metrics.occupancyRate}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold" style={{ color: "var(--jh-green-ink)" }}>
                    {metrics.occupancyRate.toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold" style={{ color: "var(--jh-green-ink)" }}>
                  {metrics.occupiedRooms}/{metrics.totalRooms}
                </div>
                <div className="text-xs text-[var(--jh-ink-tertiary)]">ห้องที่มีผู้เช่า</div>
                <div className="text-xs text-[var(--jh-ink-secondary)]">
                  ว่าง {metrics.totalRooms - metrics.occupiedRooms} ห้อง
                </div>
              </div>
            </div>
          </div>

          {/* Outstanding */}
          <div
            className="rounded-[var(--jh-radius-2xl)] border border-white/60 p-6 shadow-[var(--jh-shadow-card)]"
            style={{ background: "linear-gradient(150deg, #fff9f2 0%, #ffeed9 100%)" }}
          >
            <h3 className="text-sm font-semibold text-[var(--jh-ink)] mb-4">ยอดค้างชำระเดือนนี้</h3>
            <div className="text-3xl font-bold tabular-nums" style={{ color: "var(--jh-orange-ink)" }}>
              {fmt(metrics.outstandingDebt)}
            </div>
            <div className="text-xs text-[var(--jh-ink-tertiary)] mt-1">กำลังรอการชำระเงิน</div>
            <div className="mt-3 text-xs text-[var(--jh-orange-ink)] bg-orange-100/60 px-3 py-1.5 rounded-full inline-block font-medium">
              💡 ใช้ Smart Alert แจ้งเตือนผู้เช่าได้เลย
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
