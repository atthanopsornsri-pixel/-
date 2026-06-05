import { Providers } from "@/components/providers";
import type { Metadata } from "next";
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
  title: "ระบบจัดการหอพักและอพาร์ตเม้นท์",
  description: "Dormitory and Apartment Management System",
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
