import { LoginForm } from "@/components/login-form";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-white">
      {/* Left Panel: Branding / Image */}
      <div className="hidden md:flex flex-1 flex-col justify-between bg-slate-900 text-white p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 to-slate-900 z-0"></div>
        {/* Decorative blobs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl z-0"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[100px] z-0"></div>

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 group w-fit cursor-pointer">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <span className="text-white font-extrabold text-xl">A</span>
            </div>
            <span className="text-2xl font-extrabold tracking-tight">
              Apartment<span className="text-blue-400">OS</span>
            </span>
          </Link>
        </div>

        <div className="relative z-10 max-w-lg mt-20">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-4 md:mb-6 leading-tight">ยินดีต้อนรับกลับสู่ระบบจัดการหอพักที่ทันสมัยที่สุด</h1>
          <p className="text-blue-200 text-base md:text-lg leading-relaxed">
            บริหารจัดการอพาร์ตเม้นท์ของคุณได้อย่างมีประสิทธิภาพ ประหยัดเวลา และเพิ่มความพึงพอใจให้กับลูกบ้าน 
          </p>
        </div>
        
        <div className="relative z-10 flex items-center gap-4 text-sm text-slate-400">
          <span>© 2026 ApartmentOS.</span>
          <Link href="/" className="hover:text-white transition-colors">หน้าแรก</Link>
        </div>
      </div>

      {/* Right Panel: Form */}
      <div className="flex-1 flex items-center justify-center p-8 md:p-12 relative">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="md:hidden flex items-center justify-center gap-2 mb-10">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <span className="text-xl font-bold text-slate-800">
              Apartment<span className="text-blue-600">OS</span>
            </span>
          </div>
          
          <LoginForm />
          
          <div className="mt-8 text-center text-sm text-slate-500">
            ยังไม่มีบัญชีใช่หรือไม่?{" "}
            <Link href="/register" className="text-blue-600 font-semibold hover:underline">
              สมัครสมาชิกฟรี 14 วัน
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
