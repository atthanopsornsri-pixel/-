import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Cloud, Building2 } from "lucide-react";

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-[#ffffff] flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* ---------------- Navbar (Minimalist like iCloud) ---------------- */}
      <header className="absolute top-0 w-full z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-[19px] tracking-tight">
            <Building2 className="w-5 h-5" />
            Apartment OS
          </div>
          <div className="flex items-center gap-4">
            {/* Optional right nav icons like iCloud */}
          </div>
        </div>
      </header>

      {/* ---------------- Main Content (Centered) ---------------- */}
      <main className="flex-1 flex flex-col items-center justify-center pt-20 px-4 relative z-10">
        
        {/* Center Logo Icon */}
        <div className="mb-8 relative">
          {/* We use a large icon to mimic the iCloud cloud. You can swap this with an image if preferred. */}
          <div className="w-40 h-40 bg-gradient-to-br from-blue-400 to-blue-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/30">
             <Building2 className="w-24 h-24 text-white" />
          </div>
        </div>
        
        {/* Large Brand Text */}
        <h1 className="text-[56px] font-semibold text-slate-900 tracking-tight leading-none mb-10">
          Apartment OS
        </h1>

        {/* Primary Action Button */}
        {session ? (
          <Link href="/dashboard">
            <Button className="rounded-full bg-slate-900 hover:bg-black text-white px-8 h-[44px] text-[15px] font-medium shadow-md transition-all w-fit min-w-[140px]">
              ไปที่แดชบอร์ด
            </Button>
          </Link>
        ) : (
          <Link href="/login">
            <Button className="rounded-full bg-slate-900 hover:bg-black text-white px-8 h-[44px] text-[15px] font-medium shadow-md transition-all w-fit min-w-[140px]">
              ลงชื่อเข้าใช้
            </Button>
          </Link>
        )}

        {/* Subtitle / Marketing Text */}
        <div className="mt-12 text-center max-w-sm">
          <p className="text-[21px] leading-[1.4] text-slate-800 font-medium tracking-tight">
            พื้นที่ที่ดีที่สุดสำหรับจัดการหอพัก
            <br />
            บิลค่าเช่า และลูกบ้าน
            <br />
            ทั้งหมดของคุณ
          </p>
        </div>

        {/* Register link underneath like Apple ID creation */}
        {!session && (
          <div className="mt-20 text-[14px] text-slate-600">
            ยังไม่มีบัญชีใช่หรือไม่? <Link href="/register" className="text-blue-600 hover:underline">สร้างบัญชี Apartment OS ทันที</Link>
          </div>
        )}

      </main>

      {/* ---------------- Minimal Footer ---------------- */}
      <footer className="py-6 text-center text-[12px] text-slate-400 border-t border-slate-100">
        <p>Copyright © 2026 Apartment OS Inc. สงวนสิทธิ์ทุกประการ</p>
        <div className="flex justify-center gap-4 mt-2">
          <Link href="#" className="hover:text-slate-600">นโยบายความเป็นส่วนตัว</Link>
          <div className="w-px h-3 bg-slate-300 my-auto"></div>
          <Link href="#" className="hover:text-slate-600">ข้อกำหนดการใช้งาน</Link>
        </div>
      </footer>
      
    </div>
  );
}
