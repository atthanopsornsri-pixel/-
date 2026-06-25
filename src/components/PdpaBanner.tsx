"use client";

import { useState } from "react";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface PdpaBannerProps {
  initialShow: boolean;
}

export default function PdpaBanner({ initialShow }: PdpaBannerProps) {
  const [show, setShow] = useState(initialShow);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!show) return null;

  const handleAccept = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/users/accept-pdpa", {
        method: "POST",
      });
      if (res.ok) {
        setShow(false);
      }
    } catch (error) {
      console.error("Failed to accept PDPA:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div 
        className="max-w-4xl mx-auto rounded-[var(--jh-radius-2xl)] border border-white/60 p-6 md:p-8 shadow-[var(--jh-shadow-card)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all duration-300"
        style={{ background: "linear-gradient(150deg, #fdf8ee 0%, #f6ecd6 100%)" }}
      >
        <div className="flex items-start gap-4">
          <div 
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--jh-radius-md)] transition-transform duration-300"
            style={{ background: "#d4a548", color: "#fff", boxShadow: "0 10px 22px -8px #d4a548" }}
          >
            <ShieldCheck className="h-6 w-6" strokeWidth={2} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-[#16264c] tracking-[-0.01em]">การคุ้มครองข้อมูลส่วนบุคคล (PDPA)</h3>
            <p className="text-sm text-[var(--jh-orange-ink)] leading-relaxed">
              JadHor OS ใช้คุกกี้และเก็บข้อมูลส่วนบุคคลของท่าน เพื่อประสิทธิภาพการใช้งานระบบจัดการหอพักที่ปลอดภัยและสอดคล้องตามกฎหมาย ท่านสามารถอ่านข้อกำหนดโดยละเอียดที่ 
              <Link href="/terms" className="underline font-semibold ml-1 text-[#34508c] hover:text-[#16264c]">เงื่อนไขการให้บริการ</Link> และ 
              <Link href="/privacy" className="underline font-semibold ml-1 text-[#34508c] hover:text-[#16264c]">นโยบายความเป็นส่วนตัว</Link>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <Button 
            onClick={handleAccept} 
            disabled={isSubmitting}
            className="w-full md:w-auto rounded-full bg-[#16264c] hover:bg-[#34508c] text-white font-bold px-6 h-11 flex items-center justify-center gap-2 shadow-[0_8px_18px_-6px_#16264c] transition-all hover:-translate-y-0.5"
          >
            {isSubmitting ? "กำลังบันทึก..." : "ยอมรับทั้งหมด"}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
