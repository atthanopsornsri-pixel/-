"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface Suggested {
  prevWaterReading: number;
  prevElectricReading: number;
  waterRate: number;
  electricRate: number;
  finalRentAmount: number;
  outstandingAmount: number;
  depositAmount: number;
}

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [sug, setSug] = useState<Suggested | null>(null);
  const [info, setInfo] = useState<{ name: string; roomNumber: string } | null>(null);
  const [completed, setCompleted] = useState(false);
  const [needRefundSlip, setNeedRefundSlip] = useState(false);

  const [form, setForm] = useState({
    waterReadingFinal: "" as string,
    electricReadingFinal: "" as string,
    finalRentAmount: 0,
    outstandingAmount: 0,
    deductionAmount: 0,
    deductionNote: "",
    deductionPhotoUrl: "" as string,
    depositAmount: 0,
    refundSlipUrl: "" as string,
  });

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/tenants/${params.id}/checkout`);
        if (!res.ok) {
          toast.error("โหลดข้อมูลไม่สำเร็จ");
          return;
        }
        const json = await res.json();
        setSug(json.suggested);
        setInfo({ name: json.tenant?.name || "ผู้เช่า", roomNumber: json.tenant?.roomNumber || "-" });
        const c = json.checkout;
        setForm((prev) => ({
          ...prev,
          waterReadingFinal: c?.waterReadingFinal != null ? String(c.waterReadingFinal) : "",
          electricReadingFinal: c?.electricReadingFinal != null ? String(c.electricReadingFinal) : "",
          finalRentAmount: c?.finalRentAmount ?? json.suggested.finalRentAmount,
          outstandingAmount: c?.outstandingAmount ?? json.suggested.outstandingAmount,
          deductionAmount: c?.deductionAmount ?? 0,
          deductionNote: c?.deductionNote ?? "",
          deductionPhotoUrl: c?.deductionPhotoUrl ?? "",
          depositAmount: c?.depositAmount ?? json.suggested.depositAmount,
          refundSlipUrl: c?.refundSlipUrl ?? "",
        }));
        if (c?.status === "COMPLETED") setCompleted(true);
        if (c?.status === "PENDING_REFUND") setNeedRefundSlip(true);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [params.id]);

  // คำนวณ live (mirror สูตรฝั่ง server — server เป็นตัวคำนวณจริงตอนบันทึก)
  const wFinal = form.waterReadingFinal === "" ? null : Number(form.waterReadingFinal);
  const eFinal = form.electricReadingFinal === "" ? null : Number(form.electricReadingFinal);
  const waterUnits = sug && wFinal != null ? Math.max(0, wFinal - sug.prevWaterReading) : 0;
  const electricUnits = sug && eFinal != null ? Math.max(0, eFinal - sug.prevElectricReading) : 0;
  const finalUtilityAmount = sug ? waterUnits * sug.waterRate + electricUnits * sug.electricRate : 0;
  const netAmount =
    finalUtilityAmount +
    Number(form.finalRentAmount) +
    Number(form.outstandingAmount) +
    Number(form.deductionAmount) -
    Number(form.depositAmount);
  const ownerMustRefund = netAmount < 0;

  const set = (k: keyof typeof form, v: string | number) => setForm((p) => ({ ...p, [k]: v }));

  const handlePhoto = (k: "deductionPhotoUrl" | "refundSlipUrl") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("ไฟล์ใหญ่เกิน 5 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set(k, reader.result as string);
    reader.readAsDataURL(file);
  };

  const buildPayload = () => ({
    waterReadingFinal: wFinal,
    electricReadingFinal: eFinal,
    finalRentAmount: Number(form.finalRentAmount),
    outstandingAmount: Number(form.outstandingAmount),
    deductionAmount: Number(form.deductionAmount),
    deductionNote: form.deductionNote,
    deductionPhotoUrl: form.deductionPhotoUrl || null,
    depositAmount: Number(form.depositAmount),
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/tenants/${params.id}/checkout`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      if (res.ok) toast.success("บันทึกร่างบิลปิดเคสแล้ว");
      else toast.error("บันทึกไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  };

  const handleComplete = async () => {
    if (ownerMustRefund && !form.refundSlipUrl) {
      setNeedRefundSlip(true);
      toast.error("ยอดสุทธิติดลบ — ต้องแนบสลิปโอนคืนเงินก่อนปิดเคส");
      return;
    }
    setIsCompleting(true);
    try {
      // บันทึกร่างล่าสุดก่อน แล้วค่อยปิดเคส
      await fetch(`/api/tenants/${params.id}/checkout`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const res = await fetch(`/api/tenants/${params.id}/checkout/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refundSlipUrl: form.refundSlipUrl || undefined }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("ปิดเคสสำเร็จ! ห้องกลับเป็นสถานะว่างแล้ว");
        setCompleted(true);
      } else if (json.code === "REFUND_SLIP_REQUIRED") {
        setNeedRefundSlip(true);
        toast.error(json.message);
      } else {
        toast.error(json.message || "ปิดเคสไม่สำเร็จ");
      }
    } finally {
      setIsCompleting(false);
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">กำลังโหลด...</div>;

  if (completed) {
    return (
      <div className="max-w-lg mx-auto p-6 mt-10">
        <div className="bg-white border border-[#efeae0] rounded-[var(--jh-radius-2xl)] p-8 text-center shadow-[var(--jh-shadow-card)]">
          <div className="text-5xl mb-3">✅</div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">ปิดเคสย้ายออกเรียบร้อย</h1>
          <p className="text-slate-500 mb-6">ห้อง {info?.roomNumber} กลับเป็นสถานะว่าง พร้อมรับผู้เช่าคนถัดไป</p>
          <Button onClick={() => router.push("/dashboard/tenants")} style={{ background: "#34508c" }} className="text-white">
            กลับหน้ารายชื่อผู้เช่า
          </Button>
        </div>
      </div>
    );
  }

  const money = (n: number) => `฿${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 border-b border-[#efeae0] pb-4">
        <button onClick={() => router.back()} className="text-slate-500 hover:text-slate-800">← กลับ</button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ปิดบิลย้ายออก</h1>
          <p className="text-sm text-slate-500">{info?.name} · ห้อง {info?.roomNumber}</p>
        </div>
      </div>

      {/* เลขมิเตอร์งวดสุดท้าย */}
      <section className="bg-white border border-[#efeae0] rounded-2xl p-5 space-y-4">
        <h2 className="font-bold text-[var(--jh-blue)]">เลขมิเตอร์งวดสุดท้าย</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>เลขน้ำล่าสุด (ก่อนหน้า {sug?.prevWaterReading})</Label>
            <Input type="number" value={form.waterReadingFinal} onChange={(e) => set("waterReadingFinal", e.target.value)} />
            <p className="text-xs text-slate-500">ใช้ไป {waterUnits} หน่วย = {money(waterUnits * (sug?.waterRate ?? 0))}</p>
          </div>
          <div className="space-y-1">
            <Label>เลขไฟล่าสุด (ก่อนหน้า {sug?.prevElectricReading})</Label>
            <Input type="number" value={form.electricReadingFinal} onChange={(e) => set("electricReadingFinal", e.target.value)} />
            <p className="text-xs text-slate-500">ใช้ไป {electricUnits} หน่วย = {money(electricUnits * (sug?.electricRate ?? 0))}</p>
          </div>
        </div>
      </section>

      {/* ยอดต่างๆ */}
      <section className="bg-white border border-[#efeae0] rounded-2xl p-5 space-y-4">
        <h2 className="font-bold text-[var(--jh-blue)]">ยอดคิดเงิน</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>ค่าเช่างวดสุดท้าย</Label>
            <Input type="number" value={form.finalRentAmount} onChange={(e) => set("finalRentAmount", Number(e.target.value))} />
          </div>
          <div className="space-y-1">
            <Label>ยอดค้างยกมา</Label>
            <Input type="number" value={form.outstandingAmount} onChange={(e) => set("outstandingAmount", Number(e.target.value))} />
          </div>
          <div className="space-y-1">
            <Label>หักค่าเสียหาย/ทำความสะอาด</Label>
            <Input type="number" value={form.deductionAmount} onChange={(e) => set("deductionAmount", Number(e.target.value))} />
          </div>
          <div className="space-y-1">
            <Label>เงินประกัน (ตั้งต้น)</Label>
            <Input type="number" value={form.depositAmount} onChange={(e) => set("depositAmount", Number(e.target.value))} />
          </div>
        </div>
        <div className="space-y-1">
          <Label>หมายเหตุการหัก</Label>
          <Input value={form.deductionNote} onChange={(e) => set("deductionNote", e.target.value)} placeholder="เช่น ค่าทำความสะอาด 500, กระจกแตก 800" />
        </div>
        <div className="space-y-1">
          <Label>รูปหลักฐานความเสียหาย (ถ้ามี)</Label>
          <input type="file" accept="image/*" onChange={handlePhoto("deductionPhotoUrl")} className="text-sm" />
          {form.deductionPhotoUrl && <img src={form.deductionPhotoUrl} alt="หลักฐาน" className="mt-2 h-24 rounded-lg object-cover" />}
        </div>
      </section>

      {/* สรุปยอดสุทธิ */}
      <section
        className="rounded-2xl p-5 border"
        style={{
          background: ownerMustRefund ? "linear-gradient(150deg,#fff5f4 0%,#ffe5e3 100%)" : "linear-gradient(150deg,#f3fcf6 0%,#e0f7e9 100%)",
          borderColor: "rgba(255,255,255,0.6)",
        }}
      >
        <div className="flex justify-between items-center">
          <span className="font-bold text-slate-700">ยอดสุทธิ</span>
          <span className="text-2xl font-bold" style={{ color: ownerMustRefund ? "var(--jh-red)" : "var(--jh-green-ink)" }}>
            {netAmount >= 0 ? money(netAmount) : `-${money(Math.abs(netAmount))}`}
          </span>
        </div>
        <p className="text-sm mt-1 text-slate-600">
          {netAmount > 0 ? "ผู้เช่าต้องจ่ายเพิ่ม" : netAmount < 0 ? "เจ้าของหอต้องคืนเงินประกัน" : "ไม่มียอดค้าง/คืน"}
        </p>

        {ownerMustRefund && (
          <div className="mt-4 bg-white/70 rounded-xl p-3 space-y-2">
            <Label className="text-[var(--jh-red)] font-semibold">⚠️ ต้องแนบสลิปโอนคืนเงินก่อนปิดเคส</Label>
            <input type="file" accept="image/*" onChange={handlePhoto("refundSlipUrl")} className="text-sm block" />
            {form.refundSlipUrl && <img src={form.refundSlipUrl} alt="สลิปคืนเงิน" className="mt-1 h-24 rounded-lg object-cover" />}
          </div>
        )}
      </section>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "กำลังบันทึก..." : "บันทึกร่าง"}
        </Button>
        <Button
          className="flex-1 text-white"
          style={{ background: "#34508c", boxShadow: "0 8px 18px -6px #34508c" }}
          onClick={handleComplete}
          disabled={isCompleting || (ownerMustRefund && !form.refundSlipUrl)}
        >
          {isCompleting ? "กำลังปิดเคส..." : "ปิดเคส + ปล่อยห้องว่าง"}
        </Button>
      </div>
      {needRefundSlip && !form.refundSlipUrl && (
        <p className="text-center text-sm text-[var(--jh-red)]">ต้องแนบสลิปโอนคืนเงินก่อนจึงจะปิดเคสได้</p>
      )}
    </div>
  );
}
