"use client";
import { toast } from "sonner";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSearchParams } from "next/navigation";

export default function TenantsPage() {
  const searchParams = useSearchParams();
  const actionParam = searchParams.get("action");
  const roomIdParam = searchParams.get("roomId");

  const [tenants, setTenants] = useState<any[]>([]);
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Custom prompt modals states
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [resetPasswordTenantId, setResetPasswordTenantId] = useState<string | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const [isEvictModalOpen, setIsEvictModalOpen] = useState(false);
  const [evictTenantId, setEvictTenantId] = useState<string | null>(null);
  const [isEvicting, setIsEvicting] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    roomId: "",
    name: "",
    username: "",
    password: "",
  });

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchTenants(), fetchAvailableRooms()]);
      setIsLoading(false);
    };
    loadData();
  }, []);

  // Pre-select room if roomId query param is present
  useEffect(() => {
    if ((roomIdParam || actionParam === "create") && availableRooms.length > 0) {
      const selectedRoom = roomIdParam ? availableRooms.find(r => r.id === roomIdParam) : availableRooms[0];
      if (selectedRoom) {
        const suggestedUsername = `${selectedRoom.property?.name?.substring(0,2).toUpperCase() || 'AP'}-${selectedRoom.number}`;
        setFormData(prev => ({
          ...prev,
          roomId: selectedRoom.id,
          username: suggestedUsername
        }));
        setIsModalOpen(true);
      } else if (actionParam === "create") {
        setIsModalOpen(true);
      }
    }
  }, [roomIdParam, actionParam, availableRooms]);

  async function fetchTenants() {
    const res = await fetch("/api/tenants", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setTenants(data);
    }
  };

  async function fetchAvailableRooms() {
    const res = await fetch("/api/rooms?status=AVAILABLE", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setAvailableRooms(data);
    }
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
        toast.error(errorData.message || "เกิดข้อผิดพลาดในการสร้างบัญชี");
      }
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการสร้างบัญชี");
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
                  <th className="px-6 py-4 font-semibold text-right">สัญญาเช่า</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="h-8 bg-slate-100 rounded-lg w-24"></div>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-800">
                        <div className="h-5 bg-slate-100 rounded w-32"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-5 bg-slate-100 rounded w-28"></div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-9 bg-slate-100 rounded-xl w-24"></div>
                          <div className="h-9 bg-slate-100 rounded-xl w-16"></div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : tenants.map(tenant => (
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
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" className="rounded-xl border-amber-200 text-amber-600 hover:bg-amber-50 hover:text-amber-700 font-semibold" onClick={() => {
                          setResetPasswordTenantId(tenant.id);
                          setNewPasswordValue("");
                          setIsResetPasswordModalOpen(true);
                        }}>
                          รีเซ็ตรหัสผ่าน
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-xl border-slate-200 text-slate-600 hover:text-slate-900 font-semibold" onClick={() => window.open(`/dashboard/tenants/${tenant.id}/contract`, '_blank')}>
                          พิมพ์สัญญาเช่า
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-semibold" onClick={() => {
                          setEvictTenantId(tenant.id);
                          setIsEvictModalOpen(true);
                        }}>
                          ย้ายออก
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!isLoading && tenants.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="mb-6">
              <h2 className="text-2xl font-extrabold text-slate-800">เพิ่มลูกบ้านเข้าห้องพัก</h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-700 font-semibold">เลือกห้องพัก (เฉพาะห้องที่ว่าง)</Label>
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
                <Label className="text-slate-700 font-semibold">ชื่อผู้เช่า (เว้นว่างได้)</Label>
                <Input 
                  placeholder="เช่น สมชาย ใจดี" 
                  className="h-11 rounded-xl bg-slate-50 border-slate-200"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 font-semibold">Username (รหัสลูกบ้านสำหรับล็อกอิน)</Label>
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
                <Label className="text-slate-700 font-semibold">รหัสผ่านชั่วคราว</Label>
                <Input 
                  required 
                  placeholder="ตั้งรหัสผ่านให้ลูกบ้าน" 
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 font-mono"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
                <p className="text-xs text-slate-500">ลูกบ้านสามารถเปลี่ยนรหัสนี้ได้ภายหลังเมื่อล็อกอินเข้าระบบ</p>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsModalOpen(false)} 
                  className="rounded-full border-slate-200 text-slate-600 font-semibold px-6 py-2.5 hover:bg-slate-50 transition-colors h-11"
                >
                  ยกเลิก
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 shadow-md h-11"
                >
                  {isSubmitting ? "กำลังบันทึก..." : "ยืนยันการเพิ่มลูกบ้าน"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {isResetPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-extrabold text-slate-800 mb-3">🔑 รีเซ็ตรหัสผ่าน</h3>
            <p className="text-sm text-slate-500 mb-6">ระบุรหัสผ่านใหม่สำหรับลูกบ้านรายนี้:</p>
            
            <div className="space-y-4">
              <Input
                type="text"
                placeholder="ป้อนรหัสผ่านใหม่ (อย่างน้อย 4 ตัว)"
                value={newPasswordValue}
                onChange={(e) => setNewPasswordValue(e.target.value)}
                className="h-11 rounded-xl bg-slate-50 border-slate-200 font-mono focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            
            <div className="mt-8 flex gap-3 justify-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsResetPasswordModalOpen(false);
                  setResetPasswordTenantId(null);
                }}
                disabled={isResettingPassword}
                className="rounded-full border-slate-200 text-slate-600 font-semibold px-6 py-2.5 h-11 hover:bg-slate-50 transition-colors"
              >
                ยกเลิก
              </Button>
              <Button 
                onClick={async () => {
                  if (newPasswordValue.trim().length < 4) {
                    toast.error("รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร");
                    return;
                  }
                  setIsResettingPassword(true);
                  try {
                    const res = await fetch(`/api/owner/tenants/${resetPasswordTenantId}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ password: newPasswordValue.trim() }),
                    });
                    if (res.ok) {
                      toast.success("รีเซ็ตรหัสผ่านลูกบ้านสำเร็จ!");
                      setIsResetPasswordModalOpen(false);
                      setResetPasswordTenantId(null);
                    } else {
                      toast.error("เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน");
                    }
                  } catch (error) {
                    toast.error("เกิดข้อผิดพลาด");
                  } finally {
                    setIsResettingPassword(false);
                  }
                }}
                disabled={isResettingPassword}
                className="rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 shadow-md h-11"
              >
                {isResettingPassword ? "กำลังบันทึก..." : "ตกลง"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Evict Modal */}
      {isEvictModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-extrabold text-slate-800 mb-3">🚪 ยืนยันการย้ายออก</h3>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">
              คุณแน่ใจหรือไม่ที่จะให้ผู้เช่าคนนี้ย้ายออก? ระบบจะลบบัญชีและคืนสถานะห้องเป็น <span className="font-semibold text-emerald-600">"ว่าง"</span> ทันที
            </p>
            
            <div className="flex gap-3 justify-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsEvictModalOpen(false);
                  setEvictTenantId(null);
                }}
                disabled={isEvicting}
                className="rounded-full border-slate-200 text-slate-600 font-semibold px-6 py-2.5 h-11 hover:bg-slate-50 transition-colors"
              >
                ยกเลิก
              </Button>
              <Button 
                onClick={async () => {
                  setIsEvicting(true);
                  try {
                    const res = await fetch(`/api/owner/tenants/${evictTenantId}`, { method: 'DELETE' });
                    if (res.ok) {
                      toast.success("บันทึกการย้ายออกสำเร็จ!");
                      fetchTenants();
                      fetchAvailableRooms();
                      setIsEvictModalOpen(false);
                      setEvictTenantId(null);
                    } else {
                      toast.error('เกิดข้อผิดพลาด');
                    }
                  } catch (error) {
                    toast.error('เกิดข้อผิดพลาด');
                  } finally {
                    setIsEvicting(false);
                  }
                }}
                disabled={isEvicting}
                className="rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2.5 shadow-md h-11"
              >
                {isEvicting ? "กำลังบันทึก..." : "ยืนยันย้ายออก"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
