"use client";

import { useState } from "react";
import useSWR from "swr";
import { jsonFetcher } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Car, Bike, Plus, Trash2, X } from "lucide-react";

export default function MyAccountPage() {
  const [saving, setSaving] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");        // กรณียังไม่มีเบอร์ ต้องกรอกเอง
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // ── SWR: account info ────────────────────────────────────────────────────
  const { data: accountData, isLoading: loading, mutate: mutateAccount } = useSWR(
    "/api/tenant/password",
    jsonFetcher
  );
  const hasPassword: boolean = accountData?.hasPassword ?? false;
  const phoneNumber: string = accountData?.phoneNumber ?? "";

  const effectivePhone = phoneNumber || phoneInput;

  const handleSave = async () => {
    if (hasPassword && !currentPassword) {
      toast.error("กรุณากรอกรหัสผ่านเดิม");
      return;
    }
    if (!effectivePhone.trim()) {
      toast.error("กรุณากรอกเบอร์โทร เพราะจะใช้เป็นชื่อผู้ใช้ตอนล็อกอิน");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/tenant/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: currentPassword || undefined,
          newPassword,
          phoneNumber: phoneNumber ? undefined : phoneInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "บันทึกไม่สำเร็จ");

      toast.success("ตั้งรหัสผ่านสำเร็จ! ล็อกอินด้วยเบอร์โทร + รหัสผ่านได้เลย");
      mutateAccount(); // revalidate SWR cache
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPhoneInput("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto py-8 px-4 space-y-6 animate-pulse">
        <div className="h-7 bg-slate-100 rounded-xl w-1/2" />
        <div className="h-4 bg-slate-100 rounded-lg w-3/4" />
        <div className="h-12 bg-slate-100 rounded-2xl" />
        <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-4">
          {[1,2,3,4].map(i => <div key={i} className="h-11 bg-slate-100 rounded-xl" />)}
          <div className="h-12 bg-slate-100 rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto py-8 px-4 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-slate-900">ตั้งค่าบัญชี</h1>
        <p className="text-slate-500 text-sm">จัดการรหัสผ่านสำหรับล็อกอินจากคอมพิวเตอร์หรือเครื่องที่ไม่มีแอป LINE</p>
      </div>

      {/* Status badge */}
      <div
        className={`rounded-2xl px-4 py-3 text-sm font-medium border ${
          hasPassword
            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
            : "bg-amber-50 border-amber-200 text-amber-700"
        }`}
      >
        {hasPassword ? (
          <>✅ คุณตั้งรหัสผ่านไว้แล้ว — ล็อกอินด้วยเบอร์ <strong className="font-mono">{phoneNumber}</strong> ได้</>
        ) : (
          <>⚠️ ยังไม่ได้ตั้งรหัสผ่าน — ตอนนี้ล็อกอินได้เฉพาะผ่าน LINE เท่านั้น</>
        )}
      </div>

      <Card className="rounded-3xl border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-bold text-slate-800">
            {hasPassword ? "เปลี่ยนรหัสผ่าน" : "ตั้งรหัสผ่าน"}
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            ชื่อผู้ใช้ของคุณจะเป็น <strong>เบอร์โทร</strong> เสมอ
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* เบอร์โทร: แสดงแบบ readonly ถ้ามีแล้ว, ให้กรอกถ้ายังไม่มี */}
          {phoneNumber ? (
            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700 text-sm">ชื่อผู้ใช้ (เบอร์โทร)</Label>
              <Input value={phoneNumber} disabled className="h-11 rounded-xl font-mono bg-slate-50" />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700 text-sm">เบอร์โทร (ใช้เป็นชื่อผู้ใช้) *</Label>
              <Input
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="0812345678"
                className="h-11 rounded-xl"
                inputMode="tel"
              />
            </div>
          )}

          {hasPassword && (
            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700 text-sm">รหัสผ่านเดิม *</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="รหัสผ่านปัจจุบัน"
                className="h-11 rounded-xl"
                autoComplete="current-password"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="font-semibold text-slate-700 text-sm">รหัสผ่านใหม่ *</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="อย่างน้อย 6 ตัวอักษร"
              className="h-11 rounded-xl"
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-semibold text-slate-700 text-sm">ยืนยันรหัสผ่านใหม่ *</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
              className="h-11 rounded-xl"
              autoComplete="new-password"
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-lg shadow-blue-600/20"
          >
            {saving ? "กำลังบันทึก..." : hasPassword ? "เปลี่ยนรหัสผ่าน" : "ตั้งรหัสผ่าน"}
          </Button>
        </CardContent>
      </Card>

      {/* ── Vehicle Management ── */}
      <VehicleSection />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Vehicle Management Section
// ────────────────────────────────────────────────────────────────────────────
function VehicleSection() {
  const { data: vehicles = [], isLoading, mutate } = useSWR<any[]>(
    "/api/tenant/vehicles",
    jsonFetcher
  );

  const [showForm, setShowForm] = useState(false);
  const [licensePlate, setLicensePlate] = useState("");
  const [brand, setBrand] = useState("");
  const [color, setColor] = useState("");
  const [type, setType] = useState<"MOTORCYCLE" | "CAR">("MOTORCYCLE");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleAdd() {
    if (!licensePlate.trim()) { toast.error("กรุณากรอกทะเบียนรถ"); return; }
    setIsSaving(true);
    try {
      const res = await fetch("/api/tenant/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licensePlate, brand, color, type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "บันทึกไม่สำเร็จ");
      toast.success("เพิ่มยานพาหนะเรียบร้อย");
      mutate();
      setShowForm(false);
      setLicensePlate(""); setBrand(""); setColor(""); setType("MOTORCYCLE");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/tenant/vehicles/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("ลบไม่สำเร็จ");
      toast.success("ลบยานพาหนะเรียบร้อย");
      mutate();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeletingId(null);
    }
  }

  const VehicleIcon = ({ t }: { t: string }) =>
    t === "CAR" ? <Car className="w-4 h-4" strokeWidth={2} /> : <Bike className="w-4 h-4" strokeWidth={2} />;

  return (
    <div
      className="rounded-[var(--jh-radius-2xl)] border border-white/60 shadow-[var(--jh-shadow-card)] p-6 space-y-4"
      style={{ background: "linear-gradient(150deg, #fdf8ee 0%, #f6ecd6 100%)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--jh-radius-md)]"
            style={{ background: "#d4a548", color: "#fff", boxShadow: "0 10px 22px -8px #d4a548" }}
          >
            <Car className="h-5 w-5" strokeWidth={2} />
          </div>
          <div>
            <h2 className="font-bold text-[var(--jh-ink)]">ยานพาหนะ</h2>
            <p className="text-xs text-[var(--jh-ink-tertiary)]">รถที่จอดในหอพัก</p>
          </div>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white transition-all hover:-translate-y-0.5"
            style={{ background: "#d4a548", boxShadow: "0 8px 18px -6px #d4a548" }}
          >
            <Plus className="w-3.5 h-3.5" /> เพิ่มรถ
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="rounded-2xl bg-white/70 border border-white/60 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-[var(--jh-ink)]">เพิ่มยานพาหนะใหม่</p>
            <button onClick={() => setShowForm(false)} className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200">
              <X className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>

          {/* Type selector */}
          <div className="flex gap-2">
            {(["MOTORCYCLE", "CAR"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                  type === t
                    ? "border-[#d4a548] bg-amber-50 text-[#d4a548]"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                }`}
              >
                <VehicleIcon t={t} />
                {t === "CAR" ? "รถยนต์" : "มอเตอร์ไซค์"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-600">ทะเบียน *</Label>
              <Input
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                placeholder="กก 1234"
                className="h-9 rounded-xl text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-600">ยี่ห้อ</Label>
              <Input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Honda, Toyota"
                className="h-9 rounded-xl text-xs"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs font-semibold text-slate-600">สี</Label>
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="สีขาว, สีดำ"
                className="h-9 rounded-xl text-xs"
              />
            </div>
          </div>

          <button
            onClick={handleAdd}
            disabled={isSaving}
            className="w-full py-2.5 rounded-full text-sm font-bold text-white disabled:opacity-60 transition-all hover:-translate-y-0.5"
            style={{ background: "#d4a548", boxShadow: "0 8px 18px -6px #d4a548" }}
          >
            {isSaving ? "กำลังบันทึก..." : "บันทึกยานพาหนะ"}
          </button>
        </div>
      )}

      {/* Vehicle list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="h-14 rounded-2xl bg-white/50 animate-pulse" />)}
        </div>
      ) : vehicles.length === 0 && !showForm ? (
        <div className="text-center py-6 text-[var(--jh-ink-tertiary)] text-sm">
          ยังไม่มียานพาหนะที่ลงทะเบียน
        </div>
      ) : (
        <div className="space-y-2">
          {vehicles.map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between rounded-2xl bg-white/70 border border-white/60 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background: v.type === "CAR" ? "#5856d6" : "#34508c",
                    color: "#fff",
                  }}
                >
                  <VehicleIcon t={v.type} />
                </div>
                <div>
                  <p className="font-bold text-sm text-[var(--jh-ink)] font-mono">{v.licensePlate}</p>
                  <p className="text-xs text-[var(--jh-ink-tertiary)]">
                    {v.type === "CAR" ? "รถยนต์" : "มอเตอร์ไซค์"}
                    {v.brand ? ` · ${v.brand}` : ""}
                    {v.color ? ` · ${v.color}` : ""}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(v.id)}
                disabled={deletingId === v.id}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
