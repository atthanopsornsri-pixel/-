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

        {/* ───────────────────────────────────────────────
            จุดขายหลัก: จ่ายทีเดียว ครบทุกตึก (per-account vs per-building)
           ─────────────────────────────────────────────── */}
        <section className="max-w-5xl mx-auto mt-28">
          <div className="text-center mb-12 space-y-3">
            <span className="inline-block px-4 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold tracking-wide">
              จุดที่เราต่างจากระบบอื่น
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              จ่ายทีเดียว ครบทุกตึก
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              ระบบจัดการหอพักส่วนใหญ่คิดเงิน <strong className="text-slate-800">“ต่อตึก”</strong> —
              มีหลายตึกก็จ่ายหลายเท่า แต่ JadHor คิดตาม <strong className="text-blue-600">จำนวนห้องรวมทั้งหมด</strong> จ่ายครั้งเดียวจบ
            </p>
          </div>

          {/* ตัวอย่างเปรียบเทียบ: เจ้าของหอ 3 ตึก รวม 60 ห้อง */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-6 md:px-10 py-5 border-b border-slate-200">
              <p className="font-bold text-slate-800">
                ตัวอย่าง: เจ้าของหอ <span className="text-blue-600">3 ตึก</span> รวม <span className="text-blue-600">60 ห้อง</span>
              </p>
            </div>

            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
              {/* ระบบที่คิดต่อตึก */}
              <div className="p-6 md:p-10">
                <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">ระบบที่คิดเงินต่อตึก</div>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-4xl font-black text-slate-400 line-through decoration-rose-400/60">฿1,097+</span>
                  <span className="text-slate-500 font-medium">/ เดือน</span>
                </div>
                <ul className="space-y-2.5 text-sm text-slate-500">
                  <li className="flex items-start gap-2"><span className="text-rose-400 mt-0.5">✕</span> จ่ายแยกทุกตึก (ยิ่งหลายตึก ยิ่งแพง)</li>
                  <li className="flex items-start gap-2"><span className="text-rose-400 mt-0.5">✕</span> สลับดูข้อมูลทีละตึก</li>
                  <li className="flex items-start gap-2"><span className="text-rose-400 mt-0.5">✕</span> ผู้เช่าต้องโหลดแอปแยก</li>
                </ul>
              </div>

              {/* JadHor */}
              <div className="p-6 md:p-10 bg-gradient-to-br from-blue-50/50 to-white relative">
                <div className="absolute top-6 right-6 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                  ประหยัดกว่า 45%
                </div>
                <div className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-3">JadHor — แพ็กเกจ Growth</div>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-4xl font-black text-slate-900">฿599</span>
                  <span className="text-slate-500 font-medium">/ เดือน</span>
                </div>
                <ul className="space-y-2.5 text-sm text-slate-700">
                  <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /> ครอบคลุมได้สูงสุด 100 ห้อง (ทุกตึกรวมกัน)</li>
                  <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /> เห็นข้อมูลทุกตึกในที่เดียว</li>
                  <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /> ผู้เช่ารับแจ้งเตือนผ่าน LINE ไม่ต้องโหลดแอป</li>
                </ul>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-4">
            * ตัวเลขเป็นตัวอย่างเพื่อการเปรียบเทียบ อ้างอิงราคาแพ็กเกจระดับใกล้เคียงกันในตลาด ณ ปี 2568
          </p>
        </section>

        {/* แถบจุดเด่นเสริม 3 ข้อ */}
        <section className="max-w-5xl mx-auto mt-20 grid md:grid-cols-3 gap-6">
          {[
            { title: "ไม่ต้องโหลดแอป", desc: "ผู้เช่ารับบิล จ่ายเงิน แจ้งซ่อม ผ่าน LINE ที่ทุกคนมีอยู่แล้ว", emoji: "💬" },
            { title: "ติดตั้งลงมือถือได้", desc: "กด ‘เพิ่มไปหน้าจอโฮม’ ใช้เหมือนแอปจริง เปิดเร็ว ไม่กินพื้นที่", emoji: "📱" },
            { title: "ออกแบบสะอาดตา ใช้ง่าย", desc: "ดีไซน์เรียบหรูสไตล์มินิมอล ไม่รก เรียนรู้ได้ในนาที", emoji: "✨" },
          ].map((f) => (
            <div key={f.title} className="bg-white rounded-2xl border border-slate-200 p-6 text-center shadow-sm">
              <div className="text-3xl mb-3">{f.emoji}</div>
              <h3 className="font-bold text-slate-800 mb-1.5">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </section>

        <div className="max-w-2xl mx-auto mt-20 text-center">
          <Link href="/register">
            <Button className="rounded-full h-14 px-10 font-bold text-base bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20">
              เริ่มทดลองใช้ฟรี 14 วัน — ไม่ต้องใช้บัตรเครดิต
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
