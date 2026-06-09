"use client";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "lucide-react";

type StatusKey = "PENDING" | "IN_PROGRESS" | "COMPLETED";
type FilterKey = "ALL" | StatusKey;

const STATUS_META: Record<
  StatusKey,
  { label: string; color: string; bg: string; gradFrom: string; gradTo: string; solid: string }
> = {
  PENDING: {
    label: "รอดำเนินการ", color: "text-orange-600", bg: "bg-orange-100",
    gradFrom: "#fff9f2", gradTo: "#ffeed9", solid: "#ff9500",
  },
  IN_PROGRESS: {
    label: "กำลังซ่อม", color: "text-blue-600", bg: "bg-blue-100",
    gradFrom: "#f4f9ff", gradTo: "#e3f0ff", solid: "#007aff",
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
  const [requests, setRequests] = useState<any[]>([]);
  const [filter, setFilter] = useState<FilterKey>("ALL");

  // ── ฝั่งเจ้าของ: เลือกตึก ──
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");

  // ── ฟอร์มผู้เช่า ──
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
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

  const role = session?.user?.role;

  // โหลดรายชื่อตึก (OWNER เท่านั้น)
  useEffect(() => {
    if (role !== "OWNER") return;
    fetch("/api/properties")
      .then((r) => r.json())
      .then((data: any[]) => {
        setProperties(data || []);
        // ถ้ามีหลายตึก เริ่มต้นเลือก "ทั้งหมด" (selectedPropertyId = "")
      })
      .catch(() => {});
  }, [role]);

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPropertyId]);

  async function fetchRequests() {
    const url = selectedPropertyId
      ? `/api/maintenance?propertyId=${selectedPropertyId}`
      : "/api/maintenance";
    const res = await fetch(url);
    if (res.ok) setRequests(await res.json());
  }

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
      if (imageFile) formData.append("file", imageFile);
      const res = await fetch("/api/maintenance", { method: "POST", body: formData });
      if (res.ok) {
        setTitle(""); setDescription(""); clearImage();
        await fetchRequests();
        toast.success("ส่งเรื่องแจ้งซ่อมสำเร็จ เจ้าของหอพักได้รับแจ้งแล้ว 🔧");
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
        await fetchRequests();
        if (status === "COMPLETED") toast.success("ซ่อมเสร็จสิ้น! แจ้งผู้เช่าทาง LINE แล้ว ✅");
        else if (extra?.scheduledAt) toast.success("นัดหมายสำเร็จ! แจ้ง LINE ผู้เช่าแล้ว 📅");
        else toast.success("อัปเดตสถานะเรียบร้อย");
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
        <div className={role === "TENANT" ? "lg:col-span-2" : ""}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRequests.map((req) => {
              const meta = STATUS_META[req.status as StatusKey] ?? STATUS_META.PENDING;
              const isUpdating = updatingId === req.id;
              const hasAppt = !!req.scheduledAt;
              const apptStr = hasAppt
                ? new Date(req.scheduledAt).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })
                : null;

              return (
                <div key={req.id}
                  className="group rounded-[var(--jh-radius-2xl)] border border-white/60 shadow-[var(--jh-shadow-card)] overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--jh-shadow-md)]"
                  style={{ background: `linear-gradient(150deg, ${meta.gradFrom} 0%, ${meta.gradTo} 100%)` }}>

                  {req.imageUrl && (
                    <div className="h-44 w-full overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={req.imageUrl} alt={req.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
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

                    {/* แสดงวันนัดหมาย */}
                    {hasAppt && req.status === "IN_PROGRESS" && (
                      <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold"
                        style={{ background: "#e3f0ff", color: "#007aff" }}>
                        <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                        <span>นัดหมาย: {apptStr}</span>
                        {req.scheduledNote && <span className="text-blue-400">· {req.scheduledNote}</span>}
                      </div>
                    )}

                    {/* ── Owner action buttons ── */}
                    {role === "OWNER" && req.status !== "COMPLETED" && (
                      <div className="mt-4 pt-3 border-t border-black/5 flex flex-col gap-2">
                        {req.status === "PENDING" && (
                          <button
                            onClick={() => openApptModal(req.id, req.title)}
                            disabled={isUpdating}
                            className="w-full py-2.5 rounded-full text-sm font-bold text-white transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-60 disabled:translate-y-0"
                            style={{ background: "#007aff", boxShadow: "0 8px 18px -6px #007aff" }}>
                            {isUpdating ? (
                              <span className="flex items-center justify-center gap-2">
                                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                กำลังอัปเดต...
                              </span>
                            ) : "📅 รับเรื่องและนัดหมายเข้าซ่อม"}
                          </button>
                        )}
                        {req.status === "IN_PROGRESS" && !hasAppt && (
                          <button
                            onClick={() => openApptModal(req.id, req.title)}
                            disabled={isUpdating}
                            className="w-full py-2.5 rounded-full text-sm font-bold text-white transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-60"
                            style={{ background: "#5856d6", boxShadow: "0 8px 18px -6px #5856d6" }}>
                            📅 นัดหมายวันเข้าซ่อม
                          </button>
                        )}
                        <button
                          onClick={() => handleUpdateStatus(req.id, "COMPLETED")}
                          disabled={isUpdating}
                          className="w-full py-2.5 rounded-full text-sm font-bold text-white transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-60"
                          style={{ background: "#34c759", boxShadow: "0 8px 18px -6px #34c759" }}>
                          {isUpdating ? (
                            <span className="flex items-center justify-center gap-2">
                              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              กำลังอัปเดต...
                            </span>
                          ) : "✅ ซ่อมเสร็จ — แจ้งผู้เช่าทาง LINE"}
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
              <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
                <Wrench className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                <p className="font-semibold text-slate-400">
                  {filter === "ALL"
                    ? "ไม่มีประวัติการแจ้งซ่อม"
                    : `ไม่มีรายการ "${STATUS_META[filter as StatusKey]?.label ?? filter}"`}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal นัดหมายเข้าซ่อม ── */}
      {apptModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setApptModal({ open: false, reqId: "", reqTitle: "" }); }}>
          <div
            className="w-full max-w-sm rounded-[var(--jh-radius-2xl)] border border-white/60 shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200"
            style={{ background: "linear-gradient(150deg, #f4f9ff 0%, #e3f0ff 100%)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--jh-radius-md)]"
                  style={{ background: "#007aff", color: "#fff", boxShadow: "0 10px 22px -8px #007aff" }}>
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
                  className="flex h-11 w-full rounded-xl border border-slate-200 bg-white/80 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#007aff]/30"
                />
              </div>
              {/* เวลา */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700">⏰ เวลา</Label>
                <input
                  type="time"
                  value={apptTime}
                  onChange={(e) => setApptTime(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-slate-200 bg-white/80 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#007aff]/30"
                />
              </div>
              {/* หมายเหตุ */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700">📝 หมายเหตุ (ถ้ามี)</Label>
                <textarea
                  value={apptNote}
                  onChange={(e) => setApptNote(e.target.value)}
                  placeholder="เช่น ช่างจะเข้าทางประตูหลัก / กรุณาเตรียมกุญแจ"
                  className="flex min-h-[80px] w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007aff]/30 resize-none"
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
                  style={{ background: "#007aff", boxShadow: "0 8px 18px -6px #007aff" }}>
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
