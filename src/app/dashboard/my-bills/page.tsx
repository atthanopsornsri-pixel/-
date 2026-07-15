"use client";
import { toast } from "sonner";
import { useState, useRef } from "react";
import useSWR from "swr";
import { jsonFetcher } from "@/lib/fetcher";
import { QRCodeSVG } from "qrcode.react";
import generatePayload from "promptpay-qr";
import { submitPaymentSlip } from "@/app/actions/tenant-payment";
import { PageHeader } from "@/components/PageHeader";
import SuccessPopup from "@/components/SuccessPopup";
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
  Printer,
  Ban,
} from "lucide-react";

// ── Status tone mapping ──────────────────────────────────────────────────────
type StatusKey = "UNPAID" | "PENDING" | "PAID" | "OVERDUE" | "PARTIAL" | "WAIVED";

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
    label: "รอตรวจสอบ", gradFrom: "#fdf8ee", gradTo: "#f6ecd6",
    solid: "#d4a548", ink: "var(--jh-orange-ink)",
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
  WAIVED: {
    label: "ได้รับการยกเว้น", gradFrom: "#f6f6ff", gradTo: "#e8e7fb",
    solid: "#5856d6", ink: "var(--jh-indigo)",
    icon: <Ban className="h-5 w-5" strokeWidth={2} />,
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
  // ── SWR: bills ───────────────────────────────────────────────────────────
  const { data: bills = [], isLoading: loading, mutate: mutateBills } = useSWR<any[]>(
    "/api/bills",
    jsonFetcher
  );

  // ── Payment modal state ──────────────────────────────────────────────────
  const [payBill, setPayBill] = useState<any | null>(null);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── PDF Receipt state ──────────────────────────────────────────────────
  const [receiptBill, setReceiptBill] = useState<any | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  // Success popup state
  const [successPopup, setSuccessPopup] = useState<{ open: boolean; title: string; message?: string }>({
    open: false, title: "",
  });

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

  function handlePrintReceipt(bill: any) {
    setReceiptBill(bill);
    setTimeout(() => {
      window.print();
    }, 300);
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
        setSuccessPopup({
          open: true,
          title: "ส่งสลิปชำระเงินสำเร็จ! 🎉",
          message: "ระบบกำลังส่งให้เจ้าของหอพักตรวจสอบความถูกต้องนะคะ"
        });
        closePayModal();
        mutateBills();
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
        <div className="text-center py-12 rounded-[var(--jh-radius-2xl)] border border-dashed border-slate-200 bg-white p-6 max-w-md mx-auto shadow-sm">
          <img
            src="/images/mascot/empty_bills_sleep.png"
            alt="ไม่มียอดค้างชำระ"
            className="w-40 h-40 mx-auto mb-4 jh-float-soft drop-shadow-[0_8px_16px_rgba(0,0,0,0.06)] object-contain"
          />
          <p className="font-bold text-slate-800 text-lg">ไม่มียอดค้างชำระในรอบนี้</p>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            คุณเคลียร์บิลค่าห้องพักและบริการเสร็จสิ้นหมดแล้ว นอนหลับพักผ่อนให้สบายใจได้เลยนะคะ 😴
          </p>
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
                      style={{ background: "#fdf8ee", color: "#d4a548" }}>
                      <Clock className="w-4 h-4" />
                      รอเจ้าของหอตรวจสอบสลิป
                    </div>
                  )}

                  {bill.status === "WAIVED" && (
                    <div className="flex flex-col items-center gap-1 py-2.5 rounded-2xl text-sm font-semibold text-center px-3"
                      style={{ background: "#f6f6ff", color: "#5856d6" }}>
                      <div className="flex items-center gap-2">
                        <Ban className="w-4 h-4" />
                        เจ้าของหอยกเว้นบิลนี้ให้ ไม่ต้องชำระเงิน
                      </div>
                      {bill.waivedReason && (
                        <div className="text-xs font-normal opacity-80">เหตุผล: {bill.waivedReason}</div>
                      )}
                    </div>
                  )}

                  {bill.status === "PAID" && (
                    <button
                      onClick={() => handlePrintReceipt(bill)}
                      className="mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-full text-xs font-semibold border border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" /> พิมพ์ใบเสร็จรับเงิน
                    </button>
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
            style={{ background: "linear-gradient(150deg, #f3f5fa 0%, #e4eaf5 100%)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--jh-radius-md)]"
                  style={{ background: "#34508c", color: "#fff", boxShadow: "0 10px 22px -8px #34508c" }}
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
              <p className="text-4xl font-extrabold tabular-nums" style={{ color: "#34508c" }}>
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
                style={{ background: "#34508c", boxShadow: "0 8px 18px -6px #34508c" }}
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
      {/* ── Success Popup ── */}
      <SuccessPopup
        open={successPopup.open}
        title={successPopup.title}
        message={successPopup.message}
        autoCloseMs={5000}
        onClose={() => setSuccessPopup({ open: false, title: "" })}
        mascotType="payment"
      />

      {/* ── Print Receipt (hidden, only visible on print) ── */}
      {receiptBill && (
        <div ref={receiptRef} className="hidden print:block">
          <PrintReceipt bill={receiptBill} />
        </div>
      )}
      <style>{`
        @media print {
          body > * { display: none !important; }
          .print\\:block { display: block !important; }
        }
      `}</style>
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

// ── PrintReceipt ── ใบเสร็จรับเงิน สำหรับ @media print ───────────────────
const MONTH_NAMES_RECEIPT = [
  "มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
  "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม",
];

function PrintReceipt({ bill }: { bill: any }) {
  const isCheckin = bill.type === "CHECKIN";
  const periodLabel = isCheckin
    ? "บิลเข้าอยู่ (Check-in)"
    : `${MONTH_NAMES_RECEIPT[bill.month - 1]} ${bill.year + 543}`;

  const printDate = new Date().toLocaleDateString("th-TH", {
    day: "numeric", month: "long", year: "numeric",
  });

  const rows: { label: string; value: number }[] = [];
  if (isCheckin) {
    if (bill.securityDeposit > 0) rows.push({ label: "เงินประกันห้อง", value: bill.securityDeposit });
    if (bill.advanceRent > 0) rows.push({ label: "ค่าเช่าล่วงหน้า", value: bill.advanceRent });
    if (bill.keyDeposit > 0) rows.push({ label: "ค่ามัดจำกุญแจ/คีย์การ์ด", value: bill.keyDeposit });
    if (bill.vehicleFee > 0) rows.push({ label: "ค่าลงทะเบียนที่จอดรถ", value: bill.vehicleFee });
  } else {
    rows.push({ label: "ค่าเช่าห้อง", value: bill.rentAmount });
    if (bill.waterAmount > 0) rows.push({ label: `ค่าน้ำ${bill.waterUnits ? ` (${bill.waterUnits} หน่วย)` : ""}`, value: bill.waterAmount });
    if (bill.electricAmount > 0) rows.push({ label: `ค่าไฟ${bill.electricUnits ? ` (${bill.electricUnits} หน่วย)` : ""}`, value: bill.electricAmount });
    if (bill.commonFee > 0) rows.push({ label: "ค่าส่วนกลาง", value: bill.commonFee });
    if (bill.parkingFee > 0) rows.push({ label: "ค่าที่จอดรถ", value: bill.parkingFee });
    if (bill.internetFee > 0) rows.push({ label: "ค่าอินเทอร์เน็ต", value: bill.internetFee });
    if (bill.otherFee > 0) rows.push({ label: "ค่าบริการอื่นๆ", value: bill.otherFee });
    if (bill.balanceForward > 0) rows.push({ label: "ยอดค้างยกมา", value: bill.balanceForward });
  }

  return (
    <div style={{
      fontFamily: "'Sarabun', 'Tahoma', sans-serif",
      maxWidth: "520px",
      margin: "40px auto",
      padding: "40px",
      border: "2px solid #16264c",
      borderRadius: "12px",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "24px", borderBottom: "2px solid #d4a548", paddingBottom: "20px" }}>
        <div style={{ fontSize: "24px", fontWeight: "900", color: "#16264c", letterSpacing: "-0.5px" }}>
          🏠 {bill.room?.property?.name ?? "JadHor"}
        </div>
        <div style={{ fontSize: "13px", color: "#666", marginTop: "4px" }}>ใบเสร็จรับเงิน / Payment Receipt</div>
        <div style={{
          display: "inline-block",
          marginTop: "8px",
          padding: "4px 16px",
          background: "#d4a548",
          color: "#fff",
          borderRadius: "20px",
          fontSize: "12px",
          fontWeight: "700",
        }}>
          ✅ ชำระเงินแล้ว
        </div>
      </div>

      {/* Info */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px", fontSize: "13px" }}>
        <div>
          <div style={{ color: "#666", fontSize: "11px", marginBottom: "2px" }}>ห้อง / Room</div>
          <div style={{ fontWeight: "700", color: "#16264c" }}>{bill.room?.number ?? "-"}</div>
        </div>
        <div>
          <div style={{ color: "#666", fontSize: "11px", marginBottom: "2px" }}>งวด / Period</div>
          <div style={{ fontWeight: "700", color: "#16264c" }}>{periodLabel}</div>
        </div>
        <div>
          <div style={{ color: "#666", fontSize: "11px", marginBottom: "2px" }}>วันออกใบเสร็จ</div>
          <div style={{ fontWeight: "600" }}>{printDate}</div>
        </div>
        {bill.paymentDate && (
          <div>
            <div style={{ color: "#666", fontSize: "11px", marginBottom: "2px" }}>วันชำระเงิน</div>
            <div style={{ fontWeight: "600" }}>
              {new Date(bill.paymentDate).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
        )}
      </div>

      {/* Breakdown */}
      <div style={{ borderTop: "1px solid #eee", paddingTop: "16px", marginBottom: "16px" }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "5px 0", borderBottom: "1px dashed #f0f0f0" }}>
            <span style={{ color: "#444" }}>{r.label}</span>
            <span style={{ fontWeight: "600" }}>{thb(r.value)}</span>
          </div>
        ))}
      </div>

      {/* Total */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "#f3f5fa",
        borderRadius: "8px",
        padding: "14px 16px",
        marginBottom: "24px",
      }}>
        <span style={{ fontWeight: "800", fontSize: "15px", color: "#16264c" }}>ยอดรวมทั้งสิ้น</span>
        <span style={{ fontWeight: "900", fontSize: "22px", color: "#16264c" }}>{thb(bill.totalAmount)}</span>
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", color: "#999", fontSize: "11px" }}>
        <p>ขอบคุณที่ใช้บริการ | Powered by JadHor OS</p>
        <p style={{ marginTop: "4px" }}>เอกสารนี้ออกโดยระบบ JadHor — jadhor.vercel.app</p>
      </div>
    </div>
  );
}
