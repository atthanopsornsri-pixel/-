import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-2xl font-black text-blue-600 tracking-tighter">
            JadHor<span className="text-slate-800">OS</span>
          </Link>
          <div className="space-x-4">
            <Link href="/login">
              <Button variant="ghost" className="font-semibold text-slate-600">เข้าสู่ระบบ</Button>
            </Link>
            <Link href="/register">
              <Button className="font-semibold rounded-xl bg-blue-600 hover:bg-blue-700">สมัครใช้งานฟรี</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-grow pt-20 pb-32 px-4">
        <div className="max-w-3xl mx-auto text-center mb-16 space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
            แพ็กเกจที่เติบโตไปพร้อมกับธุรกิจคุณ
          </h1>
          <p className="text-lg md:text-xl text-slate-600">
            เลือกแพ็กเกจที่เหมาะสมกับขนาดหอพักของคุณ จ่ายเท่าที่ใช้งานจริง
          </p>
        </div>

        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
          
          {/* STARTER */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-900">Starter</h3>
              <p className="text-slate-500 text-sm mt-1">เริ่มต้นอย่างโปร</p>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-black text-slate-900">฿199</span>
              <span className="text-slate-500 font-medium"> / เดือน</span>
            </div>
            <ul className="space-y-4 mb-8 flex-grow">
              <li className="flex items-start text-sm text-slate-700"><Check className="w-5 h-5 text-emerald-500 mr-2 shrink-0"/> จัดการได้สูงสุด 30 ห้อง</li>
              <li className="flex items-start text-sm text-slate-700"><Check className="w-5 h-5 text-emerald-500 mr-2 shrink-0"/> ระบบออกบิล & ส่ง LINE แจ้งเตือน</li>
              <li className="flex items-start text-sm text-slate-700"><Check className="w-5 h-5 text-emerald-500 mr-2 shrink-0"/> รองรับผู้ดูแลระบบ 1 บัญชี</li>
            </ul>
            <Link href="/register">
              <Button variant="outline" className="w-full rounded-xl h-12 font-bold border-slate-300">ทดลองใช้ฟรี 14 วัน</Button>
            </Link>
          </div>

          {/* GROWTH (HIGHLIGHT) */}
          <div className="bg-blue-600 rounded-3xl p-8 border border-blue-500 shadow-xl shadow-blue-900/10 flex flex-col transform md:-translate-y-4 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow-sm">
              แนะนำ (ยอดนิยม)
            </div>
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white">Growth</h3>
              <p className="text-blue-200 text-sm mt-1">สำหรับอพาร์ตเมนต์ที่กำลังขยาย</p>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-black text-white">฿599</span>
              <span className="text-blue-200 font-medium"> / เดือน</span>
            </div>
            <ul className="space-y-4 mb-8 flex-grow text-blue-50">
              <li className="flex items-start text-sm"><Check className="w-5 h-5 text-emerald-300 mr-2 shrink-0"/> จัดการได้สูงสุด 100 ห้อง</li>
              <li className="flex items-start text-sm"><Check className="w-5 h-5 text-emerald-300 mr-2 shrink-0"/> ฟีเจอร์ทั้งหมดในแพ็กเกจ Starter</li>
              <li className="flex items-start text-sm"><Check className="w-5 h-5 text-emerald-300 mr-2 shrink-0"/> ระบบอนุมัติสลิปโอนเงินรวดเร็ว</li>
              <li className="flex items-start text-sm"><Check className="w-5 h-5 text-emerald-300 mr-2 shrink-0"/> รองรับผู้ดูแลระบบ 3 บัญชี</li>
            </ul>
            <Link href="/register">
              <Button className="w-full rounded-xl h-12 font-bold bg-white text-blue-600 hover:bg-slate-50">ทดลองใช้ฟรี 14 วัน</Button>
            </Link>
          </div>

          {/* ENTERPRISE */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-900">Enterprise</h3>
              <p className="text-slate-500 text-sm mt-1">เสือนอนกิน โปรเจกต์ใหญ่</p>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-black text-slate-900">฿1,299</span>
              <span className="text-slate-500 font-medium"> / เดือน</span>
            </div>
            <ul className="space-y-4 mb-8 flex-grow">
              <li className="flex items-start text-sm text-slate-700"><Check className="w-5 h-5 text-emerald-500 mr-2 shrink-0"/> ไม่จำกัดจำนวนห้อง (101 ห้องขึ้นไป)</li>
              <li className="flex items-start text-sm text-slate-700"><Check className="w-5 h-5 text-emerald-500 mr-2 shrink-0"/> ฟีเจอร์ทั้งหมดในแพ็กเกจ Growth</li>
              <li className="flex items-start text-sm text-slate-700"><Check className="w-5 h-5 text-emerald-500 mr-2 shrink-0"/> บริการ Support พิเศษ 24/7</li>
              <li className="flex items-start text-sm text-slate-700"><Check className="w-5 h-5 text-emerald-500 mr-2 shrink-0"/> รองรับผู้ดูแลระบบไม่จำกัด</li>
            </ul>
            <Link href="/register">
              <Button variant="outline" className="w-full rounded-xl h-12 font-bold border-slate-300">ติดต่อแอดมินเพื่ออัปเกรด</Button>
            </Link>
          </div>

        </div>

        <div className="max-w-3xl mx-auto mt-20 text-center">
           <p className="text-sm text-slate-500 font-medium">* หรือเลือกชำระแบบรายปี ลดทันที 2 เดือน (จ่ายเพียง 10 เดือน)</p>
        </div>
      </main>
    </div>
  );
}
