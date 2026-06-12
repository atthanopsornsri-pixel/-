/* eslint-disable */
"use client";
import { toast } from "sonner";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const compressImage = (file: File, maxWidth = 1920): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

export default function AdminSettingsPage() {
  const [heroHeadline, setHeroHeadline] = useState("");
  const [heroSubheadline, setHeroSubheadline] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [pricingMonthly, setPricingMonthly] = useState("500");
  const [pricingYearly, setPricingYearly] = useState("5000");
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
  
  // Diagnostics audit states
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditReport, setAuditReport] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleRunSystemAudit = async () => {
    setIsAuditing(true);
    setAuditReport(null);
    try {
      const res = await fetch("/api/admin/system-audit", {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setAuditReport(data.report);
        toast.success("ประเมินความสมบูรณ์และระบบรักษาความปลอดภัยเสร็จสิ้น! 🔍");
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || "เกิดข้อผิดพลาดในการตรวจสอบระบบ");
      }
    } catch (e) {
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์หลังบ้าน");
    } finally {
      setIsAuditing(false);
    }
  };

  async function fetchSettings() {
    const res = await fetch("/api/admin/settings");
    if (res.ok) {
      const data = await res.json();
      if (data) {
        setHeroHeadline(data.heroHeadline || "");
        setHeroSubheadline(data.heroSubheadline || "");
        setContactEmail(data.contactEmail || "");
        setContactPhone(data.contactPhone || "");
        if (data.pricingMonthly) setPricingMonthly(data.pricingMonthly.toString());
        if (data.pricingYearly) setPricingYearly(data.pricingYearly.toString());
      }
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      let heroImageUrl = undefined;
      if (heroImageFile) {
        heroImageUrl = await compressImage(heroImageFile);
      }

      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heroHeadline,
          heroSubheadline,
          contactEmail,
          contactPhone,
          pricingMonthly: Number(pricingMonthly),
          pricingYearly: Number(pricingYearly),
          ...(heroImageUrl && { heroImageUrl })
        })
      });

      if (res.ok) {
        toast.success("บันทึกการตั้งค่าหน้า Landing Page สำเร็จ!");
      } else {
        toast.error("เกิดข้อผิดพลาดในการบันทึก");
      }
    } catch (error) {
      console.error(error);
      toast.error("เกิดข้อผิดพลาด");
    }

    setIsSaving(false);
  };

  if (isLoading) return <div className="p-8 text-center text-slate-500">กำลังโหลด...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">ตั้งค่าหน้า Landing Page</h1>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-800 border-b pb-2">ส่วนหัว (Hero Section)</h2>
            <div className="space-y-2">
              <Label>พาดหัวหลัก (Headline)</Label>
              <Input 
                value={heroHeadline} 
                onChange={e => setHeroHeadline(e.target.value)} 
                placeholder="เช่น บริหารจัดการหอพักและอพาร์ตเม้นท์ ง่าย จบ ครบ ในที่เดียว" 
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label>คำบรรยายรอง (Subheadline)</Label>
              <Input 
                value={heroSubheadline} 
                onChange={e => setHeroSubheadline(e.target.value)} 
                placeholder="เช่น หมดปัญหากระดาษกองโต! เปลี่ยนหอพักของคุณให้เป็นระบบดิจิทัล 100%" 
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label>รูปภาพหน้าจอตัวอย่าง (Hero Image Mockup)</Label>
              <Input 
                type="file" 
                accept="image/*" 
                onChange={e => setHeroImageFile(e.target.files?.[0] || null)} 
                className="h-12 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-xs text-slate-500">หากไม่เลือกจะใช้รูปภาพเดิม</p>
            </div>
          </div>

          {/* 
          <div className="space-y-4 pt-6">
            <h2 className="text-xl font-bold text-slate-800 border-b pb-2">ราคาแพ็กเกจ (Pricing)</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>รายเดือน (บาท)</Label>
                <Input type="number" value={pricingMonthly} onChange={e => setPricingMonthly(e.target.value)} className="h-12" />
              </div>
              <div className="space-y-2">
                <Label>รายปี (บาท)</Label>
                <Input type="number" value={pricingYearly} onChange={e => setPricingYearly(e.target.value)} className="h-12" />
              </div>
            </div>
          </div>
          */}

          <div className="space-y-4 pt-6">
            <h2 className="text-xl font-bold text-slate-800 border-b pb-2">ข้อมูลติดต่อ (Contact)</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>อีเมลติดต่อ</Label>
                <Input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} className="h-12" />
              </div>
              <div className="space-y-2">
                <Label>เบอร์โทรศัพท์</Label>
                <Input type="text" value={contactPhone} onChange={e => setContactPhone(e.target.value)} className="h-12" />
              </div>
            </div>
          </div>

          <div className="pt-8">
            <Button type="submit" disabled={isSaving} className="w-full h-14 text-lg rounded-xl bg-blue-600 hover:bg-blue-700">
              {isSaving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
            </Button>
          </div>
        </form>
      </div>

      {/* Backend Integrity & Diagnostics Section (No AI mentions in UI) */}
      <div 
        className="rounded-[var(--jh-radius-2xl)] border border-white/60 shadow-[var(--jh-shadow-card)] p-8 transition-all duration-300 hover:shadow-[var(--jh-shadow-md)]"
        style={{ background: "linear-gradient(150deg, #f6f6ff 0%, #e8e7fb 100%)" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div 
            className="flex h-10 w-10 items-center justify-center rounded-[var(--jh-radius-md)]"
            style={{ background: "#5856d6", color: "#fff", boxShadow: "0 10px 22px -8px #5856d6" }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">ระบบตรวจสอบความปลอดภัยและความสมบูรณ์หลังบ้าน</h2>
            <p className="text-xs text-slate-500 mt-0.5">ตรวจสอบความถูกต้องของข้อมูล จัดการข้อขัดแย้งของฐานข้อมูล และประเมินช่องโหว่</p>
          </div>
        </div>

        <div className="space-y-6 mt-6">
          <div className="flex justify-between items-center bg-white/50 p-4 rounded-2xl border border-white/60">
            <div className="text-sm text-slate-600 font-medium">
              รันการวิเคราะห์ข้อมูลความขัดแย้งและสภาพแวดล้อมระบบหลังบ้าน
            </div>
            <Button
              type="button"
              disabled={isAuditing}
              onClick={handleRunSystemAudit}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-full transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:translate-y-0"
              style={{ boxShadow: "0 8px 18px -6px #5856d6" }}
            >
              {isAuditing ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  กำลังตรวจสอบ...
                </span>
              ) : "🔍 เริ่มวิเคราะห์ระบบ"}
            </Button>
          </div>

          {/* Terminal-style report */}
          {auditReport && (
            <div className="bg-slate-900 text-slate-200 rounded-3xl p-6 font-mono text-xs overflow-x-auto leading-relaxed shadow-lg whitespace-pre-wrap border border-slate-800 animate-in fade-in duration-300">
              <div className="border-b border-slate-800 pb-3 mb-4 flex justify-between items-center text-slate-400">
                <span className="font-bold text-indigo-400">
                  [SYSTEM_DIAGNOSTICS_REPORT]
                </span>
                <span>
                  DATE: {new Date().toLocaleString("en-US")}
                </span>
              </div>
              <div>{auditReport}</div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
