"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

interface MobileNavProps {
  role: string;
}

export default function MobileNav({ role }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  const closeNav = () => setIsOpen(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="md:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={closeNav}
        />
      )}

      {/* Sidebar Panel */}
      <div className={`fixed top-0 left-0 h-full w-72 bg-[#F5F5F7] text-[#1D1D1F] z-50 transform transition-transform duration-300 ease-in-out md:hidden flex flex-col shadow-xl ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center justify-between border-b border-slate-200/40">
          <Link href="/" onClick={closeNav} className="flex items-center gap-3 group cursor-pointer hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 shadow-sm border border-blue-200">
              <span className="font-bold text-lg">A</span>
            </div>
            <div className="text-xl font-extrabold tracking-tight text-slate-800">
              Apartment<span className="text-blue-500">OS</span>
            </div>
          </Link>
          <button onClick={closeNav} className="p-2 rounded-full hover:bg-slate-200 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <Link href="/dashboard" onClick={closeNav} className="flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-all font-medium">
            ภาพรวมระบบ
          </Link>

          {role === "OWNER" && (
            <>
              <div className="pt-6 pb-2 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">การจัดการ</div>
              <Link href="/dashboard/properties" onClick={closeNav} className="flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-purple-50 hover:text-purple-700 transition-all font-medium">
                หอพักของฉัน
              </Link>
              <Link href="/dashboard/rooms" onClick={closeNav} className="flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition-all font-medium">
                จัดการห้องพัก
              </Link>
              <Link href="/dashboard/settings/contract" onClick={closeNav} className="flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 transition-all font-medium">
                ตั้งค่าสัญญาเช่า
              </Link>
              <Link href="/dashboard/tenants" onClick={closeNav} className="flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-amber-50 hover:text-amber-700 transition-all font-medium">
                รายชื่อผู้เช่า
              </Link>
              <Link href="/dashboard/saas-billing" onClick={closeNav} className="flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-rose-50 hover:text-rose-700 transition-all font-medium">
                ค่าบริการระบบ (SaaS)
              </Link>
              
              <div className="pt-6 pb-2 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">การเงิน & แจ้งซ่อม</div>
              <Link href="/dashboard/billing" onClick={closeNav} className="flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-rose-50 hover:text-rose-700 transition-all font-medium">
                ออกบิล & ค่าน้ำไฟ
              </Link>
              <Link href="/dashboard/maintenance" onClick={closeNav} className="flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-cyan-50 hover:text-cyan-700 transition-all font-medium">
                ระบบแจ้งซ่อม
              </Link>
              <Link href="/dashboard/parcels" onClick={closeNav} className="flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-orange-50 hover:text-orange-700 transition-all font-medium">
                ระบบพัสดุ
              </Link>
            </>
          )}

          {role === "TENANT" && (
            <>
              <div className="pt-6 pb-2 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">บริการลูกบ้าน</div>
              <Link href="/dashboard/my-contract" onClick={closeNav} className="flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 transition-all font-medium">
                สัญญาเช่าของฉัน
              </Link>
              <Link href="/dashboard/my-bills" onClick={closeNav} className="flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-green-50 hover:text-green-700 transition-all font-medium">
                บิลค่าเช่าของฉัน
              </Link>
              <Link href="/dashboard/maintenance" onClick={closeNav} className="flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-cyan-50 hover:text-cyan-700 transition-all font-medium">
                แจ้งซ่อม
              </Link>
              <Link href="/dashboard/parcels" onClick={closeNav} className="flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-orange-50 hover:text-orange-700 transition-all font-medium">
                พัสดุของฉัน
              </Link>
            </>
          )}

          {role === "ADMIN" && (
            <>
              <div className="pt-6 pb-2 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Super Admin</div>
              <Link href="/dashboard/admin/codes" onClick={closeNav} className="flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 transition-all font-medium">
                ออก Invite Code
              </Link>
              <Link href="/dashboard/admin/owners" onClick={closeNav} className="flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-purple-50 hover:text-purple-700 transition-all font-medium">
                จัดการเจ้าของหอพัก
              </Link>
              <Link href="/dashboard/admin/bills" onClick={closeNav} className="flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-rose-50 hover:text-rose-700 transition-all font-medium">
                บิลค่าบริการ (SaaS)
              </Link>
              <Link href="/dashboard/admin/settings" onClick={closeNav} className="flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-700 transition-all font-medium">
                หน้า Landing Page
              </Link>
            </>
          )}

          <div className="pt-6 pb-2 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">ระบบ</div>
          <Link href="/dashboard/settings" onClick={closeNav} className="flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 transition-all font-medium">
            ตั้งค่า / LINE Notify
          </Link>
          
          <div className="pt-6 pb-2 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">เว็บไซต์</div>
          <Link href="/" onClick={closeNav} className="flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 transition-all font-medium">
            กลับหน้าเว็บไซต์หลัก
          </Link>
        </nav>
      </div>
    </>
  );
}
