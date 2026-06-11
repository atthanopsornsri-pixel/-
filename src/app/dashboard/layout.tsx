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
import PageWrapper from "@/components/PageWrapper";
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

  // >>> PLAN EXPIRATION LOGIC >>>
  let isExpired = false;
  let daysLeft = 999;
  let isFreeTrial = false;
  let planTierLabel = "";

  if (session.user.role === "OWNER") {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { planTier: true, planExpiresAt: true }
    });

    if (dbUser) {
      const now = new Date();
      isFreeTrial = dbUser.planTier === "FREE_TRIAL";
      planTierLabel = dbUser.planTier ?? "FREE_TRIAL";

      if (dbUser.planExpiresAt) {
        const expiresAt = new Date(dbUser.planExpiresAt);
        isExpired = now > expiresAt;
        daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }

      // Redirect if plan expired AND NOT already on the subscription page (prevent loop)
      if (isExpired && pathname !== "/dashboard/subscription") {
        redirect("/dashboard/subscription?expired=true");
      }
    }
  }
  // <<< END PLAN EXPIRATION LOGIC <<<

  // Check for unpaid SaaS bills (Deferred to AsyncNotificationBell)

  return (
    <div className="min-h-screen flex font-sans bg-[var(--jh-surface)] text-[var(--jh-ink)]">
      {/* Sidebar */}
      <aside className="w-[280px] flex-shrink-0 bg-[var(--jh-surface)] hidden md:flex flex-col border-r border-black/[0.06] relative z-20">
        <div className="px-6 pt-7 pb-3">
          <Link href="/" className="flex items-center gap-3 mb-3 group cursor-pointer hover:opacity-80 transition-opacity">
            <div className="relative h-12 w-12 flex-shrink-0 group-hover:scale-105 transition-transform">
              <Image src="/images/logo-mascot.png" alt="มาสคอต JadHor OS" fill className="object-contain" priority />
            </div>
            <div className="flex flex-col">
              <span className="text-[19px] font-bold text-[var(--jh-ink)] tracking-[-0.02em] leading-none">JadHor OS</span>
              <span className="text-[10px] font-semibold text-[var(--jh-ink-tertiary)] uppercase tracking-[0.1em] mt-1">Property Manager</span>
            </div>
          </Link>
          <div className="inline-block px-3 py-1 rounded-full bg-white border border-[var(--jh-border)] text-xs font-medium text-[var(--jh-ink-secondary)]">
            Role: {session.user.role}
          </div>
        </div>

        <SidebarNav role={session.user.role || "TENANT"} />
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col relative min-h-screen max-w-[100vw]">

        {/* Glass header — iCloud toolbar feel */}
        <header className="h-[72px] bg-[var(--jh-glass-bg)] backdrop-blur-xl backdrop-saturate-150 border-b border-black/[0.06] flex items-center justify-between px-4 md:px-8 sticky top-0 z-50 w-full max-w-[100vw]">
          <div className="flex items-center gap-3 md:gap-4 truncate">
            <MobileNav role={session.user.role || "TENANT"} />

            <div className="w-9 h-9 md:w-10 md:h-10 bg-[var(--jh-surface)] rounded-full flex items-center justify-center border border-[var(--jh-border)] text-[var(--jh-ink-secondary)] font-semibold shrink-0">
              {session.user.name?.charAt(0) || session.user.email?.charAt(0) || "U"}
            </div>
            <div className="truncate">
              <div className="font-semibold text-[var(--jh-ink)] text-sm md:text-[15px] leading-tight truncate">
                {session.user.name || "ผู้ใช้งานระบบ"}
              </div>
              <div className="text-[10px] md:text-xs text-[var(--jh-ink-tertiary)] truncate">
                {session.user.email}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-2 shrink-0">
            {session.user.role === "OWNER" && (
              <Suspense fallback={<div className="w-9 h-9 animate-pulse bg-[var(--jh-surface-hover)] rounded-full mr-2" />}>
                <AsyncNotificationBell userId={session.user.id} role={session.user.role} />
              </Suspense>
            )}
            <SignOutButton />
          </div>
        </header>

        {/* 🟡 แถบแจ้งเตือนแพ็กเกจ — แสดงเมื่อเหลือเวลา ≤ 7 วัน (ทุก plan tier) */}
        {daysLeft > 0 && daysLeft <= 7 && (
          <div
            className="px-4 py-2.5 text-center text-sm font-medium border-b shadow-sm z-40 relative flex flex-col sm:flex-row items-center justify-center gap-2"
            style={isFreeTrial
              ? { background: "#fffbeb", color: "#92400e", borderColor: "#fde68a" }
              : { background: "#fff5f4", color: "#991b1b", borderColor: "#fecaca" }}
          >
            <span>
              {isFreeTrial
                ? <>ช่วงทดลองใช้ฟรีเหลืออีก <strong>{daysLeft} วัน</strong></>
                : <>แพ็กเกจ <strong>{planTierLabel}</strong> หมดอายุในอีก <strong>{daysLeft} วัน</strong></>}
            </span>
            <Link
              href="/dashboard/subscription"
              className="inline-flex items-center gap-1 font-bold px-3 py-1 rounded-full transition-colors text-xs"
              style={isFreeTrial
                ? { background: "#fef3c7", color: "#92400e" }
                : { background: "#fee2e2", color: "#991b1b" }}
            >
              {isFreeTrial ? "ดูแพ็กเกจอัปเกรด" : "ต่ออายุแพ็กเกจ"}
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-10 overflow-auto w-full max-w-[100vw]">
          <PageWrapper>{children}</PageWrapper>
        </main>
      </div>
    </div>
  );
}
