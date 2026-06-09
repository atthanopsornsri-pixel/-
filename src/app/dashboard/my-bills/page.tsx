"use client";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import generatePayload from "promptpay-qr";
import { submitPaymentSlip } from "@/app/actions/tenant-payment";
import { PageHeader } from "@/components/PageHeader";
import {
  Receipt,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  ImagePlus,
  Send,
  CalendarClock,
  Wallet,
  KeyRound,
  Car,
} from "lucide-react";

// ── Status tone mapping ──────────────────────────────────────────────────────
type StatusKey = "UNPAID" | "PENDING" | "PAID" | "OVERDUE" | "PARTIAL";

const STATUS_META: Record<
  StatusKey,
  { label: string; gradFrom: string; gradTo: string; solid: string; ink: string; icon: React.ReactNode }
> = {
  UNPAID: {
    label: "รอชำระ", gradFrom: "#fff5f4", gradTo: "#ffe5e3",
    solid: "#ff3b30", ink: "var(--jh-red)",
    icon: <AlertCircle className="h-5 w-5" strokeWidth={2} />,
  },
  OVERDUE: {
    label: "เลยกำหนด", gradFrom: "#fff5f4", gradTo: "#ffe5e3",
    solid: "#ff3b30", ink: "var(--jh-red)",
    icon: <AlertCircle className="h-5 w-5" strokeWidth={2} />,
  },
  PENDING: {
    label: "รอตรวจสอบ", gradFrom: "#fff9f2", gradTo: "#ffeed9",
    solid: "#ff9500", ink: "var(--jh-orange-ink)",
    icon: <Clock className="h-5 w-5" strokeWidth={2} />,
  },
  PARTIAL: {
    label: "จ่ายบางส่วน", gradFrom: "#f6f6ff", gradTo: "#e8e7fb",
    solid: "#5856d6", ink: "var(--jh-indigo)",
    icon: <Wallet className="h-5 w-5" strokeWidth={2} />,
  },
  PAID: {
    label: "ชำระแล้ว", gradFrom: "#f3fcf6", gradTo: "#e0f7e9",
    solid: "#34c759", ink: "var(--jh-green-ink)",
    icon: <CheckCircle2 className="h-5 w-5" strokeWidth={2} />,
  },
};

const MONTH_NAMES = [
  "มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
  "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม",
];

function thb(n: number) {
  return `฿${n.toLocaleString()}`;
}

