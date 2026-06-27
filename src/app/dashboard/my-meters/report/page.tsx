"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { jsonFetcher } from "@/lib/fetcher";
import {
  Zap,
  Droplet,
  UploadCloud,
  Send,
  Loader2,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Calendar,
} from "lucide-react";

type MeterType = "WATER" | "ELECTRIC";
type SubmissionStatus = "PENDING" | "APPROVED" | "REJECTED";

interface Submission {
  id: string;
  type: MeterType;
  reading: number;
  photoUrl: string | null;
  status: SubmissionStatus;
  rejectReason: string | null;
  month: number;
  year: number;
  createdAt: string;
}

const thaiMonths = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

export default function TenantReportMeterPage() {
  const { data, error, isLoading, mutate } = useSWR<{ submissions: Submission[] }>(
    "/api/tenant/meter-submission",
    jsonFetcher
  );

  const [type, setType] = useState<MeterType>("WATER");
  const [reading, setReading] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submissions = data?.submissions || [];
  
  const waterSub = submissions.find((s) => s.type === "WATER");
  const electricSub = submissions.find((s) => s.type === "ELECTRIC");

  // Reset form when changing type
  useEffect(() => {
    setReading("");
    setPhotoFile(null);
    setPhotoPreview(null);
  }, [type]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reading || isNaN(Number(reading)) || Number(reading) < 0) {
      toast.error("กรุณาระบุตัวเลขมิเตอร์ที่ถูกต้อง");
      return;
    }

    // Check if approved already
    const existing = type === "WATER" ? waterSub : electricSub;
    if (existing && existing.status === "APPROVED") {
      toast.error("รายการนี้ได้รับการอนุมัติแล้ว ไม่สามารถแก้ไขได้");
      return;
    }

    setIsSubmitting(true);
    let photoUrl: string | null = existing?.photoUrl || null;

    try {
      // 1. อัปโหลดรูปภาพถ้ามีการเลือกใหม่
      if (photoFile) {
        const formData = new FormData();
        formData.append("file", photoFile);
        
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error("อัปโหลดรูปภาพหลักฐานไม่สำเร็จ");
        }

        const uploadData = await uploadRes.json();
        photoUrl = uploadData.url;
      }

      // 2. ส่งข้อมูลบันทึกมิเตอร์
      const res = await fetch("/api/tenant/meter-submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reading: Number(reading),
          type,
          photoUrl,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      }

      toast.success("บันทึกและส่งรายงานเลขมิเตอร์เรียบร้อยแล้ว");
      setReading("");
      setPhotoFile(null);
      setPhotoPreview(null);
      mutate();
    } catch (err: any) {
      toast.error(err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: SubmissionStatus, rejectReason: string | null) => {
    switch (status) {
      case "APPROVED":
        return (
          <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full w-fit">
            <CheckCircle className="w-3.5 h-3.5" />
            อนุมัติแล้ว
          </div>
        );
      case "REJECTED":
        return (
          <div className="space-y-1.5 w-full">
            <div className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-3 py-1 rounded-full w-fit">
              <AlertCircle className="w-3.5 h-3.5" />
              ปฏิเสธรายการ
            </div>
            {rejectReason && (
              <p className="text-[11px] text-red-500 font-medium bg-red-50/50 p-2 rounded-xl border border-red-100/50">
                เหตุผล: {rejectReason} (กรุณาส่งข้อมูลใหม่อีกครั้ง)
              </p>
            )}
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-100 px-3 py-1 rounded-full w-fit">
            <Clock className="w-3.5 h-3.5" />
            รอยืนยัน
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-slate-400 gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        <p className="text-sm font-semibold">กำลังโหลดข้อมูลระบบมิเตอร์...</p>
      </div>
    );
  }

  const currentMonthName = thaiMonths[new Date().getMonth()];
  const currentYearName = new Date().getFullYear() + 543;

  return (
    <div className="max-w-md mx-auto space-y-6 pb-12 px-4 sm:px-0">
      {/* Header */}
      <div className="text-center space-y-1.5">
        <h1 className="text-xl font-black text-slate-800">รายงานเลขมิเตอร์ด้วยตนเอง</h1>
        <p className="text-xs text-slate-500 font-semibold flex items-center justify-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          ประจำรอบเดือน {currentMonthName} {currentYearName}
        </p>
      </div>

      {/* Checklist / Current Submissions Status */}
      <div className="space-y-4">
        <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">สถานะการส่งของเดือนนี้</h3>
        
        {/* Water Checklist Card */}
        <div
          className="rounded-[var(--jh-radius-2xl)] border border-white/60 shadow-[var(--jh-shadow-card)] overflow-hidden"
          style={{
            background: waterSub?.status === "APPROVED" 
              ? "linear-gradient(150deg, #f3fcf6 0%, #e0f7e9 100%)" 
              : "linear-gradient(150deg, #f9fafb 0%, #f3f4f6 100%)"
          }}
        >
          <div className="p-4 flex items-start gap-4">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--jh-radius-md)] text-white"
              style={{
                background: "#34c759",
                boxShadow: "0 10px 22px -8px #34c759",
              }}
            >
              <Droplet className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-sm text-slate-800">มิเตอร์น้ำประปา</h4>
                  {waterSub ? (
                    <p className="text-xs text-slate-500 font-mono mt-0.5">เลขที่ส่ง: {waterSub.reading} หน่วย</p>
                  ) : (
                    <p className="text-xs text-slate-400 font-medium mt-0.5 italic">ยังไม่ได้รายงาน</p>
                  )}
                </div>
              </div>
              {waterSub && getStatusBadge(waterSub.status, waterSub.rejectReason)}
            </div>
          </div>
        </div>

        {/* Electric Checklist Card */}
        <div
          className="rounded-[var(--jh-radius-2xl)] border border-white/60 shadow-[var(--jh-shadow-card)] overflow-hidden"
          style={{
            background: electricSub?.status === "APPROVED" 
              ? "linear-gradient(150deg, #f3f5fa 0%, #e4eaf5 100%)" 
              : "linear-gradient(150deg, #f9fafb 0%, #f3f4f6 100%)"
          }}
        >
          <div className="p-4 flex items-start gap-4">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--jh-radius-md)] text-white"
              style={{
                background: "#34508c",
                boxShadow: "0 10px 22px -8px #34508c",
              }}
            >
              <Zap className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-sm text-slate-800">มิเตอร์ไฟฟ้า</h4>
                  {electricSub ? (
                    <p className="text-xs text-slate-500 font-mono mt-0.5">เลขที่ส่ง: {electricSub.reading} หน่วย</p>
                  ) : (
                    <p className="text-xs text-slate-400 font-medium mt-0.5 italic">ยังไม่ได้รายงาน</p>
                  )}
                </div>
              </div>
              {electricSub && getStatusBadge(electricSub.status, electricSub.rejectReason)}
            </div>
          </div>
        </div>
      </div>

      {/* Submission Form */}
      {(!waterSub || waterSub.status === "REJECTED" || !electricSub || electricSub.status === "REJECTED") ? (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[var(--jh-shadow-card)] space-y-5">
          <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#34508c]" />
            กรอกข้อมูลรายงานหน่วยมิเตอร์
          </h3>

          {/* Select Type */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500">เลือกประเภท</label>
            <div className="grid grid-cols-2 gap-3">
              {(!waterSub || waterSub.status === "REJECTED") && (
                <button
                  type="button"
                  onClick={() => setType("WATER")}
                  className={`flex items-center justify-center gap-2 py-3 rounded-2xl border text-sm font-extrabold transition-all cursor-pointer ${
                    type === "WATER"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm"
                      : "border-slate-200 hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <Droplet className="w-4 h-4" />
                  มิเตอร์น้ำ
                </button>
              )}
              {(!electricSub || electricSub.status === "REJECTED") && (
                <button
                  type="button"
                  onClick={() => setType("ELECTRIC")}
                  className={`flex items-center justify-center gap-2 py-3 rounded-2xl border text-sm font-extrabold transition-all cursor-pointer ${
                    type === "ELECTRIC"
                      ? "border-blue-200 bg-blue-50 text-[#34508c] shadow-sm"
                      : "border-slate-200 hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  มิเตอร์ไฟ
                </button>
              )}
            </div>
          </div>

          {/* Reading Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500">เลขมิเตอร์ครั้งนี้ (ดูจากหน้าปัดมิเตอร์)</label>
            <input
              type="number"
              required
              min={0}
              step="0.1"
              value={reading}
              onChange={(e) => setReading(e.target.value)}
              placeholder="กรอกตัวเลขหน่วยที่อ่านได้..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 text-sm font-semibold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500">ถ่ายรูปภาพหลักฐานตัวเลขบนมิเตอร์</label>
            <div className="relative">
              {photoPreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 max-h-48 flex items-center justify-center bg-slate-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoPreview} alt="Proof preview" className="max-h-48 w-full object-contain" />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoPreview(null);
                    }}
                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-6 hover:bg-slate-50 cursor-pointer transition-colors">
                  <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                  <span className="text-xs font-bold text-slate-500">กดเพื่อถ่ายภาพหรือเลือกไฟล์รูป</span>
                  <span className="text-[10px] text-slate-400 mt-1">ไฟล์ JPEG, PNG เท่านั้น</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting || !reading}
            className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-black text-white rounded-2xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
            style={{
              background: type === "WATER" ? "#34c759" : "#34508c",
              boxShadow: `0 8px 18px -6px ${type === "WATER" ? "#34c759" : "#34508c"}`
            }}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {isSubmitting ? "กำลังส่งข้อมูล..." : "ส่งรายงานเลขมิเตอร์"}
          </button>
        </form>
      ) : (
        <div className="bg-emerald-50/50 rounded-3xl p-6 border border-emerald-100 shadow-[var(--jh-shadow-card)] text-center space-y-2">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800">ส่งรายงานมิเตอร์เรียบร้อยครบถ้วน</h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
            คุณได้ทำการรายงานตัวเลขมิเตอร์น้ำและมิเตอร์ไฟประจำเดือนนี้เรียบร้อยแล้ว กรุณารอเจ้าหน้าที่ทำการอนุมัติข้อมูล
          </p>
        </div>
      )}
    </div>
  );
}
