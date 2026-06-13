"use client";

import { AlertTriangle, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConfirmDeleteDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  subtitle?: string;
  impacts: string[];
  isDeleting?: boolean;
}

export function ConfirmDeleteDialog({
  open,
  onClose,
  onConfirm,
  title,
  subtitle,
  impacts,
  isDeleting = false,
}: ConfirmDeleteDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 flex items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: "#fff1f0", color: "#ff3b30", boxShadow: "0 8px 20px -6px rgba(255,59,48,0.25)" }}
            >
              <AlertTriangle className="w-6 h-6" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-[17px] font-bold text-slate-900 leading-snug">{title}</h3>
              {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Impact list */}
        <div className="mx-6 mb-5 rounded-2xl bg-red-50 border border-red-100 p-4 space-y-2.5">
          <p className="text-[11px] font-bold text-red-500 uppercase tracking-widest mb-3">
            สิ่งที่จะถูกลบถาวร
          </p>
          {impacts.map((item, i) => (
            <div key={i} className="flex items-center gap-2.5 text-sm text-red-700">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
              {item}
            </div>
          ))}
        </div>

        {/* Warning note */}
        <p className="mx-6 mb-6 text-[13px] text-slate-500 leading-relaxed">
          การดำเนินการนี้{" "}
          <span className="font-semibold text-slate-700">ไม่สามารถย้อนกลับได้</span>{" "}
          — กรุณาตรวจสอบให้แน่ใจก่อนดำเนินการ
        </p>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <Button
            variant="outline"
            className="flex-1 rounded-full h-12 border-slate-200 text-slate-600 font-semibold"
            onClick={onClose}
            disabled={isDeleting}
          >
            ยกเลิก
          </Button>
          <Button
            className="flex-1 rounded-full h-12 bg-red-500 hover:bg-red-600 text-white font-semibold flex items-center justify-center gap-2"
            style={{ boxShadow: "0 8px 18px -6px rgba(255,59,48,0.4)" }}
            onClick={onConfirm}
            disabled={isDeleting}
          >
            <Trash2 className="w-4 h-4" />
            {isDeleting ? "กำลังลบ..." : "ลบถาวร"}
          </Button>
        </div>
      </div>
    </div>
  );
}
