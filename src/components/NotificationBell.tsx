"use client";

import { useState, useRef, useEffect } from "react";
import useSWR from "swr";
import { Zap, Wrench, Package, Bell, CheckCheck, Loader2 } from "lucide-react";
import { jsonFetcher } from "@/lib/fetcher";
import { toast } from "sonner";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

const TYPE_ICONS: Record<string, any> = {
  BILL: Zap,
  MAINTENANCE: Wrench,
  PARCEL: Package,
  SYSTEM: Bell,
};

const TYPE_BG: Record<string, string> = {
  BILL: "bg-blue-50 text-blue-600 border-blue-100",
  MAINTENANCE: "bg-orange-50 text-orange-600 border-orange-100",
  PARCEL: "bg-emerald-50 text-emerald-600 border-emerald-100",
  SYSTEM: "bg-purple-50 text-purple-600 border-purple-100",
};

export default function NotificationBell({ hasUnpaidBills: _ }: { hasUnpaidBills?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data, mutate, isLoading } = useSWR<{ notifications: NotificationItem[] }>(
    "/api/notifications",
    jsonFetcher,
    { refreshInterval: 15000 } // Auto refresh every 15s
  );

  const notifications = data?.notifications || [];
  const unreadNotifications = notifications.filter((n) => !n.read);
  const hasUnread = unreadNotifications.length > 0;

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

  async function handleMarkAsRead(id: string) {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        mutate();
      } else {
        const err = await res.json();
        toast.error(err.error || "เกิดข้อผิดพลาด");
      }
    } catch {
      toast.error("การเชื่อมต่อล้มเหลว");
    }
  }

  async function handleMarkAllAsRead() {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        mutate();
        toast.success("ทำเครื่องหมายเป็นอ่านแล้วทั้งหมด");
      } else {
        const err = await res.json();
        toast.error(err.error || "เกิดข้อผิดพลาด");
      }
    } catch {
      toast.error("การเชื่อมต่อล้มเหลว");
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2.5 rounded-full transition-all duration-300 mr-2 group cursor-pointer ${
          isOpen ? "bg-slate-200 text-slate-700" : "hover:bg-slate-100 text-slate-500"
        }`}
      >
        <Bell className="w-5 h-5 transition-transform duration-300 group-hover:scale-105" />
        {hasUnread && (
          <span className="absolute top-1.5 right-1.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
        )}
      </button>

      {isOpen && (
        <div className="fixed md:absolute top-20 md:top-auto left-4 md:left-auto right-4 md:right-0 mt-2 w-auto md:w-80 bg-white rounded-3xl shadow-[0_10px_35px_rgba(0,0,0,0.08)] border border-slate-100 p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <h3 className="px-4 py-2 text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 mb-2 flex justify-between items-center">
            การแจ้งเตือน
            {hasUnread && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-[var(--jh-blue)] hover:text-blue-800 font-extrabold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                อ่านทั้งหมด
              </button>
            )}
          </h3>

          <div className="max-h-72 overflow-y-auto space-y-1">
            {isLoading ? (
              <div className="py-8 flex items-center justify-center text-slate-400 gap-1.5 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                กำลังโหลด...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                  <Bell className="w-6 h-6" />
                </div>
                <p className="text-slate-400 text-sm font-medium">ไม่มีการแจ้งเตือน</p>
              </div>
            ) : (
              notifications.map((item) => {
                const Icon = TYPE_ICONS[item.type] || Bell;
                const iconColor = TYPE_BG[item.type] || "bg-slate-100 text-slate-500";
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (!item.read) handleMarkAsRead(item.id);
                    }}
                    className={`flex items-start gap-3 p-3 rounded-2xl transition-all duration-300 cursor-pointer ${
                      item.read ? "opacity-60 hover:bg-slate-50/50" : "bg-slate-50/50 hover:bg-slate-50 border border-slate-100/50"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${iconColor}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs font-bold truncate ${item.read ? "text-slate-600" : "text-slate-800"}`}>
                          {item.title}
                        </p>
                        {!item.read && (
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0"></span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed break-words">
                        {item.message}
                      </p>
                      <p className="text-[9px] text-slate-400 mt-1">
                        {new Date(item.createdAt).toLocaleDateString("th-TH", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
