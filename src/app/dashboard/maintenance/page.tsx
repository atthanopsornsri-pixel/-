"use client";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { jsonFetcher } from "@/lib/fetcher";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import SuccessPopup from "@/components/SuccessPopup";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/PageHeader";
import {
  Wrench,
  Clock,
  Hammer,
  CheckCircle2,
  ImagePlus,
  Send,
  ListFilter,
  Building,
  CalendarClock,
  X,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type StatusKey = "PENDING" | "IN_PROGRESS" | "COMPLETED";
type FilterKey = "ALL" | StatusKey;

const STATUS_META: Record<
  StatusKey,
  { label: string; color: string; bg: string; gradFrom: string; gradTo: string; solid: string }
> = {
  PENDING: {
    label: "รอดำเนินการ", color: "text-orange-600", bg: "bg-orange-100",
    gradFrom: "#fdf8ee", gradTo: "#f6ecd6", solid: "#d4a548",
  },
  IN_PROGRESS: {
    label: "กำลังซ่อม", color: "text-blue-600", bg: "bg-blue-100",
    gradFrom: "#f3f5fa", gradTo: "#e4eaf5", solid: "#34508c",
  },
  COMPLETED: {
    label: "เสร็จสิ้น", color: "text-green-600", bg: "bg-green-100",
    gradFrom: "#f3fcf6", gradTo: "#e0f7e9", solid: "#34c759",
  },
};

const FILTER_TABS: { key: FilterKey; label: string; icon: React.ReactNode }[] = [
  { key: "ALL",         label: "ทั้งหมด",      icon: <ListFilter className="w-3.5 h-3.5" /> },
  { key: "PENDING",     label: "รอดำเนินการ",  icon: <Clock className="w-3.5 h-3.5" /> },
  { key: "IN_PROGRESS", label: "กำลังซ่อม",    icon: <Hammer className="w-3.5 h-3.5" /> },
  { key: "COMPLETED",   label: "เสร็จสิ้น",    icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
];

interface AppointmentModal {
  open: boolean;
  reqId: string;
  reqTitle: string;
}

export default function MaintenancePage() {
  const { data: session } = useSession();
  const [filter, setFilter] = useState<FilterKey>("ALL");

  // ── ฝั่งเจ้าของ: เลือกตึก ──
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");

  // ── ฟอร์มผู้เช่า ──
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("09:00");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Modal นัดหมาย ──
  const [apptModal, setApptModal] = useState<AppointmentModal>({
    open: false, reqId: "", reqTitle: "",
  });
  const [apptDate, setApptDate] = useState("");
  const [apptTime, setApptTime] = useState("09:00");
  const [apptNote, setApptNote] = useState("");
  const [isConfirmingAppt, setIsConfirmingAppt] = useState(false);

  // Success popup state
  const [successPopup, setSuccessPopup] = useState<{ open: boolean; title: string; message?: string }>({
    open: false, title: "",
  });

  // ── ปฏิทินและสลับมุมมอง ──
  const [viewMode, setViewMode] = useState<"LIST" | "CALENDAR">("LIST");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate());

  const role = session?.user?.role;

  // ── SWR: properties (OWNER only, cached) ─────────────────────────
  const { data: properties = [] } = useSWR<any[]>(
    role === "OWNER" ? "/api/properties" : null,
    jsonFetcher
  );

  // ── SWR: maintenance requests (re-fetches on filter change) ───────
  const maintenanceKey = selectedPropertyId
    ? `/api/maintenance?propertyId=${selectedPropertyId}`
    : "/api/maintenance";

  const {
    data: requests = [],
    isLoading,
    mutate: mutateRequests,
  } = useSWR<any[]>(maintenanceKey, jsonFetcher, {
    refreshInterval: 0,
    revalidateOnFocus: false,
  });

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      // แนบวันเวลาที่สะดวก (ถ้าเลือกไว้)
      if (preferredDate) {
        const iso = new Date(`${preferredDate}T${preferredTime}:00`).toISOString();
        formData.append("preferredAt", iso);
      }
      if (imageFile) formData.append("file", imageFile);
      const res = await fetch("/api/maintenance", { method: "POST", body: formData });
      if (res.ok) {
        setTitle(""); setDescription(""); clearImage();
        setPreferredDate(""); setPreferredTime("09:00");
        mutateRequests();
        toast.success("ส่งเรื่องแจ้งซ่อมสำเร็จ เจ้าของหอพักได้รับแจ้งแล้ว");
      } else {
        const data = await res.json();
        toast.error(data.message || "เกิดข้อผิดพลาด");
      }
    } catch { toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่"); }
    finally { setIsSubmitting(false); }
  }

  async function handleUpdateStatus(id: string, status: string, extra?: { scheduledAt?: string; scheduledNote?: string }) {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/maintenance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, ...extra }),
      });
      if (res.ok) {
        mutateRequests();
        if (status === "COMPLETED") {
          setSuccessPopup({ open: true, title: "ซ่อมเสร็จสิ้น! ✅", message: "แจ้งเตือนผู้เช่าทาง LINE เรียบร้อยแล้ว" });
        } else if (extra?.scheduledAt) {
          setSuccessPopup({ open: true, title: "นัดหมายสำเร็จ! 📅", message: "ส่งแจ้งเตือนทาง LINE ให้ผู้เช่าแล้ว" });
        } else {
          toast.success("อัปเดตสถานะเรียบร้อย");
        }
      } else {
        toast.error("เกิดข้อผิดพลาดในการอัปเดต");
      }
    } catch { toast.error("เกิดข้อผิดพลาด"); }
    finally { setUpdatingId(null); }
  }

  function openApptModal(reqId: string, reqTitle: string) {
    setApptModal({ open: true, reqId, reqTitle });
    // ตั้ง default วันเป็นพรุ่งนี้
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setApptDate(tomorrow.toISOString().split("T")[0]);
    setApptTime("09:00");
    setApptNote("");
  }

  async function confirmAppointment() {
    if (!apptDate) { toast.error("กรุณาเลือกวันที่นัดหมาย"); return; }
    setIsConfirmingAppt(true);
    try {
      const scheduledAt = new Date(`${apptDate}T${apptTime}:00`).toISOString();
      await handleUpdateStatus(apptModal.reqId, "IN_PROGRESS", { scheduledAt, scheduledNote: apptNote || undefined });
      setApptModal({ open: false, reqId: "", reqTitle: "" });
    } finally {
      setIsConfirmingAppt(false);
    }
  }

  const counts: Record<FilterKey, number> = {
    ALL: requests.length,
    PENDING: requests.filter((r) => r.status === "PENDING").length,
    IN_PROGRESS: requests.filter((r) => r.status === "IN_PROGRESS").length,
    COMPLETED: requests.filter((r) => r.status === "COMPLETED").length,
  };
  const filteredRequests = filter === "ALL" ? requests : requests.filter((r) => r.status === filter);

  // ── ปฏิทิน Helpers ──
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const daysArray: (number | null)[] = [];
  for (let i = 0; i < firstDayIndex; i++) {
    daysArray.push(null);
  }
  for (let i = 1; i <= totalDays; i++) {
    daysArray.push(i);
  }

  const getRequestsForDate = (day: number) => {
    return filteredRequests.filter((req) => {
      const targetDateStr = req.scheduledAt || req.preferredAt;
      if (!targetDateStr) return false;
      const d = new Date(targetDateStr);
      return (
        d.getDate() === day &&
        d.getMonth() === month &&
        d.getFullYear() === year
      );
    });
  };

  // งานที่ยังไม่ได้ระบุนัดหมาย (scheduledAt เป็น null)
  const unscheduledRequests = filteredRequests.filter((req) => !req.scheduledAt);

  const THAI_MONTHS = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];
  const thaiYear = year + 543;
  const monthTitle = `${THAI_MONTHS[month]} ${thaiYear}`;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <PageHeader
        icon={Wrench} tone="cyan"
        title="ระบบแจ้งซ่อม"
        subtitle={role === "TENANT" ? "แจ้งปัญหาในห้องพักให้ช่างเข้าตรวจสอบ" : "ติดตามและอัปเดตสถานะงานซ่อมทั้งหมด"}
      />

      {/* ── Owner: Property filter (ถ้ามีหลายตึก) ── */}
      {role === "OWNER" && properties.length > 1 && (
        <div className="mb-5 flex items-center gap-3">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ background: "#5856d6", color: "#fff", boxShadow: "0 6px 14px -6px #5856d6" }}
          >
            <Building className="h-4 w-4" strokeWidth={2} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedPropertyId("")}
              className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
              style={
                selectedPropertyId === ""
                  ? { background: "#5856d6", color: "#fff", boxShadow: "0 4px 12px -4px #5856d6" }
                  : { background: "#fff", color: "#64748b", border: "1px solid #e2e8f0" }
              }
            >
              ทุกตึก
            </button>
            {properties.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPropertyId(p.id)}
                className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                style={
                  selectedPropertyId === p.id
                    ? { background: "#5856d6", color: "#fff", boxShadow: "0 4px 12px -4px #5856d6" }
                    : { background: "#fff", color: "#64748b", border: "1px solid #e2e8f0" }
                }
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Owner: Status filter tabs ── */}
      {role === "OWNER" && (
        <div className="flex flex-wrap gap-2 mb-7">
          {FILTER_TABS.map(({ key, label, icon }) => {
            const isActive = filter === key;
            const meta = key !== "ALL" ? STATUS_META[key as StatusKey] : null;
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 border"
                style={
                  isActive
                    ? meta
                      ? { background: meta.solid, color: "#fff", borderColor: "transparent", boxShadow: `0 4px 14px -4px ${meta.solid}` }
                      : { background: "#1e293b", color: "#fff", borderColor: "transparent" }
                    : { background: "#fff", color: "#64748b", borderColor: "#e2e8f0" }
                }
              >
                {icon}
                <span>{label}</span>
                <span
                  className="ml-0.5 px-1.5 py-0.5 rounded-full text-xs font-bold"
                  style={isActive ? { background: "rgba(255,255,255,0.25)", color: "#fff" } : { background: "#f1f5f9", color: "#64748b" }}
                >
                  {counts[key]}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── View switcher ── */}
      <div className="flex justify-between items-center mb-6 bg-white/40 p-2.5 rounded-[var(--jh-radius-lg)] border border-slate-200/50 backdrop-blur-sm">
        <div className="text-slate-700 text-xs font-bold pl-2 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-[var(--jh-blue)]" />
          มุมมองปัจจุบัน: <span className="text-[var(--jh-blue)]">{viewMode === "LIST" ? "รายการจดแจ้ง" : "ปฏิทินงานซ่อม"}</span>
        </div>
        <div className="bg-slate-100/80 p-0.5 rounded-xl inline-flex shadow-inner">
          <button
            type="button"
            onClick={() => setViewMode("LIST")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "LIST"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            📋 แบบรายการ
          </button>
          <button
            type="button"
            onClick={() => setViewMode("CALENDAR")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "CALENDAR"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            📅 แบบปฏิทิน
          </button>
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-6 ${role === "TENANT" ? "lg:grid-cols-3" : ""}`}>

        {/* ── Tenant: submit form ── */}
        {role === "TENANT" && (
          <div className="lg:col-span-1">
            <div
              className="rounded-[var(--jh-radius-2xl)] border border-white/60 shadow-[var(--jh-shadow-card)] p-6"
              style={{ background: "linear-gradient(150deg, #f6f6ff 0%, #e8e7fb 100%)" }}
            >
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--jh-radius-md)]"
                  style={{ background: "#5856d6", color: "#fff", boxShadow: "0 10px 22px -8px #5856d6" }}
                >
                  <Wrench className="h-5 w-5" strokeWidth={2} />
                </div>
                <h2 className="font-bold text-lg text-[var(--jh-ink)]">แจ้งปัญหาใหม่</h2>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700">หัวข้อปัญหา</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} required
                    placeholder="เช่น แอร์ไม่เย็น, ท่อน้ำซึม, ไฟไม่ติด"
                    className="bg-white/80 border-slate-200 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700">รายละเอียด</Label>
                  <textarea
                    className="flex min-h-[100px] w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5856d6]/30 resize-none"
                    value={description} onChange={(e) => setDescription(e.target.value)} required
                    placeholder="อธิบายปัญหาให้ละเอียด เพื่อให้ช่างเตรียมอุปกรณ์ได้ถูกต้อง"
                  />
                </div>
                {/* วันที่สะดวกรับช่าง (optional) */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700">
                    📅 วันที่สะดวกรับช่าง{" "}
                    <span className="text-slate-400 font-normal">(ถ้าระบุได้)</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={preferredDate}
                      onChange={(e) => setPreferredDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="flex h-11 w-full rounded-xl border border-slate-200 bg-white/80 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#5856d6]/30"
                    />
                    <input
                      type="time"
                      value={preferredTime}
                      onChange={(e) => setPreferredTime(e.target.value)}
                      className="flex h-11 w-full rounded-xl border border-slate-200 bg-white/80 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#5856d6]/30"
                    />
                  </div>
                  {preferredDate && (
                    <button
                      type="button"
                      onClick={() => setPreferredDate("")}
                      className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      ✕ ล้างวัน
                    </button>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700">แนบรูปภาพ (ถ้ามี)</Label>
                  {imagePreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imagePreview} alt="preview" className="w-full h-40 object-cover" />
                      <button type="button" onClick={clearImage}
                        className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-black/70 transition-colors">
                        ✕
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-dashed border-indigo-200 bg-white/50 cursor-pointer hover:bg-indigo-50/50 transition-colors">
                      <ImagePlus className="w-6 h-6 text-indigo-400" />
                      <span className="text-xs text-slate-500">คลิกเพื่อเลือกรูป (max 5MB)</span>
                      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    </label>
                  )}
                </div>
                <button type="submit" disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-full font-bold text-white transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-60 disabled:translate-y-0 disabled:cursor-not-allowed"
                  style={{ background: "#5856d6", boxShadow: "0 8px 18px -6px #5856d6" }}>
                  {isSubmitting ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />กำลังส่ง...</>
                  ) : (
                    <><Send className="w-4 h-4" />ส่งเรื่องแจ้งซ่อม</>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── Request cards ── */}
        <div className={role === "TENANT" ? "lg:col-span-2" : "w-full"}>
          {viewMode === "CALENDAR" ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendar Grid card */}
                <div className="lg:col-span-2 bg-white rounded-[var(--jh-radius-xl)] border border-slate-200/60 p-5 shadow-[var(--jh-shadow-card)]">
                  {/* Calendar Header */}
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[var(--jh-blue)]" />
                      {monthTitle}
                    </h3>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={prevMonth}
                        className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={nextMonth}
                        className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Days of Week */}
                  <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((dayName, idx) => (
                      <div key={idx} className="text-[10px] font-bold text-slate-400 py-1">
                        {dayName}
                      </div>
                    ))}
                  </div>

                  {/* Days Grid */}
                  <div className="grid grid-cols-7 gap-1.5">
                    {daysArray.map((day, idx) => {
                      if (day === null) {
                        return <div key={`empty-${idx}`} className="aspect-square bg-slate-50/20 rounded-lg"></div>;
                      }

                      const isToday =
                        day === new Date().getDate() &&
                        month === new Date().getMonth() &&
                        year === new Date().getFullYear();

                      const isSelected = selectedDay === day;

                      const dayRequests = getRequestsForDate(day);

                      const hasPending = dayRequests.some((r) => r.status === "PENDING");
                      const hasInProgress = dayRequests.some((r) => r.status === "IN_PROGRESS");
                      const hasCompleted = dayRequests.some((r) => r.status === "COMPLETED");

                      return (
                        <button
                          key={`day-${day}`}
                          type="button"
                          onClick={() => setSelectedDay(day)}
                          className={`aspect-square relative flex flex-col justify-between p-1.5 rounded-lg border transition-all cursor-pointer ${
                            isSelected
                              ? "border-[var(--jh-blue)] bg-blue-50/50 text-[var(--jh-blue)] font-bold shadow-sm"
                              : isToday
                              ? "border-orange-200 bg-orange-50/30 text-[var(--jh-orange-ink)] font-bold"
                              : "border-slate-100 hover:border-slate-200 bg-white text-slate-700"
                          }`}
                        >
                          <span className="text-xs">{day}</span>

                          {/* Dots indicators */}
                          <div className="flex justify-center gap-1 mt-auto">
                            {hasPending && <span className="w-1.5 h-1.5 bg-[#d4a548] rounded-full"></span>}
                            {hasInProgress && <span className="w-1.5 h-1.5 bg-[#34508c] rounded-full"></span>}
                            {hasCompleted && <span className="w-1.5 h-1.5 bg-[#34c759] rounded-full"></span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Unscheduled bin ("ถังยังไม่นัดหมาย") */}
                <div className="lg:col-span-1 bg-white rounded-[var(--jh-radius-xl)] border border-slate-200/60 p-5 shadow-[var(--jh-shadow-card)] flex flex-col h-[300px] lg:h-auto">
                  <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-orange-500" />
                    รอนัดหมายเข้าซ่อม ({unscheduledRequests.length})
                  </h3>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {unscheduledRequests.map((req) => (
                      <div
                        key={req.id}
                        onClick={() => {
                          if (req.preferredAt) {
                            const d = new Date(req.preferredAt);
                            setCurrentDate(d);
                            setSelectedDay(d.getDate());
                          } else {
                            openApptModal(req.id, req.title);
                          }
                        }}
                        className="p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/40 hover:bg-slate-50 transition-all cursor-pointer text-left"
                      >
                        <div className="flex justify-between items-start gap-1">
                          <h4 className="font-bold text-xs text-slate-800 truncate">{req.title}</h4>
                          <span className="bg-orange-100 text-orange-600 text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0">รอนัด</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{req.description}</p>
                        <p className="text-[9px] text-slate-400 mt-1">ห้อง {req.room?.number}</p>
                        {req.preferredAt && (
                          <div className="mt-1.5 text-[9px] text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-lg inline-block">
                            📅 วันที่สะดวก: {new Date(req.preferredAt).toLocaleDateString("th-TH")}
                          </div>
                        )}
                      </div>
                    ))}
                    {unscheduledRequests.length === 0 && (
                      <div className="text-center py-12 text-slate-400 text-xs">
                        ไม่มีงานค้างนัดหมาย 🎉
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Selected Day requests list */}
              {selectedDay !== null && (
                <div className="bg-slate-50/50 rounded-[var(--jh-radius-xl)] border border-slate-200/40 p-5">
                  <h3 className="font-bold text-slate-800 text-sm mb-4">
                    งานแจ้งซ่อมวันที่ {selectedDay} {THAI_MONTHS[month]} {thaiYear} ({getRequestsForDate(selectedDay).length})
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getRequestsForDate(selectedDay).map((req) => {
                      const meta = STATUS_META[req.status as StatusKey] ?? STATUS_META.PENDING;
                      const isUpdating = updatingId === req.id;
                      const hasAppt = !!req.scheduledAt;
                      const apptStr = hasAppt
                        ? new Date(req.scheduledAt).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })
                        : null;

                      return (
                        <div
                          key={req.id}
                          className="group rounded-[var(--jh-radius-2xl)] border border-white/60 shadow-[var(--jh-shadow-card)] overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--jh-shadow-md)]"
                          style={{ background: `linear-gradient(150deg, ${meta.gradFrom} 0%, ${meta.gradTo} 100%)` }}
                        >
                          <div className="p-4">
                            <div className="flex justify-between items-start gap-2 mb-2">
                              <h3 className="font-bold text-[var(--jh-ink)] leading-tight text-sm">{req.title}</h3>
                              <div className="flex flex-col items-end gap-1">
                                <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
                                  {meta.label}
                                </span>
                                {!hasAppt && req.status === "PENDING" && (
                                  <span className="bg-orange-100/80 text-orange-700 text-[9px] px-2 py-0.5 rounded-full font-bold">
                                    รอนัดหมาย (ตามวันสะดวก)
                                  </span>
                                )}
                              </div>
                            </div>

                            {role === "OWNER" && (
                              <p className="text-xs font-semibold mb-1" style={{ color: meta.solid }}>
                                ห้อง {req.room?.number}{req.room?.property?.name ? ` · ${req.room.property.name}` : ""}
                              </p>
                            )}
                            <p className="text-[10px] text-slate-400 mb-2">
                              {new Date(req.createdAt).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}
                            </p>
                            <p className="text-xs text-slate-600 whitespace-pre-wrap line-clamp-3 leading-relaxed">
                              {req.description}
                            </p>

                            {/* Scheduled info */}
                            {hasAppt && (
                              <div
                                className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-semibold"
                                style={{ background: "#e4eaf5", color: "#34508c" }}
                              >
                                <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                                <span>เวลาเข้าซ่อม: {apptStr}</span>
                                {req.scheduledNote && <span className="text-blue-500">· {req.scheduledNote}</span>}
                              </div>
                            )}

                            {!hasAppt && req.preferredAt && (
                              <div
                                className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-semibold"
                                style={{ background: "#fdf8ee", color: "#d4a548" }}
                              >
                                <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                                <span>ผู้เช่าสะดวก: {new Date(req.preferredAt).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}</span>
                              </div>
                            )}

                            {/* Action buttons */}
                            {role === "OWNER" && req.status !== "COMPLETED" && (
                              <div className="mt-4 pt-3 border-t border-black/5 flex flex-col gap-2">
                                {req.status === "PENDING" && (
                                  <button
                                    type="button"
                                    onClick={() => openApptModal(req.id, req.title)}
                                    disabled={isUpdating}
                                    className="w-full py-2 rounded-full text-xs font-bold text-white transition-all duration-300 hover:-translate-y-0.5 cursor-pointer shadow-sm"
                                    style={{ background: "#34508c" }}
                                  >
                                    📅 ยืนยันการนัดหมาย
                                  </button>
                                )}
                                {req.status === "IN_PROGRESS" && !hasAppt && (
                                  <button
                                    type="button"
                                    onClick={() => openApptModal(req.id, req.title)}
                                    disabled={isUpdating}
                                    className="w-full py-2 rounded-full text-xs font-bold text-white transition-all duration-300 hover:-translate-y-0.5 cursor-pointer shadow-sm"
                                    style={{ background: "#5856d6" }}
                                  >
                                    📅 นัดหมายวันเข้าซ่อม
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(req.id, "COMPLETED")}
                                  disabled={isUpdating}
                                  className="w-full py-2 rounded-full text-xs font-bold text-white transition-all duration-300 hover:-translate-y-0.5 cursor-pointer shadow-sm"
                                  style={{ background: "#34c759" }}
                                >
                                  ✅ ซ่อมเสร็จสิ้น
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {getRequestsForDate(selectedDay).length === 0 && (
                      <div className="col-span-full text-center py-8 text-slate-400 text-xs">
                        ไม่มีงานแจ้งซ่อมในวันนี้ 🍃
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="rounded-[var(--jh-radius-2xl)] border border-slate-100 overflow-hidden">
                      <Skeleton className="h-24 w-full rounded-none" />
                      <div className="p-4 space-y-3">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-1/2" />
                        <div className="flex gap-2 pt-1">
                          <Skeleton className="h-8 w-24 rounded-full" />
                          <Skeleton className="h-8 w-24 rounded-full" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredRequests.map((req) => {
                    const meta = STATUS_META[req.status as StatusKey] ?? STATUS_META.PENDING;
                    const isUpdating = updatingId === req.id;
                    const hasAppt = !!req.scheduledAt;
                    const apptStr = hasAppt
                      ? new Date(req.scheduledAt).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })
                      : null;

                    return (
                      <div
                        key={req.id}
                        className="group rounded-[var(--jh-radius-2xl)] border border-white/60 shadow-[var(--jh-shadow-card)] overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--jh-shadow-md)]"
                        style={{ background: `linear-gradient(150deg, ${meta.gradFrom} 0%, ${meta.gradTo} 100%)` }}
                      >
                        {(req.hasImage || req.imageUrl) && (
                          <div className="h-44 w-full overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={`/api/maintenance/${req.id}/image`}
                              alt={req.title}
                              loading="lazy"
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          </div>
                        )}

                        <div className="p-4">
                          <div className="flex justify-between items-start gap-2 mb-2">
                            <h3 className="font-bold text-[var(--jh-ink)] leading-tight">{req.title}</h3>
                            <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${meta.bg} ${meta.color}`}>
                              {meta.label}
                            </span>
                          </div>

                          {role === "OWNER" && (
                            <p className="text-xs font-semibold mb-1" style={{ color: meta.solid }}>
                              ห้อง {req.room?.number}{req.room?.property?.name ? ` · ${req.room.property.name}` : ""}
                            </p>
                          )}
                          <p className="text-xs text-slate-400 mb-2">
                            {new Date(req.createdAt).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}
                          </p>
                          <p className="text-sm text-slate-600 whitespace-pre-wrap line-clamp-3 leading-relaxed">
                            {req.description}
                          </p>

                          {role === "OWNER" && req.preferredAt && req.status !== "COMPLETED" && (
                            <div
                              className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold"
                              style={{ background: "#fdf8ee", color: "#d4a548" }}
                            >
                              <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                              <span>
                                ผู้เช่าสะดวก:{" "}
                                {new Date(req.preferredAt).toLocaleString("th-TH", {
                                  dateStyle: "short",
                                  timeStyle: "short",
                                })}
                              </span>
                            </div>
                          )}

                          {hasAppt && req.status === "IN_PROGRESS" && (
                            <div
                              className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold"
                              style={{ background: "#e4eaf5", color: "#34508c" }}
                            >
                              <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                              <span>นัดหมาย: {apptStr}</span>
                              {req.scheduledNote && <span className="text-blue-400">· {req.scheduledNote}</span>}
                            </div>
                          )}

                          {role === "OWNER" && (req.aiCategory || req.aiUrgency || req.aiTechnician) && (
                            <div className="mt-3 p-3 rounded-2xl bg-white/50 border border-white/60 text-xs flex flex-col gap-2">
                              <div className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">ระบบช่วยคัดกรองห้องพักอัตโนมัติ</div>
                              <div className="flex flex-wrap gap-1.5">
                                {req.aiCategory && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-medium">
                                    📂 {req.aiCategory}
                                  </span>
                                )}
                                {req.aiUrgency && (
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-lg font-bold ${
                                      req.aiUrgency === "สูง"
                                        ? "bg-red-50 text-red-600 border border-red-100"
                                        : req.aiUrgency === "กลาง"
                                        ? "bg-amber-50 text-amber-600 border border-amber-100"
                                        : "bg-green-50 text-green-600 border border-green-100"
                                    }`}
                                  >
                                    ⚡ ด่วน: {req.aiUrgency}
                                  </span>
                                )}
                                {req.aiTechnician && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 font-medium">
                                    🔧 ช่างแนะนำ: {req.aiTechnician}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {role === "OWNER" && req.status !== "COMPLETED" && (
                            <div className="mt-4 pt-3 border-t border-black/5 flex flex-col gap-2">
                              {req.status === "PENDING" && (
                                <button
                                  type="button"
                                  onClick={() => openApptModal(req.id, req.title)}
                                  disabled={isUpdating}
                                  className="w-full py-2.5 rounded-full text-sm font-bold text-white transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-60 disabled:translate-y-0 cursor-pointer"
                                  style={{ background: "#34508c", boxShadow: "0 8px 18px -6px #34508c" }}
                                >
                                  {isUpdating ? (
                                    <span className="flex items-center justify-center gap-2">
                                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                      กำลังอัปเดต...
                                    </span>
                                  ) : (
                                    "📅 รับเรื่องและนัดหมายเข้าซ่อม"
                                  )}
                                </button>
                              )}
                              {req.status === "IN_PROGRESS" && !hasAppt && (
                                <button
                                  type="button"
                                  onClick={() => openApptModal(req.id, req.title)}
                                  disabled={isUpdating}
                                  className="w-full py-2.5 rounded-full text-sm font-bold text-white transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-60 cursor-pointer"
                                  style={{ background: "#5856d6", boxShadow: "0 8px 18px -6px #5856d6" }}
                                >
                                  📅 นัดหมายวันเข้าซ่อม
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(req.id, "COMPLETED")}
                                disabled={isUpdating}
                                className="w-full py-2.5 rounded-full text-sm font-bold text-white transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-60 cursor-pointer"
                                style={{ background: "#34c759", boxShadow: "0 8px 18px -6px #34c759" }}
                              >
                                {isUpdating ? (
                                  <span className="flex items-center justify-center gap-2">
                                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    กำลังอัปเดต...
                                  </span>
                                ) : (
                                  "✅ ซ่อมเสร็จ — แจ้งผู้เช่าทาง LINE"
                                )}
                              </button>
                            </div>
                          )}

                          {req.status === "COMPLETED" && (
                            <div className="mt-3 pt-3 border-t border-black/5 text-center">
                              <p className="text-xs text-green-600 font-semibold">✅ ดำเนินการเสร็จสิ้นแล้ว</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {filteredRequests.length === 0 && (
                    <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 p-6 max-w-md mx-auto shadow-sm">
                      <img
                        src="/images/mascot/maintenance_guide.png"
                        alt="ไม่มีงานซ่อม"
                        className="w-32 h-32 mx-auto mb-4 jh-float-soft drop-shadow-[0_8px_16px_rgba(0,0,0,0.06)] object-contain"
                      />
                      <p className="font-bold text-slate-800 text-base">
                        {filter === "ALL"
                          ? "ไม่มีรายการแจ้งซ่อม"
                          : `ไม่มีรายการ "${STATUS_META[filter as StatusKey]?.label ?? filter}"`}
                      </p>
                      <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                        {role === "TENANT"
                          ? "หากมีอุปกรณ์เสียหายหรือชำรุดในห้องพัก สามารถส่งเรื่องแจ้งซ่อมผ่านฟอร์มได้ทันทีเลยนะคะ 🔧"
                          : "ระบบทำงานเรียบร้อยดี ไม่มีเรื่องค้างคาหรือคิวรอช่างเข้าซ่อมเลยค่ะ 🎉"}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Success Popup ── */}
      <SuccessPopup
        open={successPopup.open}
        title={successPopup.title}
        message={successPopup.message}
        autoCloseMs={4000}
        onClose={() => setSuccessPopup({ open: false, title: "" })}
        mascotType="maintenance"
      />

      {/* ── Modal นัดหมายเข้าซ่อม ── */}
      {apptModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setApptModal({ open: false, reqId: "", reqTitle: "" }); }}>
          <div
            className="w-full max-w-sm rounded-[var(--jh-radius-2xl)] border border-white/60 shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200"
            style={{ background: "linear-gradient(150deg, #f3f5fa 0%, #e4eaf5 100%)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--jh-radius-md)]"
                  style={{ background: "#34508c", color: "#fff", boxShadow: "0 10px 22px -8px #34508c" }}>
                  <CalendarClock className="h-5 w-5" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="font-bold text-[var(--jh-ink)]">นัดหมายเข้าซ่อม</h2>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{apptModal.reqTitle}</p>
                </div>
              </div>
              <button onClick={() => setApptModal({ open: false, reqId: "", reqTitle: "" })}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/60 hover:bg-white transition-colors text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* วันที่ */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700">📅 วันที่นัดหมาย</Label>
                <input
                  type="date"
                  value={apptDate}
                  onChange={(e) => setApptDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="flex h-11 w-full rounded-xl border border-slate-200 bg-white/80 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#34508c]/30"
                />
              </div>
              {/* เวลา */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700">⏰ เวลา</Label>
                <input
                  type="time"
                  value={apptTime}
                  onChange={(e) => setApptTime(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-slate-200 bg-white/80 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#34508c]/30"
                />
              </div>
              {/* หมายเหตุ */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700">📝 หมายเหตุ (ถ้ามี)</Label>
                <textarea
                  value={apptNote}
                  onChange={(e) => setApptNote(e.target.value)}
                  placeholder="เช่น ช่างจะเข้าทางประตูหลัก / กรุณาเตรียมกุญแจ"
                  className="flex min-h-[80px] w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#34508c]/30 resize-none"
                />
              </div>

              {/* ปุ่ม */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setApptModal({ open: false, reqId: "", reqTitle: "" })}
                  className="flex-1 py-2.5 rounded-full text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
                  ยกเลิก
                </button>
                <button
                  onClick={confirmAppointment}
                  disabled={!apptDate || isConfirmingAppt}
                  className="flex-1 py-2.5 rounded-full text-sm font-bold text-white transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-60 disabled:translate-y-0"
                  style={{ background: "#34508c", boxShadow: "0 8px 18px -6px #34508c" }}>
                  {isConfirmingAppt ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      กำลังส่ง...
                    </span>
                  ) : "✅ ยืนยัน + แจ้ง LINE ผู้เช่า"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
