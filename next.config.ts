import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Next.js 16 dev config สำหรับ cross-origin local testing
  allowedDevOrigins: ["192.168.1.109"],

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // ไม่ print Sentry logs ขณะ build
  silent: !process.env.CI,

  // Upload source maps ใน production เพื่อให้ stack trace อ่านง่าย
  widenClientFileUpload: true,
  disableLogger: true,

  // ปิด Sentry tunnel (ไม่จำเป็นสำหรับโปรเจกต์ขนาดนี้)
  tunnelRoute: undefined,
  automaticVercelMonitors: false,
});
