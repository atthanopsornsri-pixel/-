"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { PLAN_PRICES, SMS_PRICES, JADHOR_PROMPTPAY } from "@/lib/pricing";
import { QRCodeSVG } from "qrcode.react";
import generatePayload from "promptpay-qr";
import {
  CreditCard, Package, Smartphone, Key, FileText,
  Crown, Building2, TrendingUp, MessageSquare,
  Shield, Check, ChevronDown, Zap,
} from "lucide-react";

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
// Plan / SMS metadata
// =============================================

const PLAN_META: Record<string, {
  Icon: React.ElementType;
  color: string;
  gradFrom: string;
  gradTo: string;
  inkColor: string;
  desc: string;
}> = {
  FREE_TRIAL: {
    Icon: Shield,
    color: "#34c759",
    gradFrom: "#f3fcf6",
    gradTo: "#e0f7e9",
    inkColor: "var(--jh-green-ink)",
    desc: "ทดลองใช้ครบทุกฟีเจอร์ ไม่ต้องผูกบัตร",
  },
  STARTER: {
    Icon: Building2,
    color: "#007aff",
    gradFrom: "#f4f9ff",
    gradTo: "#e3f0ff",
    inkColor: "var(--jh-blue)",
    desc: "เหมาะสำหรับหอพักขนาดเล็ก สูงสุด 30 ห้อง",
  },
  GROWTH: {
    Icon: TrendingUp,
    color: "#ff9500",
    gradFrom: "#fff9f2",
    gradTo: "#ffeed9",
    inkColor: "var(--jh-orange-ink)",
    desc: "สำหรับหอพักที่กำลังขยาย สูงสุด 100 ห้อง",
  },
  ENTERPRISE: {
    Icon: Crown,
    color: "#5856d6",
    gradFrom: "#f6f6ff",
    gradTo: "#e8e7fb",
    inkColor: "var(--jh-indigo)",
    desc: "ไม่จำกัดจำนวนห้อง รองรับทุกขนาดธุรกิจ",
  },
};

