"use client";

import { useState, useTransition } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/PageHeader";
import {
  Wallet,
  Users,
  Search,
  Building,
  RefreshCcw,
  Scissors,
  Loader2,
  X,
  ShieldCheck,
} from "lucide-react";
import { getActiveDeposits, processDepositRefund, processDepositDeduction } from "@/app/actions/deposits";
import { jsonFetcher } from "@/lib/fetcher";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RefundModalState {
  open: boolean;
  tenantId: string;
  tenantName: string;
  roomNumber: string;
  maxAmount: number;
}

interface DeductModalState {
  open: boolean;
  tenantId: string;
  tenantName: string;
  roomNumber: string;
  maxAmount: number;
}

export default function DepositsPage() {
  const { data: session } = useSession();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  // Modals state
  const [refundModal, setRefundModal] = useState<RefundModalState>({
    open: false, tenantId: "", tenantName: "", roomNumber: "", maxAmount: 0
  });
  const [deductModal, setDeductModal] = useState<DeductModalState>({
    open: false, tenantId: "", tenantName: "", roomNumber: "", maxAmount: 0
  });

  // Action input states
  const [actionAmount, setActionAmount] = useState<string>("");
  const [actionReason, setActionReason] = useState<string>("");
  const [actionNote, setActionNote] = useState<string>("");

  // fetch properties for switcher
  const { data: properties = [] } = useSWR<any[]>("/api/properties", jsonFetcher);

  // fetch active deposits list using SWR with action function as key/fetcher
  const {
    data: depositData,
    isLoading,
    mutate
  } = useSWR(
    ["active-deposits", selectedPropertyId],
    () => getActiveDeposits(selectedPropertyId || undefined)
  );

  const role = session?.user?.role;
  if (role !== "OWNER") {
    return (
      <div className="p-8 text-center text-slate-500">
        คุณไม่มีสิทธิ์เข้าถึงหน้านี้ เฉพาะเจ้าของหอพักเท่านั้น
      </div>
    );
  }

  const tenants = (depositData?.success && depositData.tenants) ? depositData.tenants : [];

  // Statistics calculation
  const totalActiveDeposits = tenants.reduce((acc, t) => acc + (t.depositAmount ?? 0), 0);
  const activeTenantsCount = tenants.filter(t => (t.depositAmount ?? 0) > 0).length;

  const filteredTenants = tenants.filter(t => {
    const roomNum = t.room?.number || "";
    const name = [t.firstName, t.lastName].filter(Boolean).join(" ") || t.user?.name || "";
    return (
      roomNum.toLowerCase().includes(searchQuery.toLowerCase()) ||
      name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Handlers
  const handleOpenRefund = (t: any) => {
    setRefundModal({
      open: true,
      tenantId: t.id,
      tenantName: [t.firstName, t.lastName].filter(Boolean).join(" ") || t.user?.name || "ผู้เช่า",
      roomNumber: t.room?.number || "",
      maxAmount: t.depositAmount ?? 0
    });
    setActionAmount((t.depositAmount ?? 0).toString());
    setActionNote("");
  };

  const handleOpenDeduct = (t: any) => {
    setDeductModal({
      open: true,
      tenantId: t.id,
      tenantName: [t.firstName, t.lastName].filter(Boolean).join(" ") || t.user?.name || "ผู้เช่า",
      roomNumber: t.room?.number || "",
      maxAmount: t.depositAmount ?? 0
    });
    setActionAmount("");
    setActionReason("");
  };

  const submitRefund = () => {
    const amountNum = parseFloat(actionAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("กรุณาระบุจำนวนเงินที่ถูกต้อง");
      return;
    }
    if (amountNum > refundModal.maxAmount) {
      toast.error("จำนวนเงินคืนเกินยอดประกันคงเหลือ");
      return;
    }

    startTransition(async () => {
      const res = await processDepositRefund(refundModal.tenantId, amountNum, actionNote || undefined);
      if (res.success) {
        toast.success(`คืนเงินประกันห้อง ${refundModal.roomNumber} เรียบร้อยแล้ว`);
        setRefundModal({ open: false, tenantId: "", tenantName: "", roomNumber: "", maxAmount: 0 });
        mutate();
      } else {
        toast.error(res.error || "เกิดข้อผิดพลาด");
      }
    });
  };

  const submitDeduct = () => {
    const amountNum = parseFloat(actionAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("กรุณาระบุจำนวนเงินที่ถูกต้อง");
      return;
    }
    if (amountNum > deductModal.maxAmount) {
      toast.error("จำนวนเงินที่หักเกินยอดประกันคงเหลือ");
      return;
    }
    if (!actionReason.trim()) {
      toast.error("กรุณาระบุเหตุผลในการหักเงิน");
      return;
    }

    startTransition(async () => {
      const res = await processDepositDeduction(deductModal.tenantId, amountNum, actionReason);
      if (res.success) {
        toast.success(`หักค่าเสียหายห้อง ${deductModal.roomNumber} เรียบร้อยแล้ว`);
        setDeductModal({ open: false, tenantId: "", tenantName: "", roomNumber: "", maxAmount: 0 });
        mutate();
      } else {
        toast.error(res.error || "เกิดข้อผิดพลาด");
      }
    });
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <PageHeader
        icon={Wallet}
        tone="orange"
        title="เงินประกัน / มัดจำ"
        subtitle="ตรวจสอบ คืนเงินประกัน หรือหักค่าเสียหายของผู้เช่าเมื่อย้ายออก"
      />

      {/* ── Stats Summary Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Card 1: Total Active Deposits */}
        <div
          className="group rounded-[var(--jh-radius-2xl)] border border-white/60 shadow-[var(--jh-shadow-card)] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--jh-shadow-md)]"
          style={{ background: "linear-gradient(150deg, #fdf8ee 0%, #f6ecd6 100%)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">เงินประกันครอบครองรวม</span>
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--jh-radius-md)] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
              style={{ background: "#d4a548", color: "#fff", boxShadow: "0 10px 22px -8px #d4a548" }}
            >
              <Wallet className="h-5 w-5" strokeWidth={2} />
            </div>
          </div>
          <h3 className="text-2xl font-black text-[var(--jh-orange-ink)]">
            ฿{totalActiveDeposits.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <p className="text-xs text-slate-400 mt-1">ยอดเงินประกันของผู้เช่าทั้งหมดในระบบ</p>
        </div>

        {/* Card 2: Active Tenants */}
        <div
          className="group rounded-[var(--jh-radius-2xl)] border border-white/60 shadow-[var(--jh-shadow-card)] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--jh-shadow-md)]"
          style={{ background: "linear-gradient(150deg, #f3f5fa 0%, #e4eaf5 100%)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">ผู้เช่าที่มีเงินประกัน</span>
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--jh-radius-md)] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
              style={{ background: "#34508c", color: "#fff", boxShadow: "0 10px 22px -8px #34508c" }}
            >
              <Users className="h-5 w-5" strokeWidth={2} />
            </div>
          </div>
          <h3 className="text-2xl font-black text-[var(--jh-blue)]">
            {activeTenantsCount} <span className="text-xs font-bold text-slate-500">ราย</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">จากผู้เช่าที่เข้าพักอยู่ทั้งหมด</p>
        </div>

        {/* Card 3: Safety Badge */}
        <div
          className="group rounded-[var(--jh-radius-2xl)] border border-white/60 shadow-[var(--jh-shadow-card)] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--jh-shadow-md)]"
          style={{ background: "linear-gradient(150deg, #f3fcf6 0%, #e0f7e9 100%)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">ความปลอดภัยของระบบ</span>
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--jh-radius-md)] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
              style={{ background: "#34c759", color: "#fff", boxShadow: "0 10px 22px -8px #34c759" }}
            >
              <ShieldCheck className="h-5 w-5" strokeWidth={2} />
            </div>
          </div>
          <h3 className="text-2xl font-black text-[var(--jh-green-ink)]">
            สิทธิ์แยกตึก RLS
          </h3>
          <p className="text-xs text-slate-400 mt-1">จำกัดการทำรายการเฉพาะตึกของตนเองเท่านั้น</p>
        </div>
      </div>

      {/* ── Filters Switcher & Search ── */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
        {/* Property Switcher */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
            style={{ background: "#d4a548", boxShadow: "0 6px 14px -6px #d4a548" }}
          >
            <Building className="h-4 w-4" strokeWidth={2} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedPropertyId("")}
              className="px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer"
              style={
                selectedPropertyId === ""
                  ? { background: "#d4a548", color: "#fff", boxShadow: "0 4px 12px -4px #d4a548" }
                  : { background: "#fff", color: "#64748b", border: "1px solid #e2e8f0" }
              }
            >
              ทุกตึก
            </button>
            {properties.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPropertyId(p.id)}
                className="px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer"
                style={
                  selectedPropertyId === p.id
                    ? { background: "#d4a548", color: "#fff", boxShadow: "0 4px 12px -4px #d4a548" }
                    : { background: "#fff", color: "#64748b", border: "1px solid #e2e8f0" }
                }
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาเลขห้อง หรือชื่อผู้เช่า..."
            className="pl-10 pr-4 bg-white border-slate-200 rounded-xl w-full text-xs"
          />
        </div>
      </div>

      {/* ── Deposits List Table ── */}
      <div className="bg-white rounded-[var(--jh-radius-xl)] border border-slate-100 shadow-[var(--jh-shadow-card)] overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
            <span className="text-xs font-bold">กำลังโหลดข้อมูล...</span>
          </div>
        ) : filteredTenants.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs">
            ไม่พบรายการข้อมูลเงินประกันมัดจำ
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-500 font-extrabold">
                  <th className="p-4 pl-6">ห้องพัก</th>
                  <th className="p-4">ผู้เช่า</th>
                  <th className="p-4">หอพัก / อาคาร</th>
                  <th className="p-4">ระยะเวลาสัญญา</th>
                  <th className="p-4 text-right">เงินประกันสะสม</th>
                  <th className="p-4 text-center pr-6">จัดการเงินประกัน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTenants.map((t) => {
                  const name = [t.firstName, t.lastName].filter(Boolean).join(" ") || t.user?.name || "ไม่ระบุชื่อ";
                  const startStr = t.leaseStart ? new Date(t.leaseStart).toLocaleDateString("th-TH") : "-";
                  const endStr = t.leaseEnd ? new Date(t.leaseEnd).toLocaleDateString("th-TH") : "-";
                  const currentDep = t.depositAmount ?? 0;

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="p-4 pl-6 font-bold text-slate-800">ห้อง {t.room?.number || "-"}</td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-700">{name}</div>
                        <div className="text-[10px] text-slate-400">{t.user?.email}</div>
                      </td>
                      <td className="p-4 text-slate-500">{t.room?.property?.name || "-"}</td>
                      <td className="p-4 text-slate-500">
                        {startStr} ถึง {endStr}
                      </td>
                      <td className="p-4 text-right font-bold text-[var(--jh-orange-ink)]">
                        ฿{currentDep.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-center pr-6">
                        <div className="flex justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenRefund(t)}
                            disabled={currentDep <= 0}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-green-50 text-green-700 font-bold hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <RefreshCcw className="w-3.5 h-3.5" />
                            คืนประกัน
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDeduct(t)}
                            disabled={currentDep <= 0}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-50 text-red-700 font-bold hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <Scissors className="w-3.5 h-3.5" />
                            หักค่าเสียหาย
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Refund Modal ── */}
      {refundModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-sm rounded-[var(--jh-radius-2xl)] border border-white/60 shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200"
            style={{ background: "linear-gradient(150deg, #f3fcf6 0%, #e0f7e9 100%)" }}
          >
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                  style={{ background: "#34c759", boxShadow: "0 6px 14px -6px #34c759" }}
                >
                  <RefreshCcw className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-[var(--jh-ink)] text-sm">คืนเงินประกัน</h3>
              </div>
              <button
                onClick={() => setRefundModal({ open: false, tenantId: "", tenantName: "", roomNumber: "", maxAmount: 0 })}
                className="w-6 h-6 rounded-full flex items-center justify-center bg-white/60 hover:bg-white text-slate-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <span className="text-slate-500 font-semibold">ห้อง: </span>
                <span className="font-bold text-slate-800">ห้อง {refundModal.roomNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold">ผู้เช่า: </span>
                <span className="font-bold text-slate-800">{refundModal.tenantName}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold">เงินประกันสูงสุดที่คืนได้: </span>
                <span className="font-bold text-[var(--jh-orange-ink)]">฿{refundModal.maxAmount.toLocaleString()}</span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-700 font-bold text-xs">จำนวนเงินที่จะคืน (บาท)</Label>
                <Input
                  type="number"
                  value={actionAmount}
                  onChange={(e) => setActionAmount(e.target.value)}
                  placeholder="ระบุจำนวนเงินที่จะคืน..."
                  className="bg-white/80 border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-700 font-bold text-xs">หมายเหตุ (ถ้ามี)</Label>
                <Input
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder="เช่น ย้ายออกคืนเงินประกันเต็มจำนวน..."
                  className="bg-white/80 border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRefundModal({ open: false, tenantId: "", tenantName: "", roomNumber: "", maxAmount: 0 })}
                  className="flex-1 py-2.5 rounded-full font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={submitRefund}
                  disabled={isPending || !actionAmount}
                  className="flex-1 py-2.5 rounded-full font-bold text-white transition-all hover:-translate-y-0.5 disabled:opacity-60 cursor-pointer"
                  style={{ background: "#34c759", boxShadow: "0 8px 18px -6px #34c759" }}
                >
                  {isPending ? "กำลังบันทึก..." : "ยืนยันคืนเงิน"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Deduct Modal ── */}
      {deductModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-sm rounded-[var(--jh-radius-2xl)] border border-white/60 shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200"
            style={{ background: "linear-gradient(150deg, #fff5f4 0%, #ffe5e3 100%)" }}
          >
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                  style={{ background: "#ff3b30", boxShadow: "0 6px 14px -6px #ff3b30" }}
                >
                  <Scissors className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-[var(--jh-ink)] text-sm">หักเงินประกัน (ค่าเสียหาย)</h3>
              </div>
              <button
                onClick={() => setDeductModal({ open: false, tenantId: "", tenantName: "", roomNumber: "", maxAmount: 0 })}
                className="w-6 h-6 rounded-full flex items-center justify-center bg-white/60 hover:bg-white text-slate-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <span className="text-slate-500 font-semibold">ห้อง: </span>
                <span className="font-bold text-slate-800">ห้อง {deductModal.roomNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold">ผู้เช่า: </span>
                <span className="font-bold text-slate-800">{deductModal.tenantName}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold">เงินประกันสูงสุดที่หักได้: </span>
                <span className="font-bold text-red-600">฿{deductModal.maxAmount.toLocaleString()}</span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-700 font-bold text-xs">จำนวนเงินที่จะหัก (บาท)</Label>
                <Input
                  type="number"
                  value={actionAmount}
                  onChange={(e) => setActionAmount(e.target.value)}
                  placeholder="ระบุจำนวนเงินที่จะหัก..."
                  className="bg-white/80 border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-700 font-bold text-xs">เหตุผลในการหักเงิน</Label>
                <Input
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="เช่น ค่าทำความสะอาด หรือซ่อมลูกบิดประตู..."
                  className="bg-white/80 border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeductModal({ open: false, tenantId: "", tenantName: "", roomNumber: "", maxAmount: 0 })}
                  className="flex-1 py-2.5 rounded-full font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={submitDeduct}
                  disabled={isPending || !actionAmount || !actionReason}
                  className="flex-1 py-2.5 rounded-full font-bold text-white transition-all hover:-translate-y-0.5 disabled:opacity-60 cursor-pointer"
                  style={{ background: "#ff3b30", boxShadow: "0 8px 18px -6px #ff3b30" }}
                >
                  {isPending ? "กำลังบันทึก..." : "ยืนยันหักเงิน"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
