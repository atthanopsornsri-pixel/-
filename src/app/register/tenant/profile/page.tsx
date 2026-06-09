"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

type Vehicle = { id: string; licensePlate: string; brand: string; color: string; type: string };

export default function TenantProfileSetupPage() {
  const router = useRouter();

  // ── Personal info ──
  const [firstName, setFirstName]               = useState("");
  const [lastName, setLastName]                 = useState("");
  const [idCard, setIdCard]                     = useState("");
  const [phone, setPhone]                       = useState("");
  const [address, setAddress]                   = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [emergencyPhone, setEmergencyPhone]     = useState("");

  // ── Password (ตั้งรหัสผ่านสำหรับล็อกอินทุกเครื่อง) ──
  const [password, setPassword]                 = useState("");
  const [confirmPassword, setConfirmPassword]   = useState("");

  // ── Vehicles ──
  const [vehicles, setVehicles]   = useState<Vehicle[]>([]);
  const [plate, setPlate]         = useState("");
  const [brand, setBrand]         = useState("");
  const [color, setColor]         = useState("");
  const [vType, setVType]         = useState<"CAR" | "MOTORCYCLE" | "OTHER">("MOTORCYCLE");
  const [addingVehicle, setAddingVehicle] = useState(false);

  const [saving, setSaving] = useState(false);
  const [skipping, setSkipping] = useState(false);

  // ── Add vehicle locally ──
  const handleAddVehicle = () => {
    if (!plate.trim()) { toast.error("กรุณากรอกทะเบียนรถ"); return; }
    setVehicles((prev) => [
      ...prev,
      { id: crypto.randomUUID(), licensePlate: plate.trim().toUpperCase(), brand, color, type: vType },
    ]);
    setPlate(""); setBrand(""); setColor(""); setVType("MOTORCYCLE");
    setAddingVehicle(false);
  };

  // ── Save all ──
  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("กรุณากรอกชื่อและนามสกุล (จำเป็นสำหรับสัญญาเช่า)");
      return;
    }

    // ── ตรวจสอบรหัสผ่าน (ถ้ามีการกรอก) ──
    if (password || confirmPassword) {
      if (!phone.trim()) {
        toast.error("กรุณากรอกเบอร์โทร เพราะจะใช้เป็นชื่อผู้ใช้ตอนล็อกอิน");
        return;
      }
      if (password.length < 6) {
        toast.error("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
        return;
      }
      if (password !== confirmPassword) {
        toast.error("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
        return;
      }
    }

    setSaving(true);
    try {
      // 1. บันทึกข้อมูลส่วนตัว
      const res = await fetch("/api/tenant/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName, lastName,
          idCardNumber: idCard,
          phoneNumber: phone,
          address,
          emergencyContact,
          emergencyPhone,
          password: password || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "บันทึกข้อมูลไม่สำเร็จ");
      }

      // 2. บันทึกยานพาหนะทีละคัน
      for (const v of vehicles) {
        await fetch("/api/tenant/vehicles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ licensePlate: v.licensePlate, brand: v.brand, color: v.color, type: v.type }),
        });
      }

      if (password) {
        toast.success("บันทึกสำเร็จ! ล็อกอินครั้งหน้าใช้เบอร์โทร + รหัสผ่านได้เลย");
      } else {
        toast.success("บันทึกข้อมูลสำเร็จ!");
      }
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Skip (fill later) ──
  const handleSkip = () => {
    setSkipping(true);
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-lg space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">กรอกข้อมูลผู้เช่า</h1>
          <p className="text-slate-500 text-sm">ข้อมูลนี้จะใช้ในสัญญาเช่าและการติดต่อฉุกเฉิน</p>
        </div>

        {/* ── Personal Info ── */}
        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold text-slate-800">ข้อมูลส่วนตัว</CardTitle>
            <CardDescription className="text-xs text-slate-500">ชื่อ-นามสกุลต้องตรงกับบัตรประชาชน</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-700 text-sm">ชื่อจริง *</Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="สมชาย" className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-700 text-sm">นามสกุล *</Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="ใจดี" className="h-11 rounded-xl" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700 text-sm">เลขบัตรประชาชน 13 หลัก</Label>
              <Input
                value={idCard}
                onChange={(e) => setIdCard(e.target.value.replace(/\D/g, "").slice(0, 13))}
                placeholder="1 2345 67890 12 3"
                className="h-11 rounded-xl font-mono tracking-widest"
                inputMode="numeric"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700 text-sm">เบอร์โทรศัพท์</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0812345678" className="h-11 rounded-xl" inputMode="tel" />
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700 text-sm">ที่อยู่ตามทะเบียนบ้าน</Label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110"
                rows={3}
                className="w-full border border-input rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Emergency Contact ── */}
        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold text-slate-800">ผู้ติดต่อฉุกเฉิน</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700 text-sm">ชื่อผู้ติดต่อ</Label>
              <Input value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} placeholder="นางสมศรี ใจดี (แม่)" className="h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700 text-sm">เบอร์โทร</Label>
              <Input value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} placeholder="0898765432" className="h-11 rounded-xl" inputMode="tel" />
            </div>
          </CardContent>
        </Card>

        {/* ── ตั้งรหัสผ่าน (ล็อกอินทุกเครื่อง) ── */}
        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold text-slate-800">ตั้งรหัสผ่าน (ไม่บังคับ)</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              ตั้งไว้เพื่อล็อกอินจากคอมพิวเตอร์หรือเครื่องที่ไม่มีแอป LINE ได้ โดยใช้ <strong>เบอร์โทร</strong> เป็นชื่อผู้ใช้
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5 text-xs text-emerald-700">
              ชื่อผู้ใช้ของคุณ = เบอร์โทร <strong className="font-mono">{phone.trim() || "(กรอกเบอร์โทรด้านบน)"}</strong>
            </div>
            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700 text-sm">รหัสผ่าน</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="อย่างน้อย 6 ตัวอักษร"
                className="h-11 rounded-xl"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700 text-sm">ยืนยันรหัสผ่าน</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="กรอกรหัสผ่านอีกครั้ง"
                className="h-11 rounded-xl"
                autoComplete="new-password"
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Vehicles ── */}
        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold text-slate-800">ยานพาหนะ (ถ้ามี)</CardTitle>
            <CardDescription className="text-xs text-slate-500">ลงทะเบียนรถที่ใช้จอดในหอพัก</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {vehicles.map((v) => (
              <div key={v.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <p className="font-mono font-bold text-slate-800 text-sm">{v.licensePlate}</p>
                  <p className="text-xs text-slate-500">{v.type === "CAR" ? "🚗" : v.type === "MOTORCYCLE" ? "🏍️" : "🚗"} {v.brand} {v.color}</p>
                </div>
                <button onClick={() => setVehicles((prev) => prev.filter((x) => x.id !== v.id))} className="text-red-400 hover:text-red-600 text-sm font-medium">ลบ</button>
              </div>
            ))}

            {addingVehicle ? (
              <div className="border border-dashed border-slate-300 rounded-xl p-4 space-y-3 bg-slate-50">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-sm font-semibold text-slate-700">ทะเบียนรถ *</Label>
                    <Input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="กก 1234" className="h-10 rounded-xl uppercase font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-slate-700">ยี่ห้อ</Label>
                    <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Honda" className="h-10 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-slate-700">สี</Label>
                    <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="แดง" className="h-10 rounded-xl" />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-sm font-semibold text-slate-700">ประเภท</Label>
                    <select value={vType} onChange={(e) => setVType(e.target.value as any)} className="w-full border border-input rounded-xl h-10 px-3 text-sm bg-white">
                      <option value="MOTORCYCLE">🏍️ รถมอเตอร์ไซค์</option>
                      <option value="CAR">🚗 รถยนต์</option>
                      <option value="OTHER">🚗 อื่นๆ</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddVehicle} size="sm" className="rounded-xl bg-slate-900 text-white">เพิ่มรถ</Button>
                  <Button onClick={() => setAddingVehicle(false)} size="sm" variant="outline" className="rounded-xl">ยกเลิก</Button>
                </div>
              </div>
            ) : (
              <Button onClick={() => setAddingVehicle(true)} variant="outline" size="sm" className="w-full rounded-xl border-dashed border-slate-300 text-slate-600">
                + เพิ่มยานพาหนะ
              </Button>
            )}
          </CardContent>
        </Card>

        {/* ── Actions ── */}
        <div className="space-y-3 pb-8">
          <Button onClick={handleSave} disabled={saving} className="w-full h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-lg shadow-blue-600/20">
            {saving ? "กำลังบันทึก..." : "บันทึกและเข้าสู่ระบบ →"}
          </Button>
          <button onClick={handleSkip} disabled={skipping} className="w-full text-sm text-slate-400 hover:text-slate-600 py-2">
            {skipping ? "กำลังโหลด..." : "กรอกทีหลัง (ข้ามไปก่อน)"}
          </button>
        </div>

      </div>
    </div>
  );
}
