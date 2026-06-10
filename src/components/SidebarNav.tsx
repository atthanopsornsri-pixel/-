"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface SidebarNavProps {
  role: string;
}

export default function SidebarNav({ role }: SidebarNavProps) {
  const pathname = usePathname() || "";
  const [pendingMaintenance, setPendingMaintenance] = useState(0);

  // โหลด badge จำนวนงานซ่อมรอดำเนินการ (เฉพาะ OWNER)
  useEffect(() => {
    if (role !== "OWNER") return;
    async function loadCounts() {
      try {
        const res = await fetch("/api/maintenance/counts");
        if (res.ok) {
          const data = await res.json();
          setPendingMaintenance((data.pending ?? 0) + (data.inProgress ?? 0));
        }
      } catch {
        // ไม่แสดง error — badge แค่ไม่ขึ้น
      }
    }
    loadCounts();
    // รีเฟรชทุก 60 วินาที
    const interval = setInterval(loadCounts, 60_000);
    return () => clearInterval(interval);
  }, [role]);

  return (
    <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
      <Link href="/dashboard" className={`flex items-center px-4 py-3 rounded-xl transition-all group font-medium ${pathname === "/dashboard" ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"}`}>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 group-hover:scale-105 transition-transform ${pathname === "/dashboard" ? "bg-blue-100 text-blue-600" : "bg-blue-50 text-blue-500 group-hover:bg-blue-100"}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
        </div>
        {role === "TENANT" ? "หน้าหลัก" : "ภาพรวมระบบ"}
      </Link>

      {role === "OWNER" && (
        <>
          <div className="pt-6 pb-2 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">การจัดการ</div>
          
          <Link href="/dashboard/properties" className={`flex items-center px-4 py-3 rounded-xl transition-all group font-medium ${pathname.startsWith("/dashboard/properties") ? "bg-purple-50 text-purple-700" : "text-slate-600 hover:bg-purple-50 hover:text-purple-700"}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 group-hover:scale-105 transition-transform ${pathname.startsWith("/dashboard/properties") ? "bg-purple-100 text-purple-600" : "bg-purple-50 text-purple-500 group-hover:bg-purple-100"}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            </div>
            หอพักของฉัน
          </Link>
          <Link href="/dashboard/rooms" className={`flex items-center px-4 py-3 rounded-xl transition-all group font-medium ${pathname.startsWith("/dashboard/rooms") ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 group-hover:scale-105 transition-transform ${pathname.startsWith("/dashboard/rooms") ? "bg-emerald-100 text-emerald-600" : "bg-emerald-50 text-emerald-500 group-hover:bg-emerald-100"}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            </div>
            จัดการห้องพัก
          </Link>
          <Link href="/dashboard/settings/contract" className={`flex items-center px-4 py-3 rounded-xl transition-all group font-medium ${pathname.startsWith("/dashboard/settings/contract") ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 group-hover:scale-105 transition-transform ${pathname.startsWith("/dashboard/settings/contract") ? "bg-indigo-100 text-indigo-600" : "bg-indigo-50 text-indigo-500 group-hover:bg-indigo-100"}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            ตั้งค่าสัญญาเช่า
          </Link>
          <Link href="/dashboard/tenants" className={`flex items-center px-4 py-3 rounded-xl transition-all group font-medium ${pathname.startsWith("/dashboard/tenants") ? "bg-amber-50 text-amber-700" : "text-slate-600 hover:bg-amber-50 hover:text-amber-700"}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 group-hover:scale-105 transition-transform ${pathname.startsWith("/dashboard/tenants") ? "bg-amber-100 text-amber-600" : "bg-amber-50 text-amber-500 group-hover:bg-amber-100"}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            </div>
            รายชื่อผู้เช่า
          </Link>
          <Link href="/dashboard/subscription" className={`flex items-center px-4 py-3 rounded-xl transition-all group font-medium ${pathname.startsWith("/dashboard/subscription") ? "bg-rose-50 text-rose-700" : "text-slate-600 hover:bg-rose-50 hover:text-rose-700"}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 group-hover:scale-105 transition-transform ${pathname.startsWith("/dashboard/subscription") ? "bg-rose-100 text-rose-600" : "bg-rose-50 text-rose-500 group-hover:bg-rose-100"}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
            </div>
            แพ็กเกจการใช้งาน
          </Link>
          
          <Link href="/dashboard/analytics" className={`flex items-center px-4 py-3 rounded-xl transition-all group font-medium ${pathname.startsWith("/dashboard/analytics") ? "bg-violet-50 text-violet-700" : "text-slate-600 hover:bg-violet-50 hover:text-violet-700"}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 group-hover:scale-105 transition-transform ${pathname.startsWith("/dashboard/analytics") ? "bg-violet-100 text-violet-600" : "bg-violet-50 text-violet-500 group-hover:bg-violet-100"}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10l2 2 4-4" /></svg>
            </div>
            <span className="flex-1">วิเคราะห์รายได้ AI</span>
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600">AI</span>
          </Link>

          <div className="pt-6 pb-2 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">การเงิน & แจ้งซ่อม</div>
          
          <Link href="/dashboard/meters" className={`flex items-center px-4 py-3 rounded-xl transition-all group font-medium ${pathname.startsWith("/dashboard/meters") ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 group-hover:scale-105 transition-transform ${pathname.startsWith("/dashboard/meters") ? "bg-blue-100 text-blue-600" : "bg-blue-50 text-blue-500 group-hover:bg-blue-100"}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" /></svg>
            </div>
            จดมิเตอร์แบบเร็ว
          </Link>
          <Link href="/dashboard/billing" className={`flex items-center px-4 py-3 rounded-xl transition-all group font-medium ${pathname.startsWith("/dashboard/billing") ? "bg-rose-50 text-rose-700" : "text-slate-600 hover:bg-rose-50 hover:text-rose-700"}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 group-hover:scale-105 transition-transform ${pathname.startsWith("/dashboard/billing") ? "bg-rose-100 text-rose-600" : "bg-rose-50 text-rose-500 group-hover:bg-rose-100"}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" /></svg>
            </div>
            ออกบิล & ค่าน้ำไฟ
          </Link>
          <Link href="/dashboard/owner/approvals" className={`flex items-center px-4 py-3 rounded-xl transition-all group font-medium ${pathname.startsWith("/dashboard/owner/approvals") ? "bg-amber-50 text-amber-700" : "text-slate-600 hover:bg-amber-50 hover:text-amber-700"}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 group-hover:scale-105 transition-transform ${pathname.startsWith("/dashboard/owner/approvals") ? "bg-amber-100 text-amber-600" : "bg-amber-50 text-amber-500 group-hover:bg-amber-100"}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
            </div>
            ตรวจสลิปโอนเงิน
          </Link>
          <Link href="/dashboard/maintenance" className={`flex items-center px-4 py-3 rounded-xl transition-all group font-medium ${pathname.startsWith("/dashboard/maintenance") ? "bg-cyan-50 text-cyan-700" : "text-slate-600 hover:bg-cyan-50 hover:text-cyan-700"}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 group-hover:scale-105 transition-transform ${pathname.startsWith("/dashboard/maintenance") ? "bg-cyan-100 text-cyan-600" : "bg-cyan-50 text-cyan-500 group-hover:bg-cyan-100"}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <span className="flex-1">ระบบแจ้งซ่อม</span>
            {pendingMaintenance > 0 && (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white shadow-sm">
                {pendingMaintenance > 99 ? "99+" : pendingMaintenance}
              </span>
            )}
          </Link>
          <Link href="/dashboard/parcels" className={`flex items-center px-4 py-3 rounded-xl transition-all group font-medium ${pathname.startsWith("/dashboard/parcels") ? "bg-orange-50 text-orange-700" : "text-slate-600 hover:bg-orange-50 hover:text-orange-700"}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 group-hover:scale-105 transition-transform ${pathname.startsWith("/dashboard/parcels") ? "bg-orange-100 text-orange-600" : "bg-orange-50 text-orange-500 group-hover:bg-orange-100"}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            </div>
            ระบบพัสดุ
          </Link>
        </>
      )}

      {role === "TENANT" && (
        <>
          <div className="pt-6 pb-2 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">บริการลูกบ้าน</div>
          <Link href="/dashboard/my-contract" className={`flex items-center px-4 py-3 rounded-xl transition-all group font-medium ${pathname.startsWith("/dashboard/my-contract") ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 group-hover:scale-105 transition-transform ${pathname.startsWith("/dashboard/my-contract") ? "bg-indigo-100 text-indigo-600" : "bg-indigo-50 text-indigo-500 group-hover:bg-indigo-100"}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            สัญญาเช่าของฉัน
          </Link>
          <Link href="/dashboard/my-bills" className={`flex items-center px-4 py-3 rounded-xl transition-all group font-medium ${pathname.startsWith("/dashboard/my-bills") ? "bg-green-50 text-green-700" : "text-slate-600 hover:bg-green-50 hover:text-green-700"}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 group-hover:scale-105 transition-transform ${pathname.startsWith("/dashboard/my-bills") ? "bg-green-100 text-green-600" : "bg-green-50 text-green-500 group-hover:bg-green-100"}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            บิลค่าเช่าของฉัน
          </Link>
          <Link href="/dashboard/maintenance" className={`flex items-center px-4 py-3 rounded-xl transition-all group font-medium ${pathname.startsWith("/dashboard/maintenance") ? "bg-cyan-50 text-cyan-700" : "text-slate-600 hover:bg-cyan-50 hover:text-cyan-700"}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 group-hover:scale-105 transition-transform ${pathname.startsWith("/dashboard/maintenance") ? "bg-cyan-100 text-cyan-600" : "bg-cyan-50 text-cyan-500 group-hover:bg-cyan-100"}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </div>
            แจ้งซ่อม
          </Link>
          <Link href="/dashboard/parcels" className={`flex items-center px-4 py-3 rounded-xl transition-all group font-medium ${pathname.startsWith("/dashboard/parcels") ? "bg-orange-50 text-orange-700" : "text-slate-600 hover:bg-orange-50 hover:text-orange-700"}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 group-hover:scale-105 transition-transform ${pathname.startsWith("/dashboard/parcels") ? "bg-orange-100 text-orange-600" : "bg-orange-50 text-orange-500 group-hover:bg-orange-100"}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            </div>
            พัสดุของฉัน
          </Link>

          <div className="pt-6 pb-2 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">บัญชี</div>
          <Link href="/dashboard/my-account" className={`flex items-center px-4 py-3 rounded-xl transition-all group font-medium ${pathname.startsWith("/dashboard/my-account") ? "bg-slate-100 text-slate-800" : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 group-hover:scale-105 transition-transform ${pathname.startsWith("/dashboard/my-account") ? "bg-slate-200 text-slate-700" : "bg-slate-50 text-slate-500 group-hover:bg-slate-200"}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
            </div>
            ตั้งค่าบัญชี / รหัสผ่าน
          </Link>
        </>
      )}

      {role === "ADMIN" && (
        <>
          <div className="pt-6 pb-2 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Super Admin</div>
          <Link href="/dashboard/admin/codes" className={`flex items-center px-4 py-3 rounded-xl transition-all group font-medium ${pathname.startsWith("/dashboard/admin/codes") ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 group-hover:scale-105 transition-transform ${pathname.startsWith("/dashboard/admin/codes") ? "bg-indigo-100 text-indigo-600" : "bg-indigo-50 text-indigo-500 group-hover:bg-indigo-100"}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
            </div>
            ออก Invite Code
          </Link>
          <Link href="/dashboard/admin/owners" className={`flex items-center px-4 py-3 rounded-xl transition-all group font-medium ${pathname.startsWith("/dashboard/admin/owners") ? "bg-purple-50 text-purple-700" : "text-slate-600 hover:bg-purple-50 hover:text-purple-700"}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 group-hover:scale-105 transition-transform ${pathname.startsWith("/dashboard/admin/owners") ? "bg-purple-100 text-purple-600" : "bg-purple-50 text-purple-500 group-hover:bg-purple-100"}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            </div>
            จัดการเจ้าของหอพัก
          </Link>
          <Link href="/dashboard/admin/bills" className={`flex items-center px-4 py-3 rounded-xl transition-all group font-medium ${pathname.startsWith("/dashboard/admin/bills") ? "bg-rose-50 text-rose-700" : "text-slate-600 hover:bg-rose-50 hover:text-rose-700"}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 group-hover:scale-105 transition-transform ${pathname.startsWith("/dashboard/admin/bills") ? "bg-rose-100 text-rose-600" : "bg-rose-50 text-rose-500 group-hover:bg-rose-100"}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" /></svg>
            </div>
            บิลค่าบริการ (SaaS)
          </Link>
          <Link href="/dashboard/admin/settings" className={`flex items-center px-4 py-3 rounded-xl transition-all group font-medium ${pathname.startsWith("/dashboard/admin/settings") ? "bg-slate-50 text-slate-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-700"}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 group-hover:scale-105 transition-transform ${pathname.startsWith("/dashboard/admin/settings") ? "bg-slate-100 text-slate-650" : "bg-slate-50 text-slate-500 group-hover:bg-slate-100"}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            </div>
            หน้า Landing Page
          </Link>
        </>
      )}

      {role !== "TENANT" && (
        <>
          <div className="pt-6 pb-2 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">ระบบ</div>
          <Link href="/dashboard/settings" className={`flex items-center px-4 py-3 rounded-xl transition-all group font-medium ${pathname === "/dashboard/settings" ? "bg-slate-100 text-slate-800" : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 group-hover:scale-105 transition-transform ${pathname === "/dashboard/settings" ? "bg-slate-200 text-slate-700" : "bg-slate-50 text-slate-500 group-hover:bg-slate-200"}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            ตั้งค่า / LINE OA
          </Link>

          <div className="pt-6 pb-2 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">เว็บไซต์</div>
          <Link href="/" className="flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-all group font-medium">
            <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center mr-3 group-hover:scale-105 group-hover:bg-slate-200 transition-transform">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            </div>
            กลับหน้าเว็บไซต์หลัก
          </Link>
        </>
      )}
    </nav>
  );
}
