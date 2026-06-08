import { Providers } from "@/components/providers";
import type { Metadata, Viewport } from "next";
import { Inter, Kanit } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const kanit = Kanit({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ["thai", "latin"],
  variable: "--font-kanit",
});

export const metadata: Metadata = {
  applicationName: "JadHor OS",
  title: {
    default: "JadHor OS — ระบบจัดการหอพักและอพาร์ตเมนต์",
    template: "%s | JadHor OS",
  },
  description:
    "ระบบจัดการหอพักครบวงจร ออกบิล จดมิเตอร์ แจ้งเตือนผ่าน LINE จัดการผู้เช่า ใช้งานง่ายบนมือถือ ไม่ต้องโหลดแอป",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "JadHor OS",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#007AFF",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${inter.variable} ${kanit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col overflow-x-hidden" style={{ fontFamily: 'var(--font-inter), var(--font-kanit), sans-serif' }}>
        <Providers>{children}</Providers>
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
