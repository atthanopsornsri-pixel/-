"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";

interface MobileNavProps {
  role: string;
}

export default function MobileNav({ role }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const closeNav = () => setIsOpen(false);

  const sidebarContent = (
    <div className="md:hidden">
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-[9998]" 
          onClick={closeNav}
        />
      )}

      {/* Sidebar Panel */}
      <div className={`fixed top-0 left-0 h-[100dvh] w-72 bg-[#F5F5F7] text-[#1D1D1F] z-[9999] transform transition-transform duration-300 ease-in-out flex flex-col shadow-2xl ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center justify-between border-b border-slate-200/40">
          <Link href="/" onClick={closeNav} className="flex items-center gap-3 group cursor-pointer hover:opacity-80 transition-opacity">
            <div className="relative h-10 w-10 flex-shrink-0 bg-white rounded-xl shadow-sm border border-slate-100 p-1 group-hover:scale-105 transition-transform">
              <Image src="/images/logo.png" alt="JadHor OS Logo" fill className="object-contain" priority />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-extrabold text-slate-800 tracking-tight leading-none">JadHor OS</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Property Manager</span>
            </div>
          </Link>
          <button onClick={closeNav} className="p-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
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
    </div>
  );

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="md:hidden flex items-center justify-center w-10 h-10 shrink-0 rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 shadow-sm transition-colors z-20"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>

      {mounted && createPortal(sidebarContent, document.body)}
    </>
  );
}
