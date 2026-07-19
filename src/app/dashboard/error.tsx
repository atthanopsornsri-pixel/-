"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Error boundary ระดับ segment ของ /dashboard/*
 * ต่างจาก global-error.tsx: อันนี้แทนที่เฉพาะเนื้อหาหน้า (main) — sidebar/header
 * ยังอยู่ครบ ทำให้ error หน้าหนึ่งไม่ลากทั้ง dashboard ขาวไปด้วย
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md rounded-2xl border border-white/60 bg-white p-8 text-center shadow-[var(--jh-shadow-card)]">
        <div className="mb-4 text-5xl">⚠️</div>
        <h1 className="mb-2 text-xl font-bold text-[var(--jh-ink)]">หน้านี้เกิดข้อผิดพลาด</h1>
        <p className="mb-6 text-sm text-[var(--jh-ink-secondary)]">
          ระบบได้รับแจ้งปัญหาแล้ว — เมนูอื่นยังใช้งานได้ตามปกติ กรุณาลองใหม่อีกครั้ง
        </p>
        <button
          onClick={reset}
          className="rounded-full bg-[var(--jh-blue)] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_-6px_#34508c] transition hover:-translate-y-0.5 hover:opacity-90"
        >
          ลองใหม่อีกครั้ง
        </button>
      </div>
    </div>
  );
}
