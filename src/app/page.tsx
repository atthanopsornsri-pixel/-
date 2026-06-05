import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Cloud, Building2 } from "lucide-react";

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-[#ffffff] flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
      
      {/* ---------------- Navbar (Minimalist like iCloud) ---------------- */}
      <header className="absolute top-0 w-full z-50">
        <div className="w-full px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-[19px] tracking-tight">
            <div className="relative w-8 h-8">
              <Image src="/images/logo.png" alt="JadHor OS Logo" fill className="object-contain" />
            </div>
            JadHor OS
          </div>
          <div className="flex items-center gap-4">
            {/* Optional right nav icons like iCloud */}
          </div>
        </div>
      </header>

      {/* ---------------- Main Content (Centered) ---------------- */}
      <main className="flex-1">
        <section className="flex flex-col items-center justify-center pt-20 pb-32 px-4 relative z-10 min-h-screen">
        
        {/* Center Logo Icon */}
        <div className="mb-8 relative mt-16 md:mt-0">
          <div className="relative w-32 h-32 md:w-48 md:h-48 drop-shadow-xl hover:scale-105 transition-transform duration-500">
             <Image src="/images/logo.png" alt="JadHor OS Logo" fill className="object-contain" priority />
          </div>
        </div>
        
        {/* Large Brand Text */}
        <h1 className="text-[42px] md:text-[56px] font-semibold text-slate-900 tracking-tight leading-none mb-10 text-center flex flex-col items-center gap-2">
          JadHor OS
          <span className="text-2xl md:text-3xl font-medium text-slate-500 tracking-normal">
            (จัดหอ)
          </span>
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
        <div className="mt-12 text-center max-w-sm px-4">
          <p className="text-[18px] md:text-[21px] leading-[1.4] text-slate-800 font-medium tracking-tight">
            พื้นที่ที่ดีที่สุดสำหรับจัดการหอพัก
            <br className="hidden md:block"/> บิลค่าเช่า และลูกบ้าน <br className="hidden md:block"/>
            ทั้งหมดของคุณ
          </p>
        </div>

        {/* Register link underneath like Apple ID creation */}
        {!session && (
          <div className="mt-10 text-[14px] text-slate-600">
            ยังไม่มีบัญชีใช่หรือไม่? <Link href="/register" className="text-blue-600 hover:underline">สร้างบัญชี JadHor OS ทันที</Link>
          </div>
        )}

        {/* Dashboard Mockup Showcase */}
        <div className="mt-16 md:mt-24 w-full max-w-6xl mx-auto px-4 md:px-8">
          <div className="relative rounded-2xl md:rounded-[2rem] overflow-hidden shadow-2xl border border-slate-200 bg-white/50 backdrop-blur-sm transform hover:scale-[1.02] hover:-translate-y-2 transition-all duration-700 ease-out group">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/5 to-transparent z-10 pointer-events-none"></div>
            <Image 
              src="/images/dashboard-mockup.png" 
              alt="JadHor OS Dashboard Preview" 
              width={1400} 
              height={900} 
              className="w-full h-auto object-cover"
              priority
            />
          </div>
        </div>

        </section>

        {/* ---------------- Features Section ---------------- */}
        <section id="features" className="py-24 bg-white relative">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center mb-20">
              <h2 className="text-blue-600 font-bold tracking-wider uppercase text-sm mb-3">Core Features</h2>
              <h3 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6">ฟีเจอร์จัดเต็ม เพื่อเจ้าของหอพัก</h3>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">ช่วยให้คุณประหยัดเวลา ลดความผิดพลาด และเพิ่มความพึงพอใจให้กับลูกบ้าน</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="p-10 rounded-3xl bg-blue-50/50 border border-blue-100 hover:shadow-xl hover:shadow-blue-900/5 transition-all group hover:-translate-y-1">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-3">ออกบิลค่าน้ำค่าไฟอัตโนมัติ</h4>
                <p className="text-slate-600 leading-relaxed">จดมิเตอร์ปุ๊บ ระบบคำนวณยอดให้ปั๊บ พร้อมสร้างใบแจ้งหนี้ส่งตรงให้ลูกบ้านผ่านมือถือทันที หมดปัญหาคิดเลขผิด</p>
              </div>

              {/* Feature 2 */}
              <div className="p-10 rounded-3xl bg-indigo-50/50 border border-indigo-100 hover:shadow-xl hover:shadow-indigo-900/5 transition-all group hover:-translate-y-1">
                <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-3">ระบบตรวจสลิปโอนเงิน</h4>
                <p className="text-slate-600 leading-relaxed">ลูกบ้านสแกนชำระผ่าน QR Code ระบบจะตรวจสลิปและปรับสถานะการชำระเงินให้อัตโนมัติ (SlipOk API)</p>
              </div>

              {/* Feature 3 */}
              <div className="p-10 rounded-3xl bg-emerald-50/50 border border-emerald-100 hover:shadow-xl hover:shadow-emerald-900/5 transition-all group hover:-translate-y-1">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-3">แจ้งเตือนผ่าน LINE Notify</h4>
                <p className="text-slate-600 leading-relaxed">ไม่พลาดทุกการเคลื่อนไหว! แจ้งเตือนบิลใหม่ แจ้งซ่อม และรับพัสดุ ส่งตรงถึง LINE ลูกบ้านแบบเรียลไทม์</p>
              </div>
              
              {/* Feature 4 */}
              <div className="p-10 rounded-3xl bg-orange-50/50 border border-orange-100 hover:shadow-xl hover:shadow-orange-900/5 transition-all group hover:-translate-y-1">
                <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-3">จัดการพัสดุ (Parcel Tracking)</h4>
                <p className="text-slate-600 leading-relaxed">นิติบุคคลรับของปุ๊บ ระบบแจ้งเตือนลูกบ้านปั๊บ พร้อมให้ลูกบ้านเข้ามารับของได้อย่างเป็นระบบ ไม่ตกหล่น</p>
              </div>

              {/* Feature 5 */}
              <div className="p-10 rounded-3xl bg-rose-50/50 border border-rose-100 hover:shadow-xl hover:shadow-rose-900/5 transition-all group hover:-translate-y-1">
                <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-3">ระบบแจ้งซ่อมออนไลน์</h4>
                <p className="text-slate-600 leading-relaxed">ลูกบ้านแจ้งปัญหาผ่านระบบ เจ้าของกดอัปเดตสถานะงานซ่อมได้ทันที หมดปัญหาโดนตามงานซ้ำซ้อน</p>
              </div>

              {/* Feature 6 */}
              <div className="p-10 rounded-3xl bg-cyan-50/50 border border-cyan-100 hover:shadow-xl hover:shadow-cyan-900/5 transition-all group hover:-translate-y-1">
                <div className="w-16 h-16 bg-cyan-100 text-cyan-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-3">จัดการสัญญาเช่า (e-Contract)</h4>
                <p className="text-slate-600 leading-relaxed">ร่างสัญญาเช่า พร้อมพิมพ์เป็นไฟล์ PDF ให้ลูกบ้านเซ็นได้ทันที เก็บประวัติสัญญาได้ตลอดอายุการใช้งาน</p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- How It Works Section ---------------- */}
        <section id="how-it-works" className="py-24 bg-slate-50">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">เริ่มต้นใช้งานง่ายๆ ใน 3 ขั้นตอน</h2>
            </div>
            
            <div className="flex flex-col md:flex-row justify-center items-start gap-12 relative">
              {/* Desktop connecting line */}
              <div className="hidden md:block absolute top-8 left-[15%] right-[15%] h-0.5 bg-slate-200 z-0"></div>
              
              <div className="flex-1 text-center relative z-10 w-full">
                <div className="w-16 h-16 mx-auto bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-6 shadow-xl shadow-blue-500/30">1</div>
                <h4 className="text-xl font-bold text-slate-900 mb-2">ลงทะเบียน & สร้างตึก</h4>
                <p className="text-slate-600 text-sm">สร้างบัญชีเจ้าของ และระบุจำนวนห้องพัก ตั้งค่าราคาและสิ่งอำนวยความสะดวกพื้นฐาน</p>
              </div>
              
              <div className="flex-1 text-center relative z-10 w-full">
                <div className="w-16 h-16 mx-auto bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-6 shadow-xl shadow-blue-500/30">2</div>
                <h4 className="text-xl font-bold text-slate-900 mb-2">เพิ่มผู้เช่าเข้าห้อง</h4>
                <p className="text-slate-600 text-sm">ลงทะเบียนผู้เช่าใหม่ ออกสัญญาเช่าให้เซ็น และเชิญผู้เช่าเข้าสู่ระบบ (Tenant Portal)</p>
              </div>
              
              <div className="flex-1 text-center relative z-10 w-full">
                <div className="w-16 h-16 mx-auto bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-6 shadow-xl shadow-blue-500/30">3</div>
                <h4 className="text-xl font-bold text-slate-900 mb-2">จัดการบิล & รับเงิน</h4>
                <p className="text-slate-600 text-sm">สิ้นเดือนกรอกแค่มิเตอร์ ระบบจะส่งบิลเข้า LINE ลูกบ้าน จ่ายปุ๊บ ระบบอัปเดตยอดให้ปั๊บ!</p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- Pricing Section ---------------- */}
        <section id="pricing" className="py-24 bg-white">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">แพ็กเกจที่เติบโตไปพร้อมกับธุรกิจคุณ</h2>
              <p className="text-lg text-slate-600">เลือกแพ็กเกจที่เหมาะสมกับขนาดหอพักของคุณ จ่ายเท่าที่ใช้งานจริง</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              
              {/* STARTER */}
              <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col hover:border-blue-300 transition-colors">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-slate-900">Starter</h3>
                  <p className="text-slate-500 text-sm mt-1">เริ่มต้นอย่างโปร</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-black text-slate-900">฿199</span>
                  <span className="text-slate-500 font-medium"> / เดือน</span>
                </div>
                <ul className="space-y-4 mb-8 flex-grow">
                  <li className="flex items-start text-sm text-slate-700">
                    <svg className="w-5 h-5 text-emerald-500 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    จัดการได้สูงสุด 30 ห้อง
                  </li>
                  <li className="flex items-start text-sm text-slate-700">
                    <svg className="w-5 h-5 text-emerald-500 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    ระบบออกบิล & ส่ง LINE
                  </li>
                </ul>
                <Link href="/register">
                  <Button variant="outline" className="w-full rounded-xl h-12 font-bold border-slate-300">ทดลองใช้ฟรี 14 วัน</Button>
                </Link>
              </div>

              {/* GROWTH */}
              <div className="bg-blue-600 rounded-3xl p-8 border border-blue-500 shadow-xl shadow-blue-900/10 flex flex-col transform md:-translate-y-4 relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow-sm whitespace-nowrap">
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
                  <li className="flex items-start text-sm">
                    <svg className="w-5 h-5 text-emerald-300 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    จัดการได้สูงสุด 100 ห้อง
                  </li>
                  <li className="flex items-start text-sm">
                    <svg className="w-5 h-5 text-emerald-300 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    ฟีเจอร์ทั้งหมดในแพ็กเกจ Starter
                  </li>
                  <li className="flex items-start text-sm">
                    <svg className="w-5 h-5 text-emerald-300 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    ระบบตรวจสลิปอัตโนมัติ
                  </li>
                </ul>
                <Link href="/register">
                  <Button className="w-full rounded-xl h-12 font-bold bg-white text-blue-600 hover:bg-slate-50">ทดลองใช้ฟรี 14 วัน</Button>
                </Link>
              </div>

              {/* ENTERPRISE */}
              <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col hover:border-blue-300 transition-colors">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-slate-900">Enterprise</h3>
                  <p className="text-slate-500 text-sm mt-1">เสือนอนกิน โปรเจกต์ใหญ่</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-black text-slate-900">฿1,299</span>
                  <span className="text-slate-500 font-medium"> / เดือน</span>
                </div>
                <ul className="space-y-4 mb-8 flex-grow">
                  <li className="flex items-start text-sm text-slate-700">
                    <svg className="w-5 h-5 text-emerald-500 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    ไม่จำกัดจำนวนห้องพัก
                  </li>
                  <li className="flex items-start text-sm text-slate-700">
                    <svg className="w-5 h-5 text-emerald-500 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    บริการ Support พิเศษ 24/7
                  </li>
                </ul>
                <Link href="/register">
                  <Button variant="outline" className="w-full rounded-xl h-12 font-bold border-slate-300">ติดต่อแอดมินเพื่ออัปเกรด</Button>
                </Link>
              </div>

            </div>
            <div className="max-w-3xl mx-auto mt-12 text-center">
              <p className="text-sm text-slate-500 font-medium">* หรือเลือกชำระแบบรายปี ลดทันที 2 เดือน (จ่ายเพียง 10 เดือน)</p>
            </div>
          </div>
        </section>

        {/* ---------------- Contact Form Section ---------------- */}
        <section id="contact" className="py-24 bg-slate-50 border-t border-slate-200">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden">
              <div className="flex flex-col md:flex-row">
                <div className="md:w-2/5 bg-gradient-to-br from-blue-600 to-indigo-700 p-10 text-white">
                  <h3 className="text-2xl font-bold mb-4">ติดต่อเซลส์</h3>
                  <p className="text-blue-100 mb-8 text-sm leading-relaxed">
                    มีคำถามเกี่ยวกับระบบ หรือต้องการให้ทีมงานช่วยตั้งค่าระบบให้? ติดต่อเราได้เลย ทีมงานพร้อมดูแลคุณ
                  </p>
                  
                  <div className="space-y-4">
                    <div className="flex items-center text-sm">
                      <svg className="w-5 h-5 mr-3 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                      064-035-3806
                    </div>
                    <div className="flex items-center text-sm break-all">
                      <svg className="w-5 h-5 mr-3 text-blue-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      atthanop.sornsri@gmail.com
                    </div>
                  </div>
                </div>
                
                <div className="md:w-3/5 p-10">
                  <form className="space-y-5" action="/api/contact" method="POST">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>ชื่อ-นามสกุล</Label>
                        <Input name="name" placeholder="สมชาย ใจดี" required />
                      </div>
                      <div className="space-y-2">
                        <Label>เบอร์โทรศัพท์</Label>
                        <Input name="phone" placeholder="081-xxx-xxxx" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>ชื่อหอพัก / อพาร์ตเม้นท์ (ถ้ามี)</Label>
                      <Input name="property" placeholder="สบายดี อพาร์ตเม้นท์" />
                    </div>
                    <div className="space-y-2">
                      <Label>อีเมล</Label>
                      <Input name="email" type="email" placeholder="email@example.com" required />
                    </div>
                    <div className="space-y-2">
                      <Label>เรื่องที่ต้องการสอบถาม</Label>
                      <textarea 
                        name="message"
                        className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[100px] resize-none"
                        placeholder="พิมพ์ข้อความของคุณที่นี่..."
                        required
                      ></textarea>
                    </div>
                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-full">
                      ส่งข้อความ
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* ---------------- Footer ---------------- */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="container mx-auto px-4 max-w-6xl flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0 text-center md:text-left">
            <div className="relative inline-flex items-center bg-white px-3 py-1.5 rounded-xl mb-2">
              <Image src="/images/logo.png" alt="JadHor OS Logo" width={160} height={40} className="object-contain h-10 w-auto" />
            </div>
            <p className="mt-2 text-sm text-slate-500">แพลตฟอร์มบริหารจัดการหอพักยุคใหม่</p>
            <p className="mt-1 text-xs text-slate-600">© 2026 JadHor OS. All rights reserved.</p>
          </div>
          <div className="flex gap-8 text-sm font-medium">
            <Link href="#" className="hover:text-white transition-colors">เงื่อนไขการใช้งาน</Link>
            <Link href="#" className="hover:text-white transition-colors">นโยบายความเป็นส่วนตัว</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
