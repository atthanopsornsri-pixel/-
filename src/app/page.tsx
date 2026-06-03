import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans overflow-x-hidden selection:bg-blue-100 selection:text-blue-900">
      
      {/* ---------------- Navbar ---------------- */}
      <header className="bg-white/80 backdrop-blur-xl sticky top-0 z-50 border-b border-slate-200/50">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform duration-300">
              <span className="text-white font-extrabold text-xl">A</span>
            </div>
            <span className="text-2xl font-extrabold text-slate-800 tracking-tight">
              Apartment<span className="text-blue-600">OS</span>
            </span>
          </div>
          <nav className="hidden md:flex gap-8 text-[15px] font-semibold text-slate-600">
            <Link href="#features" className="hover:text-blue-600 transition-colors">ฟีเจอร์หลัก</Link>
            <Link href="#how-it-works" className="hover:text-blue-600 transition-colors">วิธีใช้งาน</Link>
            <Link href="#pricing" className="hover:text-blue-600 transition-colors">แพ็กเกจราคา</Link>
            <Link href="#contact" className="hover:text-blue-600 transition-colors">ติดต่อเรา</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-slate-600 hover:text-blue-600 font-semibold px-4 hover:bg-blue-50 rounded-full">
                เข้าสู่ระบบ
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4 sm:px-6 whitespace-nowrap text-sm sm:text-base shadow-md hover:shadow-xl hover:shadow-blue-500/20 transition-all font-semibold">
                <span className="hidden sm:inline">ทดลองใช้ฟรี 14 วัน</span>
                <span className="sm:hidden">ทดลองฟรี</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        
        {/* ---------------- Hero Section ---------------- */}
        <section className="pt-20 pb-24 md:pt-32 md:pb-40 px-4 relative overflow-hidden bg-white">
          {/* Subtle Grid Background */}
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
          
          {/* Subtle Blue Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-[1400px] pointer-events-none -z-10">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-100/50 rounded-full blur-[100px]"></div>
          </div>

          <div className="container mx-auto max-w-6xl text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-50 text-slate-600 font-medium text-sm mb-8 border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
              <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
              ระบบจัดการหอพักยุคใหม่ อัปเดตฟีเจอร์ล่าสุด ปี 2026
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.15] mb-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
              บริหารจัดการหอพักและอพาร์ตเม้นท์ <br className="hidden md:block"/>
              <span className="text-blue-600">
                ง่าย จบ ครบ ในที่เดียว
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-600 mb-12 max-w-3xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
              หมดปัญหากระดาษกองโต! เปลี่ยนหอพักของคุณให้เป็นระบบดิจิทัล 100% 
              ออกบิลอัตโนมัติ แจ้งเตือนผ่าน LINE รับชำระเงินด้วย QR Code 
              ดูแลครบตั้งแต่ผู้เช่าย้ายเข้าจนย้ายออก
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
              <Link href="/register">
                <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-600/30 w-full sm:w-auto hover:-translate-y-1 transition-all">
                  เริ่มต้นใช้งานฟรีทันที
                </Button>
              </Link>
              <Link href="#contact">
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full border-slate-300 text-slate-700 bg-white hover:bg-slate-50 w-full sm:w-auto hover:-translate-y-1 transition-all shadow-sm">
                  ติดต่อสอบถามแพ็กเกจ
                </Button>
              </Link>
            </div>

            {/* Dashboard Mockup Image */}
            <div className="relative mx-auto max-w-5xl rounded-3xl overflow-hidden shadow-2xl shadow-slate-900/10 border border-white/50 animate-in fade-in zoom-in-95 duration-1000 delay-300 group">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/10 to-transparent z-10 pointer-events-none"></div>
              {/* Note: In production, user can replace this image */}
              <img 
                src="/images/hero-mockup.png" 
                alt="ApartmentOS Dashboard Preview" 
                className="w-full h-auto object-cover transform group-hover:scale-[1.02] transition-transform duration-700"
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
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">แพ็กเกจราคา</h2>
              <p className="text-lg text-slate-600">เลือกแพ็กเกจที่เหมาะสมกับขนาดธุรกิจของคุณ</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Monthly Plan */}
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-10 relative">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">รายเดือน (Monthly)</h3>
                <p className="text-slate-500 mb-6">เหมาะสำหรับผู้เริ่มต้น หรืออพาร์ตเม้นท์ขนาดเล็ก</p>
                <div className="mb-6">
                  <span className="text-5xl font-black text-slate-900">฿490</span>
                  <span className="text-slate-500 font-medium"> / เดือน</span>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center text-slate-700">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    ไม่จำกัดจำนวนห้องพัก
                  </li>
                  <li className="flex items-center text-slate-700">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    ระบบแจ้งเตือน LINE Notify
                  </li>
                  <li className="flex items-center text-slate-700">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    ระบบตรวจสลิป 100 รายการ/เดือน
                  </li>
                </ul>
                <Button className="w-full h-12 rounded-full bg-slate-800 hover:bg-slate-900 text-white font-semibold text-base">
                  ทดลองใช้ฟรี 14 วัน
                </Button>
              </div>

              {/* Yearly Plan */}
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-10 relative text-white shadow-2xl shadow-blue-900/20 transform md:-translate-y-4">
                <div className="absolute top-0 right-6 transform -translate-y-1/2">
                  <span className="bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">คุ้มค่าที่สุด (ประหยัด 15%)</span>
                </div>
                <h3 className="text-2xl font-bold mb-2">รายปี (Yearly)</h3>
                <p className="text-blue-100 mb-6">คุ้มค่ากว่า สำหรับผู้ที่ต้องการใช้งานระยะยาว</p>
                <div className="mb-6">
                  <span className="text-5xl font-black">฿4,990</span>
                  <span className="text-blue-200 font-medium"> / ปี</span>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center text-blue-50">
                    <svg className="w-5 h-5 text-cyan-300 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    ฟีเจอร์ทุกอย่างในแพ็กเกจรายเดือน
                  </li>
                  <li className="flex items-center text-blue-50">
                    <svg className="w-5 h-5 text-cyan-300 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    ระบบตรวจสลิป ไม่จำกัดจำนวน
                  </li>
                  <li className="flex items-center text-blue-50">
                    <svg className="w-5 h-5 text-cyan-300 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    ฟรี บริการช่วยเหลือแบบพรีเมียม 24 ชม.
                  </li>
                </ul>
                <Button className="w-full h-12 rounded-full bg-white hover:bg-slate-100 text-blue-700 font-bold text-base shadow-lg">
                  สมัครแพ็กเกจรายปี
                </Button>
              </div>
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
            <span className="text-2xl font-bold text-white tracking-tight">Apartment<span className="text-blue-500">OS</span></span>
            <p className="mt-2 text-sm text-slate-500">แพลตฟอร์มบริหารจัดการหอพักยุคใหม่</p>
            <p className="mt-1 text-xs text-slate-600">© 2026 ApartmentOS. All rights reserved.</p>
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
