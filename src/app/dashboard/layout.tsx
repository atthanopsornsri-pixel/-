import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Check for unpaid SaaS bills to show notification badge for Owner
  let hasUnpaidBills = false;
  if (session.user.role === "OWNER") {
    const unpaidCount = await prisma.subscriptionBill.count({
      where: { 
        ownerId: session.user.id,
        status: "UNPAID"
      }
    });
    hasUnpaidBills = unpaidCount > 0;
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex font-sans text-[#1D1D1F]">
      {/* Sidebar - Light Pastel Design */}
      <aside className="w-72 bg-[#F5F5F7] text-[#1D1D1F] hidden md:flex flex-col border-r border-slate-200/40 relative z-20">
        <div className="p-8 pb-4">
          <Link href="/" className="flex items-center gap-3 mb-2 group cursor-pointer hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-200 group-hover:scale-105 transition-transform">
              <span className="font-bold text-xl">A</span>
            </div>
            <div className="text-2xl font-extrabold tracking-tight text-slate-800">
              Apartment<span className="text-blue-500">OS</span>
            </div>
          </Link>
          <div className="inline-block mt-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-500">
            Role: {session.user.role}
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <Link href="/dashboard" className="flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-all group font-medium">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center mr-3 group-hover:scale-105 group-hover:bg-blue-100 transition-transform">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            </div>
            ภาพรวมระบบ
          </Link>

          {session.user.role === "OWNER" && (
            <>
              <div className="pt-6 pb-2 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">การจัดการ</div>
              
              <Link href="/dashboard/properties" className="flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-purple-50 hover:text-purple-700 transition-all group font-medium">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-500 flex items-center justify-center mr-3 group-hover:scale-105 group-hover:bg-purple-100 transition-transform">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </div>
                หอพักของฉัน
              </Link>
              <Link href="/dashboard/rooms" className="flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition-all group font-medium">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center mr-3 group-hover:scale-105 group-hover:bg-emerald-100 transition-transform">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </div>
                จัดการห้องพัก
              </Link>
              <Link href="/dashboard/tenants" className="flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-amber-50 hover:text-amber-700 transition-all group font-medium">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center mr-3 group-hover:scale-105 group-hover:bg-amber-100 transition-transform">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                </div>
                รายชื่อผู้เช่า
              </Link>
              <Link href="/dashboard/saas-billing" className="flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-rose-50 hover:text-rose-700 transition-all group font-medium">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center mr-3 group-hover:scale-105 group-hover:bg-rose-100 transition-transform">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                </div>
                ค่าบริการระบบ (SaaS)
              </Link>
              
              <div className="pt-6 pb-2 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">การเงิน & แจ้งซ่อม</div>
              
              <Link href="/dashboard/billing" className="flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-rose-50 hover:text-rose-700 transition-all group font-medium">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center mr-3 group-hover:scale-105 group-hover:bg-rose-100 transition-transform">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" /></svg>
                </div>
                ออกบิล & ค่าน้ำไฟ
              </Link>
              <Link href="/dashboard/maintenance" className="flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-cyan-50 hover:text-cyan-700 transition-all group font-medium">
                <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-500 flex items-center justify-center mr-3 group-hover:scale-105 group-hover:bg-cyan-100 transition-transform">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                ระบบแจ้งซ่อม
              </Link>
              <Link href="/dashboard/parcels" className="flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-orange-50 hover:text-orange-700 transition-all group font-medium">
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center mr-3 group-hover:scale-105 group-hover:bg-orange-100 transition-transform">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                </div>
                ระบบพัสดุ
              </Link>
            </>
          )}

          {session.user.role === "TENANT" && (
            <>
              <div className="pt-6 pb-2 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">บริการลูกบ้าน</div>
              <Link href="/dashboard/my-bills" className="flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-green-50 hover:text-green-700 transition-all group font-medium">
                <div className="w-8 h-8 rounded-lg bg-green-50 text-green-500 flex items-center justify-center mr-3 group-hover:scale-105 group-hover:bg-green-100 transition-transform">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                </div>
                บิลค่าเช่าของฉัน
              </Link>
              <Link href="/dashboard/maintenance" className="flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-cyan-50 hover:text-cyan-700 transition-all group font-medium">
                <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-500 flex items-center justify-center mr-3 group-hover:scale-105 group-hover:bg-cyan-100 transition-transform">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </div>
                แจ้งซ่อม
              </Link>
              <Link href="/dashboard/parcels" className="flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-orange-50 hover:text-orange-700 transition-all group font-medium">
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center mr-3 group-hover:scale-105 group-hover:bg-orange-100 transition-transform">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                </div>
                พัสดุของฉัน
              </Link>
            </>
          )}

          {session.user.role === "ADMIN" && (
            <>
              <div className="pt-6 pb-2 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Super Admin</div>
              <Link href="/dashboard/admin/codes" className="flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 transition-all group font-medium">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center mr-3 group-hover:scale-105 group-hover:bg-indigo-100 transition-transform">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                </div>
                ออก Invite Code
              </Link>
              <Link href="/dashboard/admin/owners" className="flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-purple-50 hover:text-purple-700 transition-all group font-medium">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-500 flex items-center justify-center mr-3 group-hover:scale-105 group-hover:bg-purple-100 transition-transform">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                </div>
                จัดการเจ้าของหอพัก
              </Link>
              <Link href="/dashboard/admin/bills" className="flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-rose-50 hover:text-rose-700 transition-all group font-medium">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center mr-3 group-hover:scale-105 group-hover:bg-rose-100 transition-transform">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" /></svg>
                </div>
                บิลค่าบริการ (SaaS)
              </Link>
              <Link href="/dashboard/admin/settings" className="flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-700 transition-all group font-medium">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center mr-3 group-hover:scale-105 group-hover:bg-slate-200 transition-transform">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                หน้า Landing Page
              </Link>
            </>
          )}

          <div className="pt-6 pb-2 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">ระบบ</div>
          <Link href="/dashboard/settings" className="flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-all group font-medium">
            <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center mr-3 group-hover:scale-105 group-hover:bg-slate-200 transition-transform">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            ตั้งค่า / LINE Notify
          </Link>
          
          <div className="pt-6 pb-2 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">เว็บไซต์</div>
          <Link href="/" className="flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-all group font-medium">
            <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center mr-3 group-hover:scale-105 group-hover:bg-slate-200 transition-transform">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            </div>
            กลับหน้าเว็บไซต์หลัก
          </Link>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative min-h-screen">
        
        {/* Top Header - White minimal */}
        <header className="h-20 bg-[#F5F5F7]/80 backdrop-blur-xl border-b border-slate-200/40 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200 text-slate-500 font-bold">
              {session.user.name?.charAt(0) || session.user.email?.charAt(0) || "U"}
            </div>
            <div>
              <div className="font-bold text-slate-700 text-sm md:text-base leading-tight">
                {session.user.name || "ผู้ใช้งานระบบ"}
              </div>
              <div className="text-xs text-slate-500">
                {session.user.email}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            {session.user.role === "OWNER" && (
              <Link href="/dashboard/saas-billing" className="relative p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors mr-2 group">
                <svg className="w-5 h-5 group-hover:text-slate-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                {hasUnpaidBills && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </Link>
            )}

            <form action="/api/auth/signout" method="POST">
              <Button type="submit" variant="ghost" className="text-slate-500 hover:text-red-600 hover:bg-red-50 font-medium rounded-full px-6 transition-colors">
                ออกจากระบบ
              </Button>
            </form>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 md:p-10 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
