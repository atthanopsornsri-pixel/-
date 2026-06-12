import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // ส่ง error เฉพาะ production
  enabled: process.env.NODE_ENV === "production",

  // เก็บ 10% ของ performance traces (ไม่กิน quota)
  tracesSampleRate: 0.1,

  // เก็บ replay เฉพาะ session ที่เกิด error
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,   // ซ่อนข้อความ (ปกป้อง PDPA)
      blockAllMedia: true,
    }),
  ],
});
