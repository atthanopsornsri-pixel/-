import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js 16 dev config สำหรับ cross-origin local testing
  allowedDevOrigins: ["192.168.1.109"],

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // ป้องกัน Clickjacking
          { key: "X-Frame-Options", value: "DENY" },
          // ป้องกัน MIME sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // ควบคุม Referrer
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // ปิด API ที่ไม่ได้ใช้
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
