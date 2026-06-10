"use client";

import { toast } from "sonner";
import { useState, useEffect, Suspense } from "react";
import useSWR from "swr";
import { jsonFetcher } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter, useSearchParams } from "next/navigation";
import { getBuildingsWithTenants } from "@/app/actions/tenants";
import { Users } from "lucide-react";

function TenantsDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const actionParam = searchParams.get("action");
  const roomIdParam = searchParams.get("roomId");

  // ── SWR: buildings+tenants (server action as async fetcher) ──────
  const {
    data: buildingsData = [],
    isLoading,
    mutate: mutateBuildings,
  } = useSWR("buildings-with-tenants", getBuildingsWithTenants);

  // ── SWR: available rooms ──────────────────────────────────────────
  const { data: availableRooms = [], mutate: mutateAvailableRooms } = useSWR<any[]>(
    "/api/rooms?status=AVAILABLE",
    jsonFetcher
  );

  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
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

  // Pre-select room if roomId query param is present
  useEffect(() => {
    if ((roomIdParam || actionParam === "create") && availableRooms.length > 0) {
      const selectedRoom = roomIdParam ? availableRooms.find(r => r.id === roomIdParam) : availableRooms[0];
      if (selectedRoom) {
        setFormData(prev => ({
          ...prev,
          roomId: selectedRoom.id,
          username: ""
        }));
        setIsModalOpen(true);
      } else if (actionParam === "create") {
        setIsModalOpen(true);
      }
    }
  }, [roomIdParam, actionParam, availableRooms]);

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
        mutateBuildings(); mutateAvailableRooms();
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

  const activeBuilding = buildingsData.find((b: any) => b.id === selectedBuildingId);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out max-w-6xl mx-auto space-y-6">
      
      {/* Header and Breadcrumb */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <span>การจัดการ</span>
            <span>/</span>
            <span className="font-medium text-slate-700">รายชื่อผู้เช่า</span>
            {selectedBuildingId && activeBuilding && (
              <>
                <span>/</span>
                <span className="font-semibold text-slate-900">{activeBuilding.name}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--jh-radius-md)]"
              style={{ background: "#ff9500", color: "#fff", boxShadow: "0 10px 22px -8px #ff9500" }}
            >
              <Users className="h-[21px] w-[21px]" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-[-0.02em] text-[var(--jh-ink)]">จัดการรายชื่อผู้เช่า</h1>
              <p className="text-slate-500 text-sm mt-0.5">
                {selectedBuildingId && activeBuilding
                  ? `รายชื่อลูกบ้านในอาคาร: ${activeBuilding.name}`
                  : "สรุปข้อมูลการเข้าพักและจำนวนลูกบ้านแยกตามอาคาร/หอพัก"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {selectedBuildingId && (
            <Button
              variant="outline"
              onClick={() => setSelectedBuildingId(null)}
              className="rounded-full border-slate-200 hover:bg-slate-50"
            >
              ⬅️ ดูตึกทั้งหมด
            </Button>
          )}
          <Button onClick={() => setIsModalOpen(true)} className="rounded-full bg-[#ff9500] hover:brightness-105 text-white font-semibold shadow-[0_8px_18px_-6px_#ff9500] transition-all hover:-translate-y-0.5">
            + เพิ่มลูกบ้านใหม่
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="animate-pulse rounded-3xl border-slate-100 p-6 space-y-4">
              <div className="h-6 bg-slate-100 rounded w-1/2"></div>
              <div className="h-4 bg-slate-100 rounded w-1/3"></div>
              <div className="h-20 bg-slate-50 rounded-2xl"></div>
            </Card>
          ))}
        </div>
      ) : buildingsData.length === 0 ? (
        <Card className="rounded-[32px] border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-12 text-center">
          <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          </div>
          <p className="text-slate-600 font-bold text-lg">ยังไม่มีหอพักในระบบ</p>
          <p className="text-slate-400 text-sm mt-1 mb-6">คุณจำเป็นต้องเพิ่มข้อมูลหอพักและห้องพักก่อนเริ่มจัดการผู้เช่า</p>
          <Button onClick={() => router.push("/dashboard/properties")} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
            เพิ่มหอพักใหม่
          </Button>
        </Card>
      ) : !selectedBuildingId ? (
        
        /* ─── Mode 1: Building Overview Grid ─── */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {buildingsData.map((building: any) => (
            <div
              key={building.id}
              onClick={() => setSelectedBuildingId(building.id)}
              className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-blue-400/60 cursor-pointer transition-all duration-300 group flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                    {building.name}
                  </h2>
                  <span className="text-[11px] px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full font-bold truncate max-w-[150px]">
                    📍 {building.location || "ไม่มีข้อมูลที่ตั้ง"}
                  </span>
                </div>
                
                {/* Stats panel */}
                <div className="grid grid-cols-3 gap-4 my-6 bg-slate-50 p-4 rounded-2xl text-center border border-slate-100">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">ห้องทั้งหมด</p>
                    <p className="text-xl font-extrabold text-slate-800 mt-1">{building.totalRooms}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">มีผู้เช่า</p>
                    <p className="text-xl font-extrabold text-emerald-600 mt-1">{building.activeTenantsCount}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">ห้องว่าง</p>
                    <p className="text-xl font-extrabold text-orange-500 mt-1">{building.vacantRoomsCount}</p>
                  </div>
                </div>
              </div>

              <div className="text-right text-xs font-bold text-blue-500 group-hover:translate-x-1 transition-transform flex items-center justify-end gap-1">
                ดูรายชื่อผู้เช่าในตึกนี้ ➔
              </div>
            </div>
          ))}
        </div>
      ) : (
        
        /* ─── Mode 2: Detailed Building Tenant Table ─── */
        <Card className="rounded-[24px] border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-slate-800">{activeBuilding?.name}</CardTitle>
              <CardDescription className="text-xs text-slate-400 mt-0.5">📍 {activeBuilding?.location}</CardDescription>
            </div>
            <span className="bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-xl">
              ลูกบ้านทั้งหมด {activeBuilding?.tenants.length} คน
            </span>
          </CardHeader>
          <CardContent className="p-0">
            {activeBuilding && activeBuilding.tenants.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 font-semibold">ห้องพัก</th>
                      <th className="px-6 py-4 font-semibold">ชื่อลูกบ้าน</th>
                      <th className="px-6 py-4 font-semibold">Username (ล็อกอิน)</th>
                      <th className="px-6 py-4 font-semibold text-right">สัญญาเช่า / การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeBuilding.tenants.map((tenant: any) => (
                      <tr key={tenant.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-mono font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg inline-block">
                            ห้อง {tenant.roomNumber || "-"}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-800">{tenant.name || "-"}</td>
                        <td className="px-6 py-4">
                          <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-lg font-mono">
                            {tenant.username}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="rounded-xl border-amber-200 text-amber-600 hover:bg-amber-50 hover:text-amber-700 font-semibold text-xs" 
                              onClick={() => {
                                setResetPasswordTenantId(tenant.id);
                                setNewPasswordValue("");
                                setIsResetPasswordModalOpen(true);
                              }}
                            >
                              รีเซ็ตรหัสผ่าน
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="rounded-xl border-slate-200 text-slate-600 hover:text-slate-900 font-semibold text-xs" 
                              onClick={() => window.open(`/dashboard/tenants/${tenant.id}/contract`, '_blank')}
                            >
                              พิมพ์สัญญาเช่า
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-semibold text-xs" 
                              onClick={() => {
                                setEvictTenantId(tenant.id);
                                setIsEvictModalOpen(true);
                              }}
                            >
                              ย้ายออก
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400">
                📭 ยังไม่มีลูกบ้านลงทะเบียนเข้าพักในตึกนี้
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Tenant Modal */}
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
                    setFormData({...formData, roomId: e.target.value, username: ""});
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
                <Label className="text-slate-700 font-semibold">เบอร์โทรศัพท์มือถือ (ใช้เป็น Username สำหรับล็อกอิน)</Label>
                <Input 
                  required 
                  type="tel"
                  pattern="^0[0-9]{9}$"
                  title="กรุณากรอกเบอร์โทรศัพท์ 10 หลัก ขึ้นต้นด้วย 0 เช่น 0812345678"
                  placeholder="เช่น 0812345678" 
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 font-mono"
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                />
                <p className="text-xs text-slate-500">แนะนำ: ใช้เบอร์โทรศัพท์ของลูกบ้านจริง เพื่อป้องกันชื่อล็อกอินซ้ำกับหอพักอื่น</p>
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
                      mutateBuildings(); mutateAvailableRooms();
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

export default function TenantsPage() {
  return (
    <Suspense fallback={
      <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 bg-slate-100 rounded w-1/4"></div>
        <div className="h-4 bg-slate-100 rounded w-1/3 mt-2"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="h-48 bg-slate-100 rounded-3xl"></div>
          <div className="h-48 bg-slate-100 rounded-3xl"></div>
        </div>
      </div>
    }>
      <TenantsDashboardContent />
    </Suspense>
  );
}
