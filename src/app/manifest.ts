import type { MetadataRoute } from "next";

/**
 * PWA Web App Manifest — ทำให้ JadHor OS ติดตั้งลงหน้าจอมือถือได้
 * โดยไม่ต้องโหลดผ่าน App Store / Play Store (ความได้เปรียบเหนือคู่แข่งที่บังคับโหลดแอป)
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JadHor OS — ระบบจัดการหอพักและอพาร์ตเมนต์",
    short_name: "JadHor OS",
    description:
      "ระบบจัดการหอพักครบวงจร ออกบิล จดมิเตอร์ แจ้งเตือนผ่าน LINE จัดการผู้เช่า ใช้งานง่ายบนมือถือ",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F5F5F7",
    theme_color: "#007AFF",
    lang: "th",
    categories: ["business", "productivity", "finance"],
    icons: [
      {
        src: "/images/logo.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