export default function MyBillsPage() {
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Payment modal state ──────────────────────────────────────────────────
  const [payBill, setPayBill] = useState<any | null>(null);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBills();
  }, []);

  async function fetchBills() {
    setLoading(true);
    const res = await fetch("/api/bills");
    if (res.ok) setBills(await res.json());
    setLoading(false);
  }

  function openPayModal(bill: any) {
    setPayBill(bill);
    setSlipFile(null);
    setSlipPreview(null);
  }

  function closePayModal() {
    setPayBill(null);
    setSlipFile(null);
    setSlipPreview(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setSlipFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setSlipPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setSlipPreview(null);
    }
  }

  async function handleSubmitSlip() {
    if (!slipFile || !payBill) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("billId", payBill.id);
      formData.append("file", slipFile);
      const result = await submitPaymentSlip(null, formData);
      if (result.success) {
        toast.success(result.message || "ส่งสลิปสำเร็จ! รอเจ้าของหอตรวจสอบ 🎉");
        closePayModal();
        fetchBills();
      } else {
        toast.error(result.error || "เกิดข้อผิดพลาด");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsUploading(false);
    }
  }

  const canPay = (status: string) => status === "UNPAID" || status === "OVERDUE" || status === "PARTIAL";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <PageHeader
        icon={Receipt}
        tone="green"
        title="บิลค่าเช่าของฉัน"
        subtitle="ดูรายละเอียดค่าใช้จ่ายและชำระเงินผ่าน QR ได้ทันที"
      />

      {/* ── Bill cards ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-64 rounded-[var(--jh-radius-2xl)] bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : bills.length === 0 ? (
        <div className="text-center py-20 rounded-[var(--jh-radius-2xl)] border border-dashed border-slate-200 bg-white">
          <Receipt className="w-12 h-12 mx-auto mb-3 text-slate-200" />
          <p className="font-semibold text-slate-400">ยังไม่มีบิลเรียกเก็บในขณะนี้</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {bills.map((bill) => {
            const meta = STATUS_META[bill.status as StatusKey] ?? STATUS_META.UNPAID;
            const isCheckin = bill.type === "CHECKIN";
            const periodLabel = isCheckin
              ? "🔑 บิลค่าเข้าอยู่"
              : `${MONTH_NAMES[bill.month - 1]} ${bill.year + 543}`;

            return (
              <div
                key={bill.id}
                className="group rounded-[var(--jh-radius-2xl)] border border-white/60 shadow-[var(--jh-shadow-card)] overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--jh-shadow-md)]"
                style={{ background: `linear-gradient(150deg, ${meta.gradFrom} 0%, ${meta.gradTo} 100%)` }}
              >
                <div className="p-5">
                  {/* ── Header ── */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--jh-radius-md)] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
                        style={{ background: meta.solid, color: "#fff", boxShadow: `0 10px 22px -8px ${meta.solid}` }}
                      >
                        {meta.icon}
                      </div>
                      <div>
                        <p className="font-bold text-[var(--jh-ink)] leading-tight">{periodLabel}</p>
                        <p className="text-xs text-[var(--jh-ink-tertiary)] mt-0.5">
                          ห้อง {bill.room?.number} · {bill.room?.property?.name}
                        </p>
                      </div>
                    </div>
                    <span
                      className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{ background: `${meta.solid}20`, color: meta.solid }}
                    >
                      {meta.label}
                    </span>
                  </div>

                  {/* ── Amount ── */}
                  <div
                    className="text-3xl font-bold tabular-nums tracking-tight mb-4"
                    style={{ color: meta.ink }}
                  >
                    {thb(bill.totalAmount)}
                  </div>

                  {/* ── Breakdown ── */}
                  <div className="space-y-1.5 text-sm mb-4">
                    {isCheckin ? (
                      <>
                        {bill.securityDeposit > 0 && (
                          <Row icon={<KeyRound className="w-3.5 h-3.5" />} label="เงินประกันห้อง (คืนตอนย้ายออก)" value={bill.securityDeposit} />
                        )}
                        {bill.advanceRent > 0 && (
                          <Row label="ค่าเช่าล่วงหน้า" value={bill.advanceRent} />
                        )}
                        {bill.keyDeposit > 0 && (
                          <Row label="ค่ามัดจำกุญแจ / คีย์การ์ด" value={bill.keyDeposit} />
                        )}
                        {bill.vehicleFee > 0 && (
                          <Row icon={<Car className="w-3.5 h-3.5" />} label="ค่าลงทะเบียน / ที่จอดรถ" value={bill.vehicleFee} />
                        )}
                      </>
                    ) : (
                      <>
                        <Row label="ค่าเช่า" value={bill.rentAmount} />
                        {bill.waterAmount > 0 && (
                          <Row label={`ค่าน้ำ${bill.waterUnits ? ` (${bill.waterUnits} หน่วย)` : ""}`} value={bill.waterAmount} />
                        )}
                        {bill.electricAmount > 0 && (
                          <Row label={`ค่าไฟ${bill.electricUnits ? ` (${bill.electricUnits} หน่วย)` : ""}`} value={bill.electricAmount} />
                        )}
                        {(bill.commonFee + bill.parkingFee + bill.internetFee + bill.otherFee) > 0 && (
                          <Row label="ค่าบริการอื่นๆ" value={bill.commonFee + bill.parkingFee + bill.internetFee + bill.otherFee} />
                        )}
                        {bill.balanceForward > 0 && (
                          <Row label="ยอดค้างยกมา" value={bill.balanceForward} />
                        )}
                      </>
                    )}
                  </div>

                  {/* ── Due date ── */}
                  <div className="flex items-center gap-1.5 text-xs text-[var(--jh-ink-secondary)] mb-4">
                    <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      กำหนดชำระ: {new Date(bill.dueDate).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}
                    </span>
                  </div>

                  {/* ── Action ── */}
                  {canPay(bill.status) && (
                    <button
                      onClick={() => openPayModal(bill)}
                      className="w-full py-2.5 rounded-full text-sm font-bold text-white transition-all duration-300 hover:-translate-y-0.5"
                      style={{ background: meta.solid, boxShadow: `0 8px 18px -6px ${meta.solid}` }}
                    >
                      💳 ชำระเงินผ่าน QR Code
                    </button>
                  )}

                  {bill.status === "PENDING" && (
                    <div className="flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-semibold"
                      style={{ background: "#fff9f2", color: "#ff9500" }}>
                      <Clock className="w-4 h-4" />
                      รอเจ้าของหอตรวจสอบสลิป
                    </div>
                  )}

                  {bill.status === "PAID" && (
                    <div className="flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-semibold"
                      style={{ background: "#e0f7e9", color: "#34c759" }}>
                      <CheckCircle2 className="w-4 h-4" />
                      ชำระเงินเสร็จสิ้น — ขอบคุณ 🙏
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Payment Modal ── */}
      {payBill && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closePayModal(); }}
        >
          <div
            className="w-full max-w-sm rounded-[var(--jh-radius-2xl)] border border-white/60 shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]"
            style={{ background: "linear-gradient(150deg, #f4f9ff 0%, #e3f0ff 100%)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--jh-radius-md)]"
                  style={{ background: "#007aff", color: "#fff", boxShadow: "0 10px 22px -8px #007aff" }}
                >
                  <Receipt className="h-5 w-5" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="font-bold text-[var(--jh-ink)]">ชำระค่าเช่า</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {payBill.type === "CHECKIN" ? "🔑 บิลเข้าอยู่" : `เดือน ${MONTH_NAMES[payBill.month - 1]} ${payBill.year + 543}`}
                  </p>
                </div>
              </div>
              <button
                onClick={closePayModal}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/60 hover:bg-white transition-colors text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Amount */}
            <div className="text-center mb-5">
              <p className="text-xs text-slate-500 mb-1">ยอดที่ต้องชำระ</p>
              <p className="text-4xl font-extrabold tabular-nums" style={{ color: "#007aff" }}>
                {thb(payBill.totalAmount)}
              </p>
            </div>

            {/* QR Code */}
            <div
              className="rounded-[var(--jh-radius-xl)] border border-white/60 p-5 mb-5 flex flex-col items-center"
              style={{ background: "rgba(255,255,255,0.7)" }}
            >
              {payBill.room?.property?.promptPayNo ? (
                <>
                  <div className="bg-white p-3 rounded-2xl shadow-sm mb-3">
                    <QRCodeSVG
                      value={generatePayload(payBill.room.property.promptPayNo, { amount: payBill.totalAmount })}
                      size={180}
                    />
                  </div>
                  {payBill.room.property.promptPayName && (
                    <p className="text-xs font-semibold text-slate-600 text-center">
                      ชื่อบัญชี: {payBill.room.property.promptPayName}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 mt-1 text-center">สแกนด้วยแอปธนาคารเพื่อโอนเงิน</p>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 py-3">
                  <AlertCircle className="w-10 h-10 text-amber-400" />
                  <p className="text-sm font-semibold text-amber-700 text-center">ยังไม่ได้ตั้งค่าเบอร์พร้อมเพย์</p>
                  <p className="text-xs text-slate-500 text-center">กรุณาติดต่อเจ้าของหอพักเพื่อตั้งค่า</p>
                </div>
              )}
            </div>

            {/* Slip upload */}
            <div className="space-y-3 mb-5">
              <p className="text-sm font-semibold text-slate-700">แนบสลิปโอนเงินเพื่อยืนยัน</p>
              {slipPreview ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={slipPreview} alt="slip preview" className="w-full h-40 object-cover" />
                  <button
                    type="button"
                    onClick={() => { setSlipFile(null); setSlipPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                    className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-black/70"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-blue-200 bg-white/50 cursor-pointer hover:bg-blue-50/50 transition-colors">
                  <ImagePlus className="w-6 h-6 text-blue-400" />
                  <span className="text-xs text-slate-500">แตะเพื่อเลือกรูปสลิป</span>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                onClick={closePayModal}
                className="flex-1 py-2.5 rounded-full text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSubmitSlip}
                disabled={!slipFile || isUploading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-bold text-white transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-60 disabled:translate-y-0"
                style={{ background: "#007aff", boxShadow: "0 8px 18px -6px #007aff" }}
              >
                {isUploading ? (
                  <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />กำลังส่ง...</>
                ) : (
                  <><Send className="w-3.5 h-3.5" />ยืนยันการชำระ</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helper: breakdown row ─────────────────────────────────────────────────
function Row({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-[var(--jh-ink-secondary)]">
      <span className="flex items-center gap-1.5 text-xs">
        {icon}
        {label}
      </span>
      <span className="text-xs font-semibold text-[var(--jh-ink)]">{thb(value)}</span>
    </div>
  );
}
