"use client";

import { useState } from "react";
import useSWR from "swr";
import { jsonFetcher } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

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
    </div>
  );
}
