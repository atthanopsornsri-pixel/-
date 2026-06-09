"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { PLAN_PRICES, SMS_PRICES, JADHOR_PROMPTPAY } from "@/lib/pricing";
import { QRCodeSVG } from "qrcode.react";
import generatePayload from "promptpay-qr";
import { CreditCard } from "lucide-react";

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

  // SMS Credentials state
  const [smsApiKey, setSmsApiKey] = useState("");
  const [smsApiSecret, setSmsApiSecret] = useState("");
  const [smsSenderId, setSmsSenderId] = useState("JadHor");
  const [smsTestPhone, setSmsTestPhone] = useState("");
  const [smsCredSaving, setSmsCredSaving] = useState(false);
  const [smsCredMsg, setSmsCredMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [smsTesting, setSmsTesting] = useState(false);
  const [smsTestMsg, setSmsTestMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [smsHasKey, setSmsHasKey] = useState(false); // ตั้งค่า credentials แล้วหรือยัง

  // Slip upload feedback
  const [slipFeedback, setSlipFeedback] = useState<{ invoiceId: string; ok: boolean; text: string } | null>(null);

  // planTier comes from the DB via saas-status API (not from JWT — it's not in the session)
  const planTier = saasStatus?.planTier || "FREE_TRIAL";

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [invoicesRes, smsRes, saasRes, smsCredRes] = await Promise.all([
        fetch("/api/owner/bills"),
        fetch("/api/owner/sms-addon"),
        fetch("/api/owner/saas-status"),
        fetch("/api/owner/sms-credentials"),
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
      if (smsCredRes.ok) {
        const cred = await smsCredRes.json();
        if (cred) {
          setSmsHasKey(cred.hasApiKey || false);
          setSmsApiKey(cred.thaibulkApiKey || ""); // masked key for display
          setSmsSenderId(cred.thaibulkSenderId || "JadHor");
        }
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

  async function handleSmsCredSave() {
    if (!smsApiKey || !smsApiSecret) {
      setSmsCredMsg({ ok: false, text: "กรุณากรอก API Key และ API Secret" });
      return;
    }
    setSmsCredSaving(true);
    setSmsCredMsg(null);
    try {
      const res = await fetch("/api/owner/sms-credentials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: smsApiKey, apiSecret: smsApiSecret, senderId: smsSenderId }),
      });
      const data = await res.json();
      if (res.ok) {
        setSmsHasKey(true);
        setSmsCredMsg({ ok: true, text: "บันทึก API credentials สำเร็จแล้ว" });
        setSmsApiSecret(""); // ล้าง secret ออกจาก UI หลัง save
      } else {
        setSmsCredMsg({ ok: false, text: data?.message || "เกิดข้อผิดพลาด" });
      }
    } catch {
      setSmsCredMsg({ ok: false, text: "เกิดข้อผิดพลาดที่ไม่คาดคิด" });
    } finally {
      setSmsCredSaving(false);
    }
  }

  async function handleSmsTest() {
    if (!smsTestPhone) {
      setSmsTestMsg({ ok: false, text: "กรุณาระบุเบอร์โทรทดสอบ" });
      return;
    }
    setSmsTesting(true);
    setSmsTestMsg(null);
    try {
      const res = await fetch("/api/owner/sms-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testPhone: smsTestPhone }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSmsTestMsg({ ok: true, text: data.message || "ส่ง SMS ทดสอบสำเร็จ" });
      } else {
        setSmsTestMsg({ ok: false, text: data?.message || "ส่ง SMS ไม่สำเร็จ" });
      }
    } catch {
      setSmsTestMsg({ ok: false, text: "เกิดข้อผิดพลาดที่ไม่คาดคิด" });
    } finally {
      setSmsTesting(false);
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
    setSlipFeedback(null);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const res = await fetch(`/api/owner/bills/${invoiceId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slipUrl: base64 }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          fetchData();
          setSlipFeedback({
            invoiceId,
            ok: true,
            text: data?.message || (data?.autoApproved
              ? "✅ ชำระสำเร็จ! สลิปผ่านการตรวจอัตโนมัติ"
              : "📤 อัปโหลดสลิปสำเร็จ — กำลังรอ Admin ตรวจสอบ"),
          });
        } else {
          const errText = data?.code === "AMOUNT_MISMATCH"
            ? `ยอดเงินในสลิปไม่ตรง: ${data.message}`
            : data?.code === "DUPLICATE_SLIP"
            ? "สลิปซ้ำ: สลิปนี้เคยใช้งานไปแล้ว"
            : data?.message || "เกิดข้อผิดพลาดในการอัปโหลดสลิป";
          setSlipFeedback({ invoiceId, ok: false, text: errText });
        }
        setSlipUploading(null);
      };
      reader.readAsDataURL(file);
    } catch (e) {
      console.error(e);
      setSlipFeedback({ invoiceId: invoiceId, ok: false, text: "เกิดข้อผิดพลาดที่ไม่คาดคิด" });
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
      <div className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--jh-radius-md)]"
          style={{ background: "#ff3b30", color: "#fff", boxShadow: "0 10px 22px -8px #ff3b30" }}
        >
          <CreditCard className="h-[22px] w-[22px]" strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-2xl md:text-[28px] font-bold text-[var(--jh-ink)] tracking-[-0.02em]">
            การสมัครใช้บริการ
          </h1>
          <p className="text-sm md:text-base font-medium text-slate-500 mt-0.5">
            จัดการแพ็กเกจ JadHor OS, บริการเสริม SMS และประวัติใบแจ้งหนี้ของคุณ
          </p>
        </div>
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
      {/* Section 2b: ตั้งค่า Thaibulksms API */}
      {/* ============================================= */}
      <section>
        <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm">🔑</span>
          ตั้งค่า Thaibulksms API
          {smsHasKey && (
            <span className="ml-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-600 border border-emerald-200">
              ✓ ตั้งค่าแล้ว
            </span>
          )}
        </h2>

        <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-6 md:p-8 space-y-5">
          {/* How-to link */}
          <div className="flex items-start gap-3 p-4 rounded-2xl"
            style={{ background: "linear-gradient(150deg, #f4f9ff 0%, #e3f0ff 100%)", border: "1px solid rgba(255,255,255,0.6)" }}>
            <span className="text-xl">ℹ️</span>
            <div className="text-sm text-blue-800">
              <p className="font-semibold">วิธีรับ API Key</p>
              <p className="mt-1 text-blue-700/80">
                สมัครที่{" "}
                <a href="https://www.thaibulksms.com" target="_blank" rel="noopener noreferrer"
                  className="underline font-bold hover:text-blue-900 transition-colors">
                  thaibulksms.com
                </a>{" "}
                → ไปที่ &ldquo;การตั้งค่า&rdquo; → &ldquo;API&rdquo; → คัดลอก API Key และ API Secret มาวางด้านล่าง
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">
                API Key {smsHasKey && <span className="text-xs text-slate-400 font-normal">(แสดง masked — กรอกใหม่เพื่ออัปเดต)</span>}
              </label>
              <input
                type="text"
                value={smsApiKey}
                onChange={(e) => setSmsApiKey(e.target.value)}
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="flex h-11 w-full rounded-xl border border-slate-200 bg-white/80 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">
                API Secret <span className="text-xs text-red-400 font-normal">(จะไม่แสดงอีกหลังบันทึก)</span>
              </label>
              <input
                type="password"
                value={smsApiSecret}
                onChange={(e) => setSmsApiSecret(e.target.value)}
                placeholder="••••••••••••••••"
                className="flex h-11 w-full rounded-xl border border-slate-200 bg-white/80 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">
                Sender ID <span className="text-xs text-slate-400 font-normal">(max 11 ตัวอักษร — แสดงเป็นชื่อผู้ส่ง SMS)</span>
              </label>
              <input
                type="text"
                value={smsSenderId}
                onChange={(e) => setSmsSenderId(e.target.value.slice(0, 11))}
                placeholder="JadHor"
                maxLength={11}
                className="flex h-11 w-full rounded-xl border border-slate-200 bg-white/80 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
              />
            </div>
          </div>

          {/* Save button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <button
              onClick={handleSmsCredSave}
              disabled={smsCredSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60 cursor-pointer"
              style={{
                background: "#5856d6",
                boxShadow: "0 8px 18px -6px #5856d6",
              }}
            >
              {smsCredSaving ? "กำลังบันทึก..." : "💾 บันทึก Credentials"}
            </button>
            {smsCredMsg && (
              <span className={`text-sm font-semibold ${smsCredMsg.ok ? "text-emerald-600" : "text-red-500"}`}>
                {smsCredMsg.ok ? "✓" : "✗"} {smsCredMsg.text}
              </span>
            )}
          </div>

          {/* Test SMS */}
          {smsHasKey && (
            <div className="border-t border-slate-100 pt-5 space-y-3">
              <p className="text-sm font-semibold text-slate-700">ทดสอบส่ง SMS</p>
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <input
                  type="tel"
                  value={smsTestPhone}
                  onChange={(e) => setSmsTestPhone(e.target.value)}
                  placeholder="0812345678"
                  className="flex h-11 w-full sm:w-48 rounded-xl border border-slate-200 bg-white/80 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
                />
                <button
                  onClick={handleSmsTest}
                  disabled={smsTesting || !smsTestPhone}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60 cursor-pointer shrink-0"
                  style={{
                    background: "#34c759",
                    boxShadow: "0 8px 18px -6px #34c759",
                  }}
                >
                  {smsTesting ? "กำลังส่ง..." : "📤 ส่ง SMS ทดสอบ"}
                </button>
                {smsTestMsg && (
                  <span className={`text-sm font-semibold ${smsTestMsg.ok ? "text-emerald-600" : "text-red-500"}`}>
                    {smsTestMsg.ok ? "✓" : "✗"} {smsTestMsg.text}
                  </span>
                )}
              </div>
            </div>
          )}
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
                          <div
                            className={`flex-shrink-0 px-5 py-2.5 text-white text-sm font-bold rounded-full transition-all group-hover:shadow-lg active:scale-[0.98] ${
                              slipUploading === inv.id ? "bg-slate-400 cursor-wait" : "bg-blue-600 hover:bg-blue-700"
                            }`}
                          >
                            {slipUploading === inv.id ? (
                              <span className="flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                กำลังตรวจสอบสลิป...
                              </span>
                            ) : "📎 แนบสลิปโอนเงิน"}
                          </div>
                          <span className="text-xs text-slate-400">
                            {slipUploading === inv.id ? "กำลังประมวลผลและตรวจสอบ SlipOK..." : "เลือกไฟล์รูปสลิป (.jpg, .png)"}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={slipUploading === inv.id}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleSlipUpload(inv.id, file);
                            }}
                          />
                        </label>

                        {/* Slip feedback message */}
                        {slipFeedback?.invoiceId === inv.id && (
                          <div className={`mt-3 flex items-start gap-2 px-4 py-3 rounded-xl text-sm font-semibold ${
                            slipFeedback.ok
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-red-50 text-red-600 border border-red-200"
                          }`}>
                            <span className="shrink-0">{slipFeedback.ok ? "✅" : "⚠️"}</span>
                            <span>{slipFeedback.text}</span>
                          </div>
                        )}
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
