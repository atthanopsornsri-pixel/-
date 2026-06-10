"use client";

/**
 * SuccessPopup — modal ยืนยันสำเร็จ (แทน toast สำหรับ action สำคัญ)
 * ใช้แทน toast.success เพื่อให้เห็นชัดและ interactive มากขึ้น
 */

import { useEffect } from "react";
import { CheckCircle2, X } from "lucide-react";

interface SuccessPopupProps {
  open: boolean;
  title: string;
  message?: string;
  autoCloseMs?: number; // auto-close หลัง N ms (default: ไม่ auto-close)
  onClose: () => void;
}

export default function SuccessPopup({
  open,
  title,
  message,
  autoCloseMs,
  onClose,
}: SuccessPopupProps) {
  // Auto close
  useEffect(() => {
    if (!open || !autoCloseMs) return;
    const t = setTimeout(onClose, autoCloseMs);
    return () => clearTimeout(t);
  }, [open, autoCloseMs, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm bg-white rounded-[var(--jh-radius-2xl)] shadow-2xl p-8 text-center animate-in zoom-in-95 duration-200 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: "linear-gradient(150deg, #f3fcf6 0%, #e0f7e9 100%)" }}
        >
          <CheckCircle2
            className="w-9 h-9"
            style={{ color: "#34c759" }}
            strokeWidth={2}
          />
        </div>

        {/* Text */}
        <h3 className="text-lg font-bold text-slate-800 leading-snug">{title}</h3>
        {message && (
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">{message}</p>
        )}

        {/* CTA */}
        <button
          onClick={onClose}
          className="mt-6 w-full py-2.5 rounded-full text-sm font-bold text-white transition-all hover:-translate-y-0.5 cursor-pointer"
          style={{ background: "#34c759", boxShadow: "0 8px 18px -6px #34c759" }}
        >
          รับทราบ
        </button>
      </div>
    </div>
  );
}
