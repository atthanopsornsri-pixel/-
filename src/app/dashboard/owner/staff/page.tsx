"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Users, Plus, Trash2 } from "lucide-react";

interface Property {
  id: string;
  name: string;
}

interface StaffMember {
  id: string;
  name: string | null;
  username: string | null;
  email: string;
  properties: Property[];
}

export default function StaffManagementPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const [form, setForm] = useState({ name: "", username: "", password: "", propertyIds: [] as string[] });

  const load = async () => {
    setIsLoading(true);
    try {
      const [propRes, staffRes] = await Promise.all([
        fetch("/api/properties"),
        fetch("/api/owner/staff"),
      ]);
      if (propRes.ok) setProperties(await propRes.json());
      if (staffRes.ok) setStaff(await staffRes.json());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const togglePropertyInForm = (id: string) => {
    setForm((p) => ({
      ...p,
      propertyIds: p.propertyIds.includes(id) ? p.propertyIds.filter((x) => x !== id) : [...p.propertyIds, id],
    }));
  };

  const handleCreate = async () => {
    if (!form.username || !form.password || form.propertyIds.length === 0) {
      toast.error("กรุณากรอก Username, รหัสผ่าน และเลือกอย่างน้อย 1 ตึก");
      return;
    }
    setIsCreating(true);
    try {
      const res = await fetch("/api/owner/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("เพิ่มพนักงานสำเร็จ");
        setForm({ name: "", username: "", password: "", propertyIds: [] });
        load();
      } else {
        toast.error(json.message || "เพิ่มพนักงานไม่สำเร็จ");
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleAssignment = async (staffMember: StaffMember, propertyId: string) => {
    const current = staffMember.properties.map((p) => p.id);
    const next = current.includes(propertyId) ? current.filter((id) => id !== propertyId) : [...current, propertyId];
    const res = await fetch(`/api/owner/staff/${staffMember.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyIds: next }),
    });
    if (res.ok) {
      toast.success("อัปเดตตึกที่ดูแลแล้ว");
      load();
    } else {
      toast.error("อัปเดตไม่สำเร็จ");
    }
  };

  const handleRemove = async (staffMember: StaffMember) => {
    if (!confirm(`ถอนพนักงาน "${staffMember.name || staffMember.username}" ออกจากทุกตึก?`)) return;
    const res = await fetch(`/api/owner/staff/${staffMember.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("ถอนพนักงานแล้ว");
      load();
    } else {
      toast.error("ดำเนินการไม่สำเร็จ");
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">กำลังโหลด...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-3">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-[var(--jh-radius-md)]"
          style={{ background: "#34508c", color: "#fff", boxShadow: "0 10px 22px -8px #34508c" }}
        >
          <Users className="h-5 w-5" strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--jh-ink)]">จัดการพนักงาน (Staff)</h1>
          <p className="text-sm text-[var(--jh-ink-secondary)]">มอบหมายตึกที่พนักงานแต่ละคนดูแล — เห็นเฉพาะตึกที่ได้รับมอบหมายเท่านั้น</p>
        </div>
      </div>

      {/* ฟอร์มเพิ่มพนักงานใหม่ */}
      <section
        className="rounded-[var(--jh-radius-2xl)] border border-white/60 p-6 shadow-[var(--jh-shadow-card)] space-y-4"
        style={{ background: "linear-gradient(150deg, #f3f5fa 0%, #e4eaf5 100%)" }}
      >
        <h2 className="font-bold text-[var(--jh-blue)]">เพิ่มพนักงานใหม่</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label>ชื่อ</Label>
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="เช่น สมชาย ใจดี" />
          </div>
          <div className="space-y-1">
            <Label>Username *</Label>
            <Input value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} placeholder="เช่น staff01" />
          </div>
          <div className="space-y-1">
            <Label>รหัสผ่าน *</Label>
            <Input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} placeholder="อย่างน้อย 6 ตัวอักษร" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>ตึกที่ดูแล *</Label>
          <div className="flex flex-wrap gap-2">
            {properties.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => togglePropertyInForm(p.id)}
                className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition-colors ${
                  form.propertyIds.includes(p.id)
                    ? "bg-[var(--jh-blue)] text-white border-transparent"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {p.name}
              </button>
            ))}
            {properties.length === 0 && <p className="text-sm text-slate-400">ยังไม่มีตึก — สร้างหอพักก่อน</p>}
          </div>
        </div>
        <Button
          onClick={handleCreate}
          disabled={isCreating}
          style={{ background: "#34508c", boxShadow: "0 8px 18px -6px #34508c" }}
          className="text-white"
        >
          <Plus className="h-4 w-4 mr-1" />
          {isCreating ? "กำลังเพิ่ม..." : "เพิ่มพนักงาน"}
        </Button>
      </section>

      {/* รายชื่อพนักงาน */}
      <section className="space-y-3">
        <h2 className="font-bold text-[var(--jh-blue)]">พนักงานทั้งหมด ({staff.length})</h2>
        {staff.length === 0 && <p className="text-sm text-slate-400">ยังไม่มีพนักงาน</p>}
        {staff.map((s) => (
          <div key={s.id} className="bg-white border border-[#efeae0] rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800">{s.name || s.username}</p>
                <p className="text-xs text-slate-400">Username: {s.username}</p>
              </div>
              <button
                onClick={() => handleRemove(s)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-50 text-red-700 font-bold hover:bg-red-100 transition-colors text-sm"
              >
                <Trash2 className="h-3.5 w-3.5" />
                ถอนออก
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {properties.map((p) => {
                const assigned = s.properties.some((sp) => sp.id === p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleToggleAssignment(s, p.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                      assigned
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {assigned ? "✓ " : "+ "}
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
