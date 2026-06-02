import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @ts-ignore - Next.js 15 dev config for cross-origin local testing
  allowedDevOrigins: ["192.168.1.109"],
};

export default nextConfig;
