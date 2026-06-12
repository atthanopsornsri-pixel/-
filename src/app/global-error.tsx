"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
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
    <html lang="th">
      <body className="flex min-h-screen items-center justify-center bg-[#f5f5f7] p-6">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <div className="mb-4 text-5xl">⚠️</div>
          <h1 className="mb-2 text-xl font-bold text-[#1d1d1f]">เกิดข้อผิดพลาดบางอย่าง</h1>
          <p className="mb-6 text-sm text-[#6e6e73]">
            ระบบได้รับแจ้งปัญหาแล้ว กรุณาลองใหม่อีกครั้ง
          </p>
          <button
            onClick={reset}
            className="rounded-full bg-[#007aff] px-6 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90"
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>
      </body>
    </html>
  );
}
