"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

export default function NotificationBell({ hasUnpaidBills }: { hasUnpaidBills: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className={`relative p-2 rounded-full transition-colors mr-2 group ${isOpen ? "bg-slate-200 text-slate-700" : "hover:bg-slate-100 text-slate-500"}`}
      >
        <svg className="w-5 h-5 group-hover:text-slate-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
        {hasUnpaidBills && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <h3 className="px-4 py-2 text-sm font-bold text-slate-800 border-b border-slate-100 mb-2 flex justify-between items-center">
            การแจ้งเตือน
            {hasUnpaidBills && <span className="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full font-bold">1 ใหม่</span>}
          </h3>
          
          {hasUnpaidBills ? (
            <Link href="/dashboard/saas-billing" onClick={() => setIsOpen(false)} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
              <div className="w-8 h-8 rounded-full bg-red-100 text-red-500 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">บิลค่าบริการใหม่</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">คุณมียอดค้างชำระค่าบริการระบบ JadHor OS กรุณาตรวจสอบและชำระเงิน</p>
              </div>
            </Link>
          ) : (
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              </div>
              <p className="text-slate-400 text-sm font-medium">ไม่มีการแจ้งเตือนใหม่</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
