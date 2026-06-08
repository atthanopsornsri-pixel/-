"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { PLAN_PRICES, SMS_PRICES, JADHOR_PROMPTPAY } from "@/lib/pricing";
import { QRCodeSVG } from "qrcode.react";
import generatePayload from "promptpay-qr";

// =============================================
// Types
// =============================================

interface InvoiceItem {
  id: string;
  type: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  month: number;
  year: number;
  totalAmount: number;
  status: string;
  slipUrl: string | null;
  paidAt: string | null;
  dueDate: string | null;
  note: string | null;
  createdAt: string;
  items: InvoiceItem[];
}

interface SmsAddon {
  id: string;
  tier: string;
  quota: number;
  used: number;
  isActive: boolean;
}

interface SaasStatus {
  planTier: string;
  planExpiresAt: string | null;
  totalRooms: number;
  roomLimit: number;
}

// =============================================
// Component
// =============================================

export default function SubscriptionPage() {
  const { data: session } = useSession();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [smsAddon, setSmsAddon] = useState<SmsAddon | null>(null);
  const [saasStatus, setSaasStatus] = useState<SaasStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);
  const [smsLoading, setSmsLoading] = useState(false);
  const [slipUploading, setSlipUploading] = useState<string | null>(null);

  // planTier comes from the DB via saas-status API (not from JWT — it's not in the session)
  const planTier = saasStatus?.planTier || "FREE_TRIAL";

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [invoicesRes, smsRes, saasRes] = await Promise.all([
        fetch("/api/owner/bills"),
        fetch("/api/owner/sms-addon"),
        fetch("/api/owner/saas-status"),
      ]);
      if (invoicesRes.ok) setInvoices(await invoicesRes.json());
      if (smsRes.ok) {
        const data = await smsRes.json();
        setSmsAddon(data);
      }
      if (saasRes.ok) {
        const data = await saasRes.json();
        setSaasStatus(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSmsSubscribe(tier: string) {
    setSmsLoading(true);
    try {
      const res = await fetch("/api/owner/sms-addon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      if (res.ok) {
        const data = await res.json();
        setSmsAddon(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSmsLoading(false);
    }
  }

  async function handleSmsCancel() {
    if (!confirm("ยืนยันยกเลิกแพ็กเกจ SMS? (จะมีผลตั้งแต่รอบบิลถัดไป)")) return;
    setSmsLoading(true);
    try {
      const res = await fetch("/api/owner/sms-addon", { method: "DELETE" });
      if (res.ok) {
        const data = await res.json();
        setSmsAddon(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSmsLoading(false);
    }
  }

  async function handleSlipUpload(invoiceId: string, file: File) {
    setSlipUploading(invoiceId);
    try {
      // Convert to base64 for simplicity (production should use cloud storage)
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const res = await fetch(`/api/owner/bills/${invoiceId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slipUrl: base64 }),
        });
        if (res.ok) {
          fetchData();
        }
        setSlipUploading(null);
      };
      reader.readAsDataURL(file);
    } catch (e) {
      console.error(e);
      setSlipUploading(null);
    }
  }

  // =============================================
  // Status badge helper
  // =============================================

  function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      UNPAID:  { bg: "bg-red-50 border-red-200",    text: "text-red-700",    label: "ค้างชำระ" },
      PENDING: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", label: "รอตรวจสลิป" },
      PAID:    { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", label: "ชำระแล้ว" },
      OVERDUE: { bg: "bg-rose-50 border-rose-200",   text: "text-rose-700",   label: "เลยกำหนด" },
    };
    const s = map[status] || map.UNPAID;
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${s.bg} ${s.text}`}>
        {s.label}
      </span>
    );
  }

  // =============================================
  // Month name helper
  // =============================================

  const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-12">
        <div className="flex items-center justify-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-slate-500 font-medium">กำลังโหลดข้อมูล...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">
          การสมัครใช้บริการ
        </h1>
        <p className="text-sm md:text-base font-medium text-slate-500 mt-2">
          จัดการแพ็กเกจ JadHor OS, บริการเสริม SMS และประวัติใบแจ้งหนี้ของคุณ
        </p>
      </div>

      {/* ============================================= */}
      {/* Section 1: แพ็กเกจปัจจุบัน */}
      {/* ============================================= */}
      <section>
        <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-sm">📦</span>
          แพ็กเกจปัจจุบันของคุณ
        </h2>
        <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black text-slate-800">
                  {PLAN_PRICES[planTier as keyof typeof PLAN_PRICES]?.label || planTier}
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200">
                  ใช้งานอยู่
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                รองรับสูงสุด {PLAN_PRICES[planTier as keyof typeof PLAN_PRICES]?.maxRooms || "—"} ห้อง
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-blue-600">
                ฿{(PLAN_PRICES[planTier as keyof typeof PLAN_PRICES]?.monthly || 0).toLocaleString()}
              </div>
              <p className="text-xs text-slate-400 mt-1">ต่อเดือน</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================= */}
      {/* Section 2: แพ็กเกจเสริม SMS Add-on */}
      {/* ============================================= */}
      <section>
        <h2 className="text-lg font-bold text-slate-700 mb-2 flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm">📱</span>
          แพ็กเกจเสริม: ระบบส่งสัญญาณ SMS อัจฉริยะ
        </h2>

        {/* Transparency copy */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-5 mb-6">
          <p className="text-sm text-blue-800 font-semibold mb-2">
            &quot;เข้าถึงลูกบ้านทุกคน 100% แม้ไม่ได้เปิดเน็ต หรือไม่ได้เล่น LINE&quot;
          </p>
          <p className="text-xs text-blue-600/80 leading-relaxed">
            📢 <strong>ชี้แจงเรื่องค่าบริการทางเทคนิค:</strong> เนื่องจากระบบการส่งข้อความสั้น (SMS) มีต้นทุนจริงที่เกิดขึ้นจากผู้ให้บริการเครือข่ายโทรคมนาคม (AIS, True, dtac) ทาง JadHor OS จึงแยกแพ็กเกจนี้เป็น <strong>&quot;บริการเสริมตามความสมัครใจ&quot;</strong> ไม่ผูกรวมกับค่าระบบหลัก เพื่อให้เจ้าของหอพักที่ไม่ได้ใช้ฟีเจอร์นี้ ไม่ต้องแบกรับต้นทุนร่วมด้วย
          </p>
          <p className="text-xs text-blue-700/70 mt-2 italic">
            คุ้มค่ากว่า: เฉลี่ยต้นทุนเพียงห้องละ 3-5 บาทต่อเดือน แต่ลดอัตราการจ่ายเงินเลทได้เกินครึ่ง!
          </p>
        </div>

        {/* SMS Quota Display (if active) */}
        {smsAddon && smsAddon.isActive && (
          <div className="bg-white rounded-2xl border border-emerald-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-5 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-emerald-700">โควตา SMS เดือนนี้</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-emerald-600">{smsAddon.used}</span>
                  <span className="text-lg text-slate-400 font-bold">/ {smsAddon.quota}</span>
                  <span className="text-xs text-slate-400">ข้อความ</span>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                  {SMS_PRICES[smsAddon.tier as keyof typeof SMS_PRICES]?.label || smsAddon.tier}
                </span>
                <button
                  onClick={handleSmsCancel}
                  disabled={smsLoading}
                  className="block text-xs text-rose-500 hover:text-rose-600 mt-2 font-medium transition-colors cursor-pointer"
                >
                  ยกเลิกแพ็กเกจ
                </button>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((smsAddon.used / smsAddon.quota) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* SMS Tier Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(Object.entries(SMS_PRICES) as [string, typeof SMS_PRICES[keyof typeof SMS_PRICES]][]).map(([tierKey, tierData]) => {
            const isCurrentTier = smsAddon?.isActive && smsAddon.tier === tierKey;
            return (
              <div
                key={tierKey}
                className={`relative bg-white rounded-[20px] border-2 p-6 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 ${
                  isCurrentTier
                    ? "border-emerald-400 shadow-[0_4px_20px_rgb(16,185,129,0.15)]"
                    : "border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)]"
                }`}
              >
                {isCurrentTier && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full">
                    ใช้งานอยู่
                  </div>
                )}
                {tierKey === "SIZE_M" && !isCurrentTier && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">
                    แนะนำ
                  </div>
                )}
                <div className="text-center">
                  <h3 className="text-lg font-black text-slate-800">{tierData.label}</h3>
                  <p className="text-xs text-slate-400 mt-1">{tierData.recommended}</p>
                  <div className="mt-4">
                    <span className="text-3xl font-black text-slate-800">฿{tierData.monthly}</span>
                    <span className="text-sm text-slate-400">/เดือน</span>
                  </div>
                  <div className="mt-2 inline-flex items-center px-3 py-1 bg-blue-50 rounded-full">
                    <span className="text-xs font-bold text-blue-600">{tierData.quota} ข้อความ/เดือน</span>
                  </div>
                  <button
                    onClick={() => handleSmsSubscribe(tierKey)}
                    disabled={smsLoading || isCurrentTier}
                    className={`mt-5 w-full py-2.5 rounded-full text-sm font-bold transition-all duration-200 cursor-pointer ${
                      isCurrentTier
                        ? "bg-emerald-100 text-emerald-600 cursor-default"
                        : "bg-slate-800 text-white hover:bg-slate-700 hover:shadow-lg active:scale-[0.98]"
                    }`}
                  >
                    {smsLoading ? "กำลังดำเนินการ..." : isCurrentTier ? "✓ เปิดใช้งานแล้ว" : smsAddon?.isActive ? "เปลี่ยนแพ็กเกจ" : "เปิดใช้งาน"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============================================= */}
      {/* Section 3: ข้อมูลการชำระเงิน PromptPay */}
      {/* ============================================= */}
      <section>
        <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center text-sm">💳</span>
          ช่องทางชำระค่าบริการ
        </h2>
        <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-48 h-48 bg-white p-3 rounded-2xl flex flex-col items-center justify-center border border-slate-200 shadow-[0_4px_15px_rgba(0,0,0,0.03)]">
              <div className="bg-blue-600 text-white text-[10px] font-extrabold px-3 py-0.5 rounded-full mb-2 tracking-wider">PROMPTPAY</div>
              <QRCodeSVG value={generatePayload(JADHOR_PROMPTPAY.number, {})} size={120} />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-lg font-bold text-slate-800">โอนเงินผ่าน PromptPay</h3>
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <span className="text-sm text-slate-500">เบอร์พร้อมเพย์:</span>
                  <span className="text-sm font-bold text-slate-800">{JADHOR_PROMPTPAY.number}</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(JADHOR_PROMPTPAY.number)}
                    className="text-xs text-blue-500 hover:text-blue-600 font-medium cursor-pointer"
                  >
                    📋 คัดลอก
                  </button>
                </div>
                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <span className="text-sm text-slate-500">ชื่อบัญชี:</span>
                  <span className="text-sm font-bold text-slate-800">{JADHOR_PROMPTPAY.name}</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-4 leading-relaxed">
                หลังโอนเงินแล้ว กรุณาแนบสลิปในตารางใบแจ้งหนี้ด้านล่าง<br />
                ทีม Admin จะตรวจสอบและเปิดระบบให้ภายใน 24 ชั่วโมง
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================= */}
      {/* Section 4: ประวัติใบแจ้งหนี้ (Itemized) */}
      {/* ============================================= */}
      <section>
        <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-sm">📄</span>
          ประวัติใบแจ้งหนี้
        </h2>

        {invoices.length === 0 ? (
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-12 text-center">
            <div className="text-5xl mb-4">🧾</div>
            <p className="text-slate-500 font-medium">ยังไม่มีใบแจ้งหนี้</p>
            <p className="text-xs text-slate-400 mt-1">ใบแจ้งหนี้จะแสดงที่นี่เมื่อมีรอบเรียกเก็บเงินถัดไป</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="bg-white rounded-[20px] border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]"
              >
                {/* Invoice Header Row */}
                <div
                  className="flex flex-col md:flex-row md:items-center justify-between p-5 cursor-pointer group"
                  onClick={() => setExpandedInvoice(expandedInvoice === inv.id ? null : inv.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center text-sm font-bold border border-slate-100 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-100 transition-colors">
                      🧾
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">{inv.invoiceNumber}</span>
                        <StatusBadge status={inv.status} />
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {thaiMonths[inv.month - 1]} {inv.year} • {inv.items.length} รายการ
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3 md:mt-0">
                    <div className="text-right">
                      <div className="text-xl font-black text-slate-800">
                        ฿{inv.totalAmount.toLocaleString()}
                      </div>
                    </div>
                    <svg
                      className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${expandedInvoice === inv.id ? "rotate-180" : ""}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Expandable Invoice Items */}
                {expandedInvoice === inv.id && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-5 animate-in slide-in-from-top-2 duration-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-slate-400 uppercase tracking-wider">
                          <th className="pb-3 font-semibold">รายการ</th>
                          <th className="pb-3 font-semibold text-center">จำนวน</th>
                          <th className="pb-3 font-semibold text-right">ราคาต่อหน่วย</th>
                          <th className="pb-3 font-semibold text-right">ยอดรวม</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inv.items.map((item, idx) => (
                          <tr key={item.id} className={idx > 0 ? "border-t border-slate-100" : ""}>
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                                  {idx + 1}
                                </span>
                                <span className="text-slate-700 font-medium">{item.description}</span>
                              </div>
                            </td>
                            <td className="py-3 text-center text-slate-600">{item.quantity}</td>
                            <td className="py-3 text-right text-slate-600">฿{item.unitPrice.toLocaleString()}</td>
                            <td className="py-3 text-right font-bold text-slate-800">฿{item.amount.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-slate-200">
                          <td colSpan={3} className="py-3 text-right font-bold text-slate-700">
                            ยอดรวมสุทธิที่ชำระ
                          </td>
                          <td className="py-3 text-right text-xl font-black text-blue-600">
                            ฿{inv.totalAmount.toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>

                    {/* Slip upload for UNPAID invoices */}
                    {(inv.status === "UNPAID" || inv.status === "OVERDUE") && (
                      <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
                        <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center flex-shrink-0">
                            <div className="bg-blue-600 text-white text-[8px] font-extrabold px-2 py-0.5 rounded-full mb-1 tracking-wider">PROMPTPAY</div>
                            <QRCodeSVG value={generatePayload(JADHOR_PROMPTPAY.number, { amount: inv.totalAmount })} size={110} />
                          </div>
                          <div className="text-center sm:text-left space-y-1">
                            <p className="text-sm font-bold text-slate-800">สแกนจ่ายตรงยอดด้วยแอปธนาคาร</p>
                            <p className="text-xs text-slate-500">
                              ระบบสร้าง QR Code พร้อมระบุยอดโอนเงินอัตโนมัติเพื่อความสะดวกและป้องกันความผิดพลาด
                            </p>
                            <div className="text-xs text-slate-600 mt-2 font-medium">
                              เบอร์พร้อมเพย์: <span className="font-bold text-slate-800">{JADHOR_PROMPTPAY.number}</span> | ชื่อบัญชี: <span className="font-bold text-slate-800">{JADHOR_PROMPTPAY.name}</span>
                            </div>
                            <div className="text-lg font-black text-blue-600 mt-1">
                              ยอดโอน: ฿{inv.totalAmount.toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <label className="flex items-center gap-3 cursor-pointer group">
                          <div className="flex-shrink-0 px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-full hover:bg-blue-700 transition-all group-hover:shadow-lg active:scale-[0.98]">
                            📎 แนบสลิปโอนเงิน
                          </div>
                          <span className="text-xs text-slate-400">
                            {slipUploading === inv.id ? "กำลังอัพโหลด..." : "เลือกไฟล์รูปสลิป (.jpg, .png)"}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleSlipUpload(inv.id, file);
                            }}
                          />
                        </label>
                      </div>
                    )}

                    {/* PENDING status message */}
                    {inv.status === "PENDING" && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <div className="flex items-center gap-2 text-sm text-amber-600 font-medium">
                          <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                          รอทีม Admin ตรวจสอบสลิป...
                        </div>
                      </div>
                    )}

                    {/* PAID confirmation */}
                    {inv.status === "PAID" && inv.paidAt && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                          ✅ ชำระเรียบร้อย — {new Date(inv.paidAt).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}
                        </div>
                      </div>
                    )}

                    {/* Admin note */}
                    {inv.note && (
                      <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                        <p className="text-xs text-amber-700"><strong>หมายเหตุจาก Admin:</strong> {inv.note}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
