"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function TenantsPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    roomId: "",
    name: "",
    username: "",
    password: "",
  });

  // For password visibility
  const [visiblePasswords, setVisiblePasswords] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchTenants(), fetchAvailableRooms()]);
      setIsLoading(false);
    };
    loadData();
  }, []);

  async function fetchTenants() {
    const res = await fetch("/api/tenants");
    if (res.ok) {
      const data = await res.json();
      setTenants(data);
    }
  };

  async function fetchAvailableRooms() {
    const res = await fetch("/api/rooms?status=AVAILABLE");
    if (res.ok) {
      const data = await res.json();
      setAvailableRooms(data);
    }
  };

  const togglePasswordVisibility = (tenantId: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [tenantId]: !prev[tenantId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/owner/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ roomId: "", name: "", username: "", password: "" });
        fetchTenants();
        fetchAvailableRooms();
      } else {
        const errorData = await res.json();
        alert(errorData.message || "เกิดข้อผิดพลาดในการสร้างบัญชี");
      }
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการสร้างบัญชี");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">จัดการรายชื่อผู้เช่า (ลูกบ้าน)</h1>
          <p className="text-slate-500 text-sm mt-1">
            สร้างและจัดการบัญชีให้ลูกบ้านของคุณ เพื่อให้พวกเขาเข้าระบบและดูบิลได้
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-sm">
          + เพิ่มลูกบ้านใหม่
        </Button>
      </div>

      <Card className="rounded-[24px] border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
          <CardTitle className="text-lg font-bold text-slate-800">รายชื่อผู้เช่าทั้งหมด</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-semibold">ห้องพัก</th>
                  <th className="px-6 py-4 font-semibold">ชื่อลูกบ้าน</th>
                  <th className="px-6 py-4 font-semibold">Username (ล็อกอิน)</th>
                  <th className="px-6 py-4 font-semibold">รหัสผ่าน</th>
                  <th className="px-6 py-4 font-semibold text-right">สัญญาเช่า</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tenants.map(tenant => (
                  <tr key={tenant.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg inline-block">
                        {tenant.room?.property?.name ? `${tenant.room.property.name} - ` : ''}
                        {tenant.room?.number || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800">{tenant.user.name || "-"}</td>
                    <td className="px-6 py-4 text-blue-600 font-medium bg-blue-50/30 rounded">
                      {tenant.user.username || tenant.user.email}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono bg-slate-100 px-2 py-1 rounded text-slate-700">
                          {visiblePasswords[tenant.id] ? tenant.user.unencryptedPassword : "••••••••"}
                        </span>
                        <button 
                          onClick={() => togglePasswordVisibility(tenant.id)}
                          className="text-slate-400 hover:text-slate-600 transition-colors"
                          title={visiblePasswords[tenant.id] ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                        >
                          {visiblePasswords[tenant.id] ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="outline" size="sm" className="rounded-xl border-slate-200 text-slate-600 hover:text-slate-900" onClick={() => window.open(`/dashboard/tenants/${tenant.id}/lease`, '_blank')}>
                        พิมพ์สัญญาเช่า
                      </Button>
                    </td>
                  </tr>
                ))}
                {tenants.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                      </div>
                      <p className="text-slate-500 font-medium">ยังไม่มีข้อมูลผู้เช่า</p>
                      <p className="text-slate-400 text-sm mt-1">กดปุ่ม + เพิ่มลูกบ้านใหม่ เพื่อสร้างบัญชีให้ผู้เช่า</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in">
          <div className="bg-white rounded-[24px] p-6 w-full max-w-md shadow-lg animate-in zoom-in-95">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-slate-800">เพิ่มลูกบ้านเข้าห้องพัก</h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">เลือกห้องพัก (เฉพาะห้องที่ว่าง)</Label>
                <select 
                  required 
                  className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  value={formData.roomId}
                  onChange={e => {
                    const selectedRoom = availableRooms.find(r => r.id === e.target.value);
                    const suggestedUsername = selectedRoom ? `${selectedRoom.property?.name?.substring(0,2).toUpperCase() || 'AP'}-${selectedRoom.number}` : "";
                    setFormData({...formData, roomId: e.target.value, username: suggestedUsername});
                  }}
                >
                  <option value="">-- กรุณาเลือกห้องพัก --</option>
                  {availableRooms.map(room => (
                    <option key={room.id} value={room.id}>
                      {room.property?.name} - ห้อง {room.number} (ราคา: {room.rentPrice})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">ชื่อผู้เช่า (เว้นว่างได้)</Label>
                <Input 
                  placeholder="เช่น สมชาย ใจดี" 
                  className="h-11 rounded-xl bg-slate-50 border-slate-200"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">Username (รหัสลูกบ้านสำหรับล็อกอิน)</Label>
                <Input 
                  required 
                  placeholder="เช่น AP-001" 
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 font-mono"
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                />
                <p className="text-xs text-slate-500">แนะนำให้ใช้ รหัสหอพัก+เลขห้อง เพื่อให้จำง่าย</p>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">รหัสผ่านชั่วคราว</Label>
                <Input 
                  required 
                  placeholder="ตั้งรหัสผ่านให้ลูกบ้าน" 
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 font-mono"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
                <p className="text-xs text-slate-500">ลูกบ้านสามารถเปลี่ยนรหัสนี้ได้ภายหลังเมื่อล็อกอินเข้าระบบ</p>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-xl font-medium">
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={isSubmitting} className="rounded-xl font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                  {isSubmitting ? "กำลังบันทึก..." : "ยืนยันการเพิ่มลูกบ้าน"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