const SMS_META: Record<string, {
  color: string;
  gradFrom: string;
  gradTo: string;
  inkColor: string;
  Icon: React.ElementType;
}> = {
  SIZE_S: {
    color: "#34c759",
    gradFrom: "#f3fcf6",
    gradTo: "#e0f7e9",
    inkColor: "var(--jh-green-ink)",
    Icon: MessageSquare,
  },
  SIZE_M: {
    color: "#007aff",
    gradFrom: "#f4f9ff",
    gradTo: "#e3f0ff",
    inkColor: "var(--jh-blue)",
    Icon: Smartphone,
  },
  SIZE_L: {
    color: "#ff9500",
    gradFrom: "#fff9f2",
    gradTo: "#ffeed9",
    inkColor: "var(--jh-orange-ink)",
    Icon: Zap,
  },
};

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

  const [smsApiKey, setSmsApiKey] = useState("");
  const [smsApiKeyMasked, setSmsApiKeyMasked] = useState("");
  const [smsApiSecret, setSmsApiSecret] = useState("");
  const [smsApiSecretMasked, setSmsApiSecretMasked] = useState("");
  const [smsHasSecret, setSmsHasSecret] = useState(false);
  const [smsSenderId, setSmsSenderId] = useState("JadHor");
  const [smsTestPhone, setSmsTestPhone] = useState("");
  const [smsCredSaving, setSmsCredSaving] = useState(false);
  const [smsCredMsg, setSmsCredMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [smsTesting, setSmsTesting] = useState(false);
  const [smsTestMsg, setSmsTestMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [smsHasKey, setSmsHasKey] = useState(false);

  const [slipFeedback, setSlipFeedback] = useState<{ invoiceId: string; ok: boolean; text: string } | null>(null);

  const planTier = saasStatus?.planTier || "FREE_TRIAL";
  const planMeta = PLAN_META[planTier] ?? PLAN_META.FREE_TRIAL;
  const PlanIcon = planMeta.Icon;
  const monthlyPrice = PLAN_PRICES[planTier as keyof typeof PLAN_PRICES]?.monthly || 0;
  const roomLimitLabel = saasStatus?.roomLimit && saasStatus.roomLimit >= 999999 ? "ไม่จำกัด" : (saasStatus?.roomLimit ?? "—");

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
      if (smsRes.ok) setSmsAddon(await smsRes.json());
      if (saasRes.ok) setSaasStatus(await saasRes.json());
      if (smsCredRes.ok) {
        const cred = await smsCredRes.json();
        if (cred) {
          setSmsHasKey(cred.hasApiKey || false);
          setSmsHasSecret(cred.hasApiSecret || false);
          setSmsApiKeyMasked(cred.thaibulkApiKey || "");
          setSmsApiSecretMasked(cred.thaibulkApiSecret || "");
          setSmsApiKey("");
          setSmsApiSecret("");
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
      if (res.ok) setSmsAddon(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setSmsLoading(false);
    }
  }

  async function handleSmsCredSave() {
    if (!smsApiKey && !smsHasKey) {
      setSmsCredMsg({ ok: false, text: "กรุณากรอก API Key" });
      return;
    }
    if (!smsApiSecret && !smsHasSecret) {
      setSmsCredMsg({ ok: false, text: "กรุณากรอก API Secret" });
      return;
    }
    setSmsCredSaving(true);
    setSmsCredMsg(null);
    try {
      const res = await fetch("/api/owner/sms-credentials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: smsApiKey || null,
          apiSecret: smsApiSecret || null,
          senderId: smsSenderId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSmsHasKey(true);
        if (smsApiSecret) setSmsHasSecret(true);
        setSmsCredMsg({ ok: true, text: "บันทึก API Key & Secret สำเร็จแล้ว" });
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
      if (res.ok) setSmsAddon(await res.json());
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
      setSlipFeedback({ invoiceId, ok: false, text: "เกิดข้อผิดพลาดที่ไม่คาดคิด" });
      setSlipUploading(null);
    }
  }

  // =============================================
  // Helpers
  // =============================================

  function SectionHeader({
    icon: Icon,
    color,
    label,
    badge,
  }: {
    icon: React.ElementType;
    color: string;
    label: string;
    badge?: React.ReactNode;
  }) {
    return (
      <div className="flex items-center gap-3 mb-5">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--jh-radius-md)]"
          style={{ background: color, color: "#fff", boxShadow: `0 8px 18px -6px ${color}` }}
        >
          <Icon className="h-[17px] w-[17px]" strokeWidth={2} />
        </div>
        <h2 className="text-lg font-bold text-[var(--jh-ink)]">{label}</h2>
        {badge}
      </div>
    );
  }

  function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      UNPAID:  { bg: "bg-red-50 border-red-200",         text: "text-red-700",     label: "ค้างชำระ" },
      PENDING: { bg: "bg-amber-50 border-amber-200",     text: "text-amber-700",   label: "รอตรวจสลิป" },
      PAID:    { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", label: "ชำระแล้ว" },
      OVERDUE: { bg: "bg-rose-50 border-rose-200",       text: "text-rose-700",    label: "เลยกำหนด" },
    };
    const s = map[status] ?? map.UNPAID;
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${s.bg} ${s.text}`}>
        {s.label}
      </span>
    );
  }

  const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-16 flex items-center justify-center gap-3">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-[var(--jh-ink-secondary)] font-medium">กำลังโหลดข้อมูล...</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">

      {/* ── Page Header ── */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--jh-radius-md)]"
          style={{ background: "#ff3b30", color: "#fff", boxShadow: "0 10px 22px -8px #ff3b30" }}
        >
          <CreditCard className="h-[22px] w-[22px]" strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-2xl md:text-[28px] font-bold text-[var(--jh-ink)] tracking-[-0.02em]">
            แพ็กเกจการใช้งาน
          </h1>
          <p className="text-sm text-[var(--jh-ink-secondary)] mt-0.5">
            จัดการแพ็กเกจ, บริการเสริม SMS และประวัติใบแจ้งหนี้ของคุณ
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════ */}
      {/* Section 1: แพ็กเกจปัจจุบัน               */}
      {/* ══════════════════════════════════════════ */}
      <section>
        <SectionHeader icon={Package} color={planMeta.color} label="แพ็กเกจปัจจุบันของคุณ" />

        <div
          className="rounded-[var(--jh-radius-2xl)] border border-white/60 p-6 md:p-8 shadow-[var(--jh-shadow-card)]"
          style={{ background: `linear-gradient(150deg, ${planMeta.gradFrom} 0%, ${planMeta.gradTo} 100%)` }}
        >
          <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
            {/* Left: icon + plan info */}
            <div className="flex items-center gap-5">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[var(--jh-radius-xl)]"
                style={{ background: planMeta.color, color: "#fff", boxShadow: `0 12px 28px -8px ${planMeta.color}` }}
              >
                <PlanIcon className="h-8 w-8" strokeWidth={2} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-2xl font-black" style={{ color: planMeta.inkColor }}>
                    {PLAN_PRICES[planTier as keyof typeof PLAN_PRICES]?.label || planTier}
                  </span>
                  <span
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold text-white"
                    style={{ background: planMeta.color }}
                  >
                    <Check className="w-3 h-3" strokeWidth={3} /> ใช้งานอยู่
                  </span>
                </div>
                <p className="text-sm text-[var(--jh-ink-secondary)] mt-1">{planMeta.desc}</p>
                {saasStatus?.planExpiresAt && (
                  <p className="text-xs text-[var(--jh-ink-tertiary)] mt-1.5">
                    หมดอายุ:{" "}
                    {new Date(saasStatus.planExpiresAt).toLocaleDateString("th-TH", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                )}
              </div>
            </div>

            {/* Right: price */}
            <div className="md:ml-auto text-left md:text-right">
              <div className="text-4xl font-black" style={{ color: planMeta.inkColor }}>
                ฿{monthlyPrice.toLocaleString()}
              </div>
              <p className="text-xs text-[var(--jh-ink-tertiary)] mt-1">ต่อเดือน</p>
            </div>
          </div>

          {/* Room usage bar */}
          {saasStatus && saasStatus.roomLimit < 999999 && (
            <div className="mt-6 pt-5 border-t border-black/[0.06]">
              <div className="flex justify-between text-xs font-semibold mb-2">
                <span style={{ color: planMeta.inkColor }}>ห้องพักที่ใช้งาน</span>
                <span className="text-[var(--jh-ink-secondary)]">
                  {saasStatus.totalRooms} / {roomLimitLabel} ห้อง
                </span>
              </div>
              <div className="h-2.5 bg-black/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min((saasStatus.totalRooms / saasStatus.roomLimit) * 100, 100)}%`,
                    background: planMeta.color,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════ */}
      {/* Section 2: แพ็กเกจเสริม SMS               */}
      {/* ══════════════════════════════════════════ */}
      <section>
        <SectionHeader icon={Smartphone} color="#34c759" label="บริการเสริม: ส่ง SMS แจ้งบิลลูกบ้าน" />

        {/* Info banner */}
        <div
          className="rounded-[var(--jh-radius-xl)] border border-white/60 p-5 mb-6 shadow-[var(--jh-shadow-card)]"
          style={{ background: "linear-gradient(150deg, #f4f9ff 0%, #e3f0ff 100%)" }}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">💬</span>
            <div>
              <p className="text-sm font-semibold text-blue-800">
                เข้าถึงลูกบ้านทุกคน 100% แม้ไม่ได้เปิดเน็ต หรือไม่ได้เล่น LINE
              </p>
              <p className="text-xs text-blue-700/80 leading-relaxed mt-1.5">
                เนื่องจากการส่ง SMS มีต้นทุนจริงจากผู้ให้บริการโทรคมนาคม JadHor OS จึงแยกบริการนี้เป็น
                <strong> "บริการเสริมตามความสมัครใจ"</strong> เจ้าของหอพักที่ไม่ใช้ฟีเจอร์นี้ไม่ต้องรับต้นทุนร่วม
              </p>
              <p className="text-xs text-blue-700/70 mt-2 italic">
                ✨ เฉลี่ยเพียงห้องละ 3–5 บาท/เดือน แต่ลดอัตราจ่ายเงินเลทได้มากกว่าครึ่ง
              </p>
            </div>
          </div>
        </div>

        {/* SMS Quota card (if active) */}
        {smsAddon?.isActive && (
          <div
            className="rounded-[var(--jh-radius-xl)] border border-white/60 p-5 mb-6 shadow-[var(--jh-shadow-card)]"
            style={{ background: "linear-gradient(150deg, #f3fcf6 0%, #e0f7e9 100%)" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-[var(--jh-green-ink)]">โควตา SMS เดือนนี้</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-[var(--jh-green-ink)]">{smsAddon.used}</span>
                  <span className="text-lg text-[var(--jh-ink-tertiary)] font-bold">/ {smsAddon.quota}</span>
                  <span className="text-xs text-[var(--jh-ink-tertiary)]">ข้อความ</span>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white">
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
            <div className="mt-3 h-2.5 bg-black/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((smsAddon.used / smsAddon.quota) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* SMS Tier Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(Object.entries(SMS_PRICES) as [string, typeof SMS_PRICES[keyof typeof SMS_PRICES]][]).map(
            ([tierKey, tierData]) => {
              const meta = SMS_META[tierKey];
              const SmsIcon = meta.Icon;
              const isActive = smsAddon?.isActive && smsAddon.tier === tierKey;
              const isRecommended = tierKey === "SIZE_M" && !isActive;

              return (
                <div
                  key={tierKey}
                  className="group relative rounded-[var(--jh-radius-2xl)] border border-white/60 p-6 shadow-[var(--jh-shadow-card)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--jh-shadow-md)]"
                  style={{
                    background: `linear-gradient(150deg, ${meta.gradFrom} 0%, ${meta.gradTo} 100%)`,
                    ...(isActive ? { outline: `2px solid ${meta.color}`, outlineOffset: "2px" } : {}),
                  }}
                >
                  {(isActive || isRecommended) && (
                    <div
                      className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 text-white text-xs font-bold rounded-full"
                      style={{ background: isActive ? "#34c759" : meta.color }}
                    >
                      {isActive ? "✓ ใช้งานอยู่" : "แนะนำ"}
                    </div>
                  )}

                  {/* Icon chip */}
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-[var(--jh-radius-md)] mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
                    style={{ background: meta.color, color: "#fff", boxShadow: `0 10px 22px -8px ${meta.color}` }}
                  >
                    <SmsIcon className="h-6 w-6" strokeWidth={2} />
                  </div>

                  <h3 className="text-lg font-black text-[var(--jh-ink)]">{tierData.label}</h3>
                  <p className="text-xs text-[var(--jh-ink-secondary)] mt-1 mb-4">{tierData.recommended}</p>

                  {/* Price */}
                  <div className="mb-1">
                    <span className="text-3xl font-black" style={{ color: meta.inkColor }}>
                      ฿{tierData.monthly}
                    </span>
                    <span className="text-sm text-[var(--jh-ink-tertiary)]">/เดือน</span>
                  </div>

                  {/* Quota badge */}
                  <div
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white mb-5"
                    style={{ background: meta.color }}
                  >
                    <MessageSquare className="w-3 h-3" strokeWidth={2} />
                    {tierData.quota} ข้อความ/เดือน
                  </div>

                  <button
                    onClick={() => handleSmsSubscribe(tierKey)}
                    disabled={smsLoading || isActive}
                    className="w-full py-2.5 rounded-full text-sm font-bold transition-all duration-200 cursor-pointer hover:-translate-y-0.5"
                    style={
                      isActive
                        ? { background: "#e0f7e9", color: "#1f9d4d" }
                        : {
                            background: meta.color,
                            color: "#fff",
                            boxShadow: `0 8px 18px -6px ${meta.color}`,
                          }
                    }
                  >
                    {smsLoading
                      ? "กำลังดำเนินการ..."
                      : isActive
                      ? "✓ เปิดใช้งานแล้ว"
                      : smsAddon?.isActive
                      ? "เปลี่ยนแพ็กเกจ"
                      : "เปิดใช้งาน"}
                  </button>
                </div>
              );
            },
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════ */}
      {/* Section 2b: ตั้งค่า Thaibulksms API       */}
      {/* ══════════════════════════════════════════ */}
      <section>
        <SectionHeader
          icon={Key}
          color="#5856d6"
          label="ตั้งค่า Thaibulksms API"
          badge={
            smsHasKey ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                <Check className="w-3 h-3" strokeWidth={3} /> ตั้งค่าแล้ว
              </span>
            ) : undefined
          }
        />

        <div
          className="rounded-[var(--jh-radius-2xl)] border border-white/60 p-6 md:p-8 shadow-[var(--jh-shadow-card)] space-y-5"
          style={{ background: "linear-gradient(150deg, #f6f6ff 0%, #e8e7fb 100%)" }}
        >
          {/* How-to */}
          <div
            className="flex items-start gap-3 p-4 rounded-[var(--jh-radius-xl)] border border-white/60"
            style={{ background: "linear-gradient(150deg, #f4f9ff 0%, #e3f0ff 100%)" }}
          >
            <span className="text-xl shrink-0">ℹ️</span>
            <div className="text-sm text-blue-800">
              <p className="font-semibold">วิธีรับ API Key &amp; API Secret</p>
              <p className="mt-1 text-blue-700/80">
                สมัครที่{" "}
                <a
                  href="https://www.thaibulksms.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-bold hover:text-blue-900 transition-colors"
                >
                  thaibulksms.com
                </a>{" "}
                → Settings → API Key → สร้าง key → คัดลอก <strong>ทั้ง API Key และ API Secret</strong> มาวางด้านล่าง
                (ระบบส่ง SMS ใช้ Basic Auth ต้องมีครบทั้งคู่)
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* API Key */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-[var(--jh-ink)]">
                API Key{" "}
                {smsHasKey && smsApiKeyMasked && (
                  <span className="ml-1 text-xs font-mono font-normal text-[var(--jh-ink-secondary)] bg-white/60 px-2 py-0.5 rounded">
                    {smsApiKeyMasked}
                  </span>
                )}
                {smsHasKey && (
                  <span className="ml-1 text-xs text-[var(--jh-ink-tertiary)] font-normal">
                    (กรอกใหม่เพื่ออัปเดต)
                  </span>
                )}
              </label>
              <input
                type="text"
                value={smsApiKey}
                onChange={(e) => setSmsApiKey(e.target.value)}
                placeholder={smsHasKey ? "กรอก API Key ใหม่ หรือว่างไว้เพื่อคงของเดิม" : "xxxxxxxxxxxxxxxxxxxxxxxx"}
                className="flex h-11 w-full rounded-xl border border-white/60 bg-white/70 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
              />
            </div>
            {/* API Secret */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-[var(--jh-ink)]">
                API Secret{" "}
                {smsHasSecret && smsApiSecretMasked && (
                  <span className="ml-1 text-xs font-mono font-normal text-[var(--jh-ink-secondary)] bg-white/60 px-2 py-0.5 rounded">
                    {smsApiSecretMasked}
                  </span>
                )}
                {smsHasSecret && (
                  <span className="ml-1 text-xs text-[var(--jh-ink-tertiary)] font-normal">
                    (กรอกใหม่เพื่ออัปเดต)
                  </span>
                )}
              </label>
              <input
                type="password"
                value={smsApiSecret}
                onChange={(e) => setSmsApiSecret(e.target.value)}
                placeholder={smsHasSecret ? "กรอก API Secret ใหม่ หรือว่างไว้เพื่อคงของเดิม" : "xxxxxxxxxxxxxxxxxxxxxxxx"}
                className="flex h-11 w-full rounded-xl border border-white/60 bg-white/70 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
              />
            </div>
          </div>

          {/* Sender ID */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-[var(--jh-ink)]">
              Sender ID{" "}
              <span className="text-xs text-[var(--jh-ink-tertiary)] font-normal">
                (max 11 ตัวอักษร — แสดงเป็นชื่อผู้ส่ง ต้องลงทะเบียนกับ Thaibulksms ก่อน)
              </span>
            </label>
            <input
              type="text"
              value={smsSenderId}
              onChange={(e) => setSmsSenderId(e.target.value.slice(0, 11))}
              placeholder="JadHor"
              maxLength={11}
              className="flex h-11 w-full sm:w-1/2 rounded-xl border border-white/60 bg-white/70 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <button
              onClick={handleSmsCredSave}
              disabled={smsCredSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60 cursor-pointer"
              style={{ background: "#5856d6", boxShadow: "0 8px 18px -6px #5856d6" }}
            >
              {smsCredSaving ? "กำลังบันทึก..." : "💾 บันทึก Credentials"}
            </button>
            {smsCredMsg && (
              <span className={`text-sm font-semibold ${smsCredMsg.ok ? "text-emerald-600" : "text-red-500"}`}>
                {smsCredMsg.ok ? "✓" : "✗"} {smsCredMsg.text}
              </span>
            )}
          </div>

          {smsHasKey && smsHasSecret && (
            <div className="border-t border-white/40 pt-5 space-y-3">
              <p className="text-sm font-semibold text-[var(--jh-ink)]">ทดสอบส่ง SMS</p>
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <input
                  type="tel"
                  value={smsTestPhone}
                  onChange={(e) => setSmsTestPhone(e.target.value)}
                  placeholder="0812345678"
                  className="flex h-11 w-full sm:w-48 rounded-xl border border-white/60 bg-white/70 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
                />
                <button
                  onClick={handleSmsTest}
                  disabled={smsTesting || !smsTestPhone}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60 cursor-pointer shrink-0"
                  style={{ background: "#34c759", boxShadow: "0 8px 18px -6px #34c759" }}
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

      {/* ══════════════════════════════════════════ */}
      {/* Section 3: ช่องทางชำระค่าบริการ           */}
      {/* ══════════════════════════════════════════ */}
      <section>
        <SectionHeader icon={CreditCard} color="#af52de" label="ช่องทางชำระค่าบริการ" />

        <div
          className="rounded-[var(--jh-radius-2xl)] border border-white/60 p-6 md:p-8 shadow-[var(--jh-shadow-card)]"
          style={{ background: "linear-gradient(150deg, #fbf5fe 0%, #f3e3fb 100%)" }}
        >
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* QR Code */}
            <div className="flex flex-col items-center gap-3">
              <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-[0_4px_20px_rgba(175,82,222,0.12)]">
                <div className="bg-[#3b5fe2] text-white text-[10px] font-extrabold px-3 py-0.5 rounded-full mb-2 tracking-wider text-center">
                  PROMPTPAY
                </div>
                <QRCodeSVG value={generatePayload(JADHOR_PROMPTPAY.number, {})} size={130} />
              </div>
              <p className="text-xs text-[var(--jh-ink-tertiary)] font-medium">สแกนด้วยแอปธนาคาร</p>
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left space-y-3">
              <h3 className="text-lg font-bold text-[var(--jh-ink)]">โอนเงินผ่าน PromptPay</h3>

              <div className="space-y-2">
                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <span className="text-sm text-[var(--jh-ink-secondary)]">เบอร์พร้อมเพย์:</span>
                  <span className="text-sm font-bold text-[var(--jh-ink)]">{JADHOR_PROMPTPAY.number}</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(JADHOR_PROMPTPAY.number)}
                    className="text-xs text-purple-600 hover:text-purple-700 font-medium cursor-pointer"
                  >
                    📋 คัดลอก
                  </button>
                </div>
                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <span className="text-sm text-[var(--jh-ink-secondary)]">ชื่อบัญชี:</span>
                  <span className="text-sm font-bold text-[var(--jh-ink)]">{JADHOR_PROMPTPAY.name}</span>
                </div>
              </div>

              <div
                className="inline-flex items-start gap-2 px-4 py-3 rounded-[var(--jh-radius-xl)] text-xs text-purple-800 border border-purple-100"
                style={{ background: "rgba(255,255,255,0.6)" }}
              >
                <span className="shrink-0">💜</span>
                <span className="leading-relaxed">
                  หลังโอนเงินแล้ว กรุณาแนบสลิปในตารางใบแจ้งหนี้ด้านล่าง
                  ทีม Admin จะตรวจสอบและเปิดระบบให้ภายใน 24 ชั่วโมง
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════ */}
      {/* Section 4: ประวัติใบแจ้งหนี้              */}
      {/* ══════════════════════════════════════════ */}
      <section>
        <SectionHeader icon={FileText} color="#ff9500" label="ประวัติใบแจ้งหนี้" />

        {invoices.length === 0 ? (
          <div
            className="rounded-[var(--jh-radius-2xl)] border border-white/60 p-12 text-center shadow-[var(--jh-shadow-card)]"
            style={{ background: "linear-gradient(150deg, #fff9f2 0%, #ffeed9 100%)" }}
          >
            <div className="text-5xl mb-4">🧾</div>
            <p className="text-[var(--jh-ink-secondary)] font-medium">ยังไม่มีใบแจ้งหนี้</p>
            <p className="text-xs text-[var(--jh-ink-tertiary)] mt-1">
              ใบแจ้งหนี้จะแสดงที่นี่เมื่อมีรอบเรียกเก็บเงินถัดไป
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="bg-white rounded-[var(--jh-radius-xl)] border border-slate-100 shadow-[var(--jh-shadow-card)] overflow-hidden transition-all duration-300 hover:shadow-[var(--jh-shadow-md)]"
              >
                {/* Invoice Header Row */}
                <div
                  className="flex flex-col md:flex-row md:items-center justify-between p-5 cursor-pointer group"
                  onClick={() => setExpandedInvoice(expandedInvoice === inv.id ? null : inv.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-[var(--jh-radius-md)] bg-amber-50 text-amber-600 flex items-center justify-center text-sm font-bold border border-amber-100 group-hover:bg-orange-100 transition-colors">
                      🧾
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-[var(--jh-ink)]">{inv.invoiceNumber}</span>
                        <StatusBadge status={inv.status} />
                      </div>
                      <p className="text-xs text-[var(--jh-ink-tertiary)] mt-0.5">
                        {thaiMonths[inv.month - 1]} {inv.year} · {inv.items.length} รายการ
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3 md:mt-0">
                    <div className="text-right">
                      <div className="text-xl font-black text-[var(--jh-ink)]">
                        ฿{inv.totalAmount.toLocaleString()}
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-[var(--jh-ink-tertiary)] transition-transform duration-300 ${
                        expandedInvoice === inv.id ? "rotate-180" : ""
                      }`}
                      strokeWidth={2}
                    />
                  </div>
                </div>

                {/* Expandable content */}
                {expandedInvoice === inv.id && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-5 animate-in slide-in-from-top-2 duration-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-[var(--jh-ink-tertiary)] uppercase tracking-wider">
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
                                <span className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-[var(--jh-ink-tertiary)]">
                                  {idx + 1}
                                </span>
                                <span className="text-[var(--jh-ink-secondary)] font-medium">{item.description}</span>
                              </div>
                            </td>
                            <td className="py-3 text-center text-[var(--jh-ink-secondary)]">{item.quantity}</td>
                            <td className="py-3 text-right text-[var(--jh-ink-secondary)]">
                              ฿{item.unitPrice.toLocaleString()}
                            </td>
                            <td className="py-3 text-right font-bold text-[var(--jh-ink)]">
                              ฿{item.amount.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-slate-200">
                          <td colSpan={3} className="py-3 text-right font-bold text-[var(--jh-ink-secondary)]">
                            ยอดรวมสุทธิที่ชำระ
                          </td>
                          <td className="py-3 text-right text-xl font-black text-[var(--jh-blue)]">
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
                            <div className="bg-[#3b5fe2] text-white text-[8px] font-extrabold px-2 py-0.5 rounded-full mb-1 tracking-wider">
                              PROMPTPAY
                            </div>
                            <QRCodeSVG
                              value={generatePayload(JADHOR_PROMPTPAY.number, { amount: inv.totalAmount })}
                              size={110}
                            />
                          </div>
                          <div className="text-center sm:text-left space-y-1">
                            <p className="text-sm font-bold text-[var(--jh-ink)]">สแกนจ่ายตรงยอดด้วยแอปธนาคาร</p>
                            <p className="text-xs text-[var(--jh-ink-secondary)]">
                              ระบบสร้าง QR Code พร้อมระบุยอดโอนเงินอัตโนมัติเพื่อความสะดวก
                            </p>
                            <div className="text-xs text-[var(--jh-ink-secondary)] mt-2 font-medium">
                              เบอร์:{" "}
                              <span className="font-bold text-[var(--jh-ink)]">{JADHOR_PROMPTPAY.number}</span> |
                              ชื่อ:{" "}
                              <span className="font-bold text-[var(--jh-ink)]">{JADHOR_PROMPTPAY.name}</span>
                            </div>
                            <div className="text-lg font-black text-[var(--jh-blue)] mt-1">
                              ยอดโอน: ฿{inv.totalAmount.toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <label className="flex items-center gap-3 cursor-pointer group">
                          <div
                            className={`flex-shrink-0 px-5 py-2.5 text-white text-sm font-bold rounded-full transition-all group-hover:shadow-lg active:scale-[0.98] ${
                              slipUploading === inv.id
                                ? "bg-slate-400 cursor-wait"
                                : "bg-blue-600 hover:bg-blue-700"
                            }`}
                          >
                            {slipUploading === inv.id ? (
                              <span className="flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                กำลังตรวจสอบสลิป...
                              </span>
                            ) : (
                              "📎 แนบสลิปโอนเงิน"
                            )}
                          </div>
                          <span className="text-xs text-[var(--jh-ink-tertiary)]">
                            {slipUploading === inv.id
                              ? "กำลังประมวลผล SlipOK..."
                              : "เลือกไฟล์รูปสลิป (.jpg, .png)"}
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

                        {slipFeedback?.invoiceId === inv.id && (
                          <div
                            className={`mt-3 flex items-start gap-2 px-4 py-3 rounded-xl text-sm font-semibold ${
                              slipFeedback.ok
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-red-50 text-red-600 border border-red-200"
                            }`}
                          >
                            <span className="shrink-0">{slipFeedback.ok ? "✅" : "⚠️"}</span>
                            <span>{slipFeedback.text}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {inv.status === "PENDING" && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <div className="flex items-center gap-2 text-sm text-amber-600 font-medium">
                          <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                          รอทีม Admin ตรวจสอบสลิป...
                        </div>
                      </div>
                    )}

                    {inv.status === "PAID" && inv.paidAt && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                          ✅ ชำระเรียบร้อย —{" "}
                          {new Date(inv.paidAt).toLocaleDateString("th-TH", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </div>
                      </div>
                    )}

                    {inv.note && (
                      <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                        <p className="text-xs text-amber-700">
                          <strong>หมายเหตุจาก Admin:</strong> {inv.note}
                        </p>
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
