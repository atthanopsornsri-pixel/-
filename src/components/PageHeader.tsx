import { type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";

export type HeaderTone = "blue" | "green" | "orange" | "indigo" | "purple" | "red" | "cyan";

const TONE_SOLID: Record<HeaderTone, string> = {
  blue: "#007aff",
  green: "#34c759",
  orange: "#ff9500",
  indigo: "#5856d6",
  purple: "#af52de",
  red: "#ff3b30",
  cyan: "#30b0c7",
};

/**
 * หัวข้อหน้ามาตรฐาน (สไตล์ Vibrant Tonal Cards)
 * ไอคอนสีสด + เงาสี + ชื่อหน้า + คำอธิบาย + ปุ่ม action (ถ้ามี)
 * ดู AGENTS.md หัวข้อ "Visual / Design Style"
 */
export function PageHeader({
  icon: Icon,
  tone = "blue",
  title,
  subtitle,
  action,
}: {
  icon: LucideIcon;
  tone?: HeaderTone;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  const solid = TONE_SOLID[tone];
  return (
    <div className="mb-8 flex flex-col gap-4 duration-500 ease-out animate-in fade-in slide-in-from-bottom-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--jh-radius-md)]"
          style={{ background: solid, color: "#fff", boxShadow: `0 10px 22px -8px ${solid}` }}
        >
          <Icon className="h-[22px] w-[22px]" strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-[var(--jh-ink)] md:text-[28px]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 text-sm text-[var(--jh-ink-secondary)] md:text-[15px]">{subtitle}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}
