import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import NotificationBell from "@/components/NotificationBell";
import MobileNav from "@/components/MobileNav";
import SignOutButton from "@/components/SignOutButton";
import SidebarNav from "@/components/SidebarNav";
import { Suspense } from "react";

async function AsyncNotificationBell({ userId, role }: { userId: string, role: string }) {
  let hasUnpaidBills = false;
  if (role === "OWNER") {
    const unpaidCount = await prisma.invoice.count({
      where: { 
        ownerId: userId,
        status: "UNPAID"
      }
    });
    hasUnpaidBills = unpaidCount > 0;
  }
  return <NotificationBell hasUnpaidBills={hasUnpaidBills} />;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";

  // >>> TRIAL EXPIRATION LOGIC >>>
  let isExpired = false;
  let daysLeft = 0;
  let isFreeTrial = false;

  if (session.user.role === "OWNER") {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { planTier: true, planExpiresAt: true }
    });

    if (dbUser) {
      const now = new Date();
      const expiresAt = dbUser.planExpiresAt ? new Date(dbUser.planExpiresAt) : now;
      isFreeTrial = dbUser.planTier === "FREE_TRIAL";
      isExpired = isFreeTrial && now > expiresAt;
      daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Redirect if expired AND NOT on the billing page already to prevent loop
      if (isExpired && pathname !== "/dashboard/subscription") {
        redirect("/dashboard/subscription?expired=true");
      }
    }
  }
  // <<< END TRIAL EXPIRATION LOGIC <<<

  // Check for unpaid SaaS bills (Deferred to AsyncNotificationBell)

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex font-sans text-[#1D1D1F]">
      {/* Sidebar - Light Pastel Design */}
      <aside className="w-72 bg-[#F5F5F7] text-[#1D1D1F] hidden md:flex flex-col border-r border-slate-200/40 relative z-20">
        <div className="p-8 pb-4">
          <Link href="/" className="flex items-center gap-3 mb-2 group cursor-pointer hover:opacity-80 transition-opacity">
            <div className="relative h-12 w-12 flex-shrink-0 group-hover:scale-105 transition-transform bg-white rounded-xl shadow-sm border border-slate-100 p-1">
              <Image src="/images/logo.png" alt="JadHor OS Logo" fill className="object-contain" priority />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold text-slate-800 tracking-tight leading-none">JadHor OS</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Property Manager</span>
            </div>
          </Link>
          <div className="inline-block mt-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-500">
            Role: {session.user.role}
          </div>
        </div>

        <SidebarNav role={session.user.role || "TENANT"} />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative min-h-screen max-w-[100vw]">
        
        {/* Top Header - White minimal */}
        <header className="h-20 bg-[#F5F5F7]/80 backdrop-blur-xl border-b border-slate-200/40 flex items-center justify-between px-4 md:px-8 sticky top-0 z-50 w-full max-w-[100vw]">
          <div className="flex items-center gap-3 md:gap-4 truncate">
            <MobileNav role={session.user.role || "TENANT"} />
            
            <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200 text-slate-500 font-bold shrink-0">
              {session.user.name?.charAt(0) || session.user.email?.charAt(0) || "U"}
            </div>
            <div className="truncate">
              <div className="font-bold text-slate-700 text-sm md:text-base leading-tight truncate">
                {session.user.name || "ผู้ใช้งานระบบ"}
              </div>
              <div className="text-[10px] md:text-xs text-slate-500 truncate">
                {session.user.email}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1 md:gap-2 shrink-0">
            {/* Notification Bell */}
            {session.user.role === "OWNER" && (
              <Suspense fallback={<div className="w-9 h-9 animate-pulse bg-slate-200 rounded-full mr-2"></div>}>
                <AsyncNotificationBell userId={session.user.id} role={session.user.role} />
              </Suspense>
            )}

            <SignOutButton />
          </div>
        </header>

        {/* 🟡 แถบแบนเนอร์กดดันจิตวิทยา (โชว์เฉพาะคนที่ยังไม่หมดเวลาและใช้ฟรีอยู่) */}
        {isFreeTrial && daysLeft > 0 && (
          <div className="bg-amber-50 px-4 py-2.5 text-center text-sm font-medium text-amber-800 border-b border-amber-200 shadow-sm z-40 relative flex flex-col sm:flex-row items-center justify-center gap-2">
            <span>คุณกำลังอยู่ในช่วงทดลองใช้ฟรี (เหลือเวลาอีก <strong className="text-amber-900">{daysLeft} วัน</strong>)</span>
            <Link href="/dashboard/subscription" className="inline-flex items-center gap-1 font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 px-3 py-1 rounded-full transition-colors text-xs">
              ดูแพ็กเกจอัปเกรด <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-10 overflow-auto w-full max-w-[100vw]">
          {children}
        </main>
      </div>
    </div>
  );
}
