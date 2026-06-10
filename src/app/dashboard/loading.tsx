/**
 * Dashboard Global Loading Skeleton
 * แสดงขณะ Next.js โหลด Server Component pages ใหม่
 * ดีกว่า spinner เพราะทำให้ layout ไม่กระตุก (no layout shift)
 */
export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-pulse">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-[var(--jh-radius-md)] bg-slate-100" />
        <div className="space-y-2">
          <div className="h-7 bg-slate-100 rounded-lg w-48" />
          <div className="h-4 bg-slate-100 rounded w-72" />
        </div>
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-28 bg-slate-100 rounded-[var(--jh-radius-2xl)]"
          />
        ))}
      </div>

      {/* Main content block */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 h-64 bg-slate-100 rounded-[var(--jh-radius-2xl)]" />
        <div className="h-64 bg-slate-100 rounded-[var(--jh-radius-2xl)]" />
      </div>

      {/* Table / list block */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-slate-100 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
