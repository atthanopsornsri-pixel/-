import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getDashboardMetrics } from "@/app/actions/dashboard";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    redirect("/login");
  }

  const role = session.user.role;

  // ==========================================
  // 🔴 โซนของ ADMIN (Platform Manager)
  // ==========================================
  if (role === "ADMIN") {
    const totalOwners = await prisma.user.count({ where: { role: "OWNER" } });
    const totalProperties = await prisma.property.count({ where: { isDeleted: false } });
    
    const revenueAgg = await prisma.subscriptionBill.aggregate({
      where: { status: "PAID" },
      _sum: { amount: true }
    });
    const totalRevenue = revenueAgg._sum.amount || 0;
    
    const pendingInvites = await prisma.registrationCode.count({ where: { isUsed: false } });

    return (
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">ภาพรวมระบบ (Super Admin)</h1>
            <p className="text-sm md:text-base font-medium text-slate-500 mt-2">ยินดีต้อนรับกลับมา, ตรวจสอบสถานะการทำงานของแพลตฟอร์ม JadHor OS</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-[32px] text-slate-800 relative overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:-translate-y-1 border border-slate-100">
            <h3 className="text-sm font-bold tracking-wide text-blue-700">เจ้าของหอพักทั้งหมด</h3>
            <p className="text-4xl font-black mt-2 text-blue-900">{totalOwners} <span className="text-sm font-normal text-blue-600/80">บัญชี</span></p>
          </div>
          <div className="bg-white p-6 rounded-[32px] text-slate-800 relative overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:-translate-y-1 border border-slate-100">
            <h3 className="text-sm font-bold tracking-wide text-emerald-700">หอพักในระบบ</h3>
            <p className="text-4xl font-black mt-2 text-emerald-900">{totalProperties} <span className="text-sm font-normal text-emerald-600/80">แห่ง</span></p>
          </div>
          <div className="bg-white p-6 rounded-[32px] text-slate-800 relative overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:-translate-y-1 border border-slate-100">
            <h3 className="text-sm font-bold tracking-wide text-purple-700">รายได้แพลตฟอร์ม (SaaS)</h3>
            <p className="text-4xl font-black mt-2 text-purple-900">฿{totalRevenue.toLocaleString()} <span className="text-sm font-normal text-purple-600/80">รวม</span></p>
          </div>
          <div className="bg-white p-6 rounded-[32px] text-slate-800 relative overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:-translate-y-1 border border-slate-100">
            <h3 className="text-sm font-bold tracking-wide text-orange-700">Invite Code รอใช้งาน</h3>
            <p className="text-4xl font-black mt-2 text-orange-900">{pendingInvites} <span className="text-sm font-normal text-orange-600/80">โค้ด</span></p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 🔵 โซนของ OWNER (Property Owner) และ TENANT
  // ==========================================
  let metrics = {
    totalProperties: 0,
    totalRooms: 0,
    occupiedRooms: 0,
    occupancyRate: 0,
    outstandingDebt: 0,
    totalRevenue: 0
  };

  if (role === "OWNER") {
    const result = await getDashboardMetrics();
    if (result.success && result.data) {
      metrics = result.data;
    }
  }

  const formatIncome = (amount: number) => {
    if (amount >= 10000) {
      return `฿${(amount / 1000).toFixed(1)}K`;
    }
    return `฿${amount.toLocaleString()}`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">
            ภาพรวมระบบ
          </h1>
          <p className="text-slate-500 mt-2 text-sm md:text-base font-medium">
            ยินดีต้อนรับกลับมา, ขอให้วันนี้เป็นวันที่ดีในการบริหารจัดการ
          </p>
        </div>
        {role === "OWNER" && (
          <Link href="/dashboard/properties">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm rounded-full px-6 font-medium transition-all hover:-translate-y-0.5">
              + เพิ่มหอพักใหม่
            </Button>
          </Link>
        )}
      </div>

      {role === "OWNER" ? (
        <>
          {/* Summary Metric Cards with Light Pastel Colors and Hover Animations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-white p-6 rounded-[32px] text-slate-800 relative overflow-hidden group transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:-translate-y-1 border border-slate-100">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 group-hover:rotate-12 transition-transform duration-500 text-blue-600">
                <svg className="w-24 h-24 -mt-4 -mr-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-500 flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
              </div>
              <span className="text-blue-700 text-sm font-bold tracking-wide relative z-10">อพาร์ตเม้นท์ของคุณ</span>
              <div className="text-4xl font-black mt-2 text-blue-900 relative z-10">{metrics.totalProperties}</div>
              <p className="text-blue-600/80 text-xs mt-2 font-medium relative z-10">สถานที่ทั้งหมดในระบบ</p>
            </div>

            <div className="bg-white p-6 rounded-[32px] text-slate-800 relative overflow-hidden group transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:-translate-y-1 border border-slate-100">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 group-hover:rotate-12 transition-transform duration-500 text-emerald-600">
                <svg className="w-24 h-24 -mt-4 -mr-4" fill="currentColor" viewBox="0 0 20 20"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" /></svg>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" /></svg>
              </div>
              <span className="text-emerald-700 text-sm font-bold tracking-wide relative z-10">อัตราการเข้าพัก</span>
              <div className="text-4xl font-black mt-2 text-emerald-900 relative z-10">{metrics.occupancyRate}%</div>
              <p className="text-emerald-600/80 text-xs mt-2 font-medium relative z-10">{metrics.occupiedRooms} จากทั้งหมด {metrics.totalRooms} ห้อง</p>
            </div>

            <div className="bg-white p-6 rounded-[32px] text-slate-800 relative overflow-hidden group transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:-translate-y-1 border border-slate-100">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 group-hover:-rotate-12 transition-transform duration-500 text-amber-600">
                <svg className="w-24 h-24 -mt-4 -mr-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4 group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
              </div>
              <span className="text-amber-700 text-sm font-bold tracking-wide relative z-10">หนี้ค้างชำระ (เดือนนี้)</span>
              <div className="text-3xl font-black mt-2 text-amber-900 tracking-tight relative z-10">{formatIncome(metrics.outstandingDebt)}</div>
              <p className="text-amber-600/80 text-xs mt-2 font-medium relative z-10">กำลังรอการชำระเงิน</p>
            </div>

            <div className="bg-white p-6 rounded-[32px] text-slate-800 relative overflow-hidden group transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:-translate-y-1 border border-slate-100">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 group-hover:rotate-12 transition-transform duration-500 text-rose-600">
                <svg className="w-24 h-24 -mt-4 -mr-4" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" /></svg>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-500 flex items-center justify-center mb-4 group-hover:bg-rose-500 group-hover:text-white transition-colors duration-300">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" /></svg>
              </div>
              <span className="text-rose-700 text-sm font-bold tracking-wide relative z-10">รายรับเดือนนี้ (ประเมิน)</span>
              <div className="text-3xl font-black mt-2 text-rose-900 tracking-tight relative z-10">{formatIncome(metrics.totalRevenue)}</div>
              <p className="text-rose-600/80 text-xs mt-2 font-medium relative z-10">จากค่าเช่าและบริการ</p>
            </div>
            
          </div>

          {/* Quick Actions Panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="bg-white p-8 rounded-[32px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100">
              <div className="w-12 h-12 bg-[#E8F2FF] text-[#007AFF] rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              </div>
              <h2 className="text-lg font-bold text-slate-800 mb-2">เริ่มต้นการตั้งค่าระบบ</h2>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                สร้างอพาร์ตเม้นท์ของคุณ เพิ่มห้องพัก และรับผู้เช่าใหม่เข้าสู่ระบบ เพื่อเริ่มต้นการบริหารจัดการที่มีประสิทธิภาพ
              </p>
              <div className="flex gap-3">
                <Link href="/dashboard/rooms" className="text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-full transition-colors">
                  จัดการห้องพัก →
                </Link>
                <Link href="/dashboard/tenants" className="text-sm font-semibold text-slate-600 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-full transition-colors">
                  ดูรายชื่อผู้เช่า
                </Link>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[32px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100">
              <div className="w-12 h-12 bg-[#E8F8F5] text-[#34C759] rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <h2 className="text-lg font-bold text-slate-800 mb-2">ออกบิลอัตโนมัติ</h2>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                ระบบจัดการบิลให้ง่ายขึ้น คุณสามารถกดออกบิลรายเดือนส่งให้ผู้เช่า หรือติดตามสถานะการชำระได้ทันที
              </p>
              <div className="flex gap-3">
                <Link href="/dashboard/billing" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-full transition-colors">
                  ออกบิลเดือนนี้ →
                </Link>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Tenant Dashboard */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-indigo-50 border border-indigo-100 p-8 rounded-3xl text-indigo-900">
            <h2 className="text-xl font-bold mb-2">บิลค่าเช่าของฉัน</h2>
            <p className="text-indigo-600 text-sm mb-6">ดูรายละเอียดค่าใช้จ่ายและชำระเงินผ่าน QR Code</p>
            <Link href="/dashboard/my-bills">
              <Button className="bg-white text-indigo-600 hover:bg-white border border-indigo-200 font-semibold rounded-full px-6 shadow-sm">
                จ่ายบิล / ดูใบเสร็จ
              </Button>
            </Link>
          </div>
          
          <div className="bg-orange-50 border border-orange-100 p-8 rounded-3xl text-orange-900">
            <h2 className="text-xl font-bold mb-2">บริการแจ้งซ่อม</h2>
            <p className="text-orange-600 text-sm mb-6">มีปัญหาภายในห้อง? แจ้งให้ช่างเข้าตรวจสอบได้ทันที</p>
            <Link href="/dashboard/maintenance">
              <Button className="bg-white text-orange-600 hover:bg-white border border-orange-200 font-semibold rounded-full px-6 shadow-sm">
                แจ้งซ่อมด่วน
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
