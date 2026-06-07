"use client";
import { toast } from "sonner";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSearchParams, useRouter } from "next/navigation";
import { Wind, RotateCw, LayoutGrid, UserPlus } from "lucide-react";



export default function RoomsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const propertyIdParam = searchParams.get("propertyId");

  const [rooms, setRooms] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [propertyId, setPropertyId] = useState(propertyIdParam || "");
  const [number, setNumber] = useState("");
  const [floor, setFloor] = useState("");
  const [rentPrice, setRentPrice] = useState("");
  
  // Specific image fields removed
  const [isUploading, setIsUploading] = useState(false);

  // Edit states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [editNumber, setEditNumber] = useState("");
  const [editFloor, setEditFloor] = useState("");
  const [editRentPrice, setEditRentPrice] = useState("");
  
  // New MVP States
  const [editStatus, setEditStatus] = useState("AVAILABLE");
  const [editWaterMeter, setEditWaterMeter] = useState("");
  const [editElectricMeter, setEditElectricMeter] = useState("");
  const [editHasAircon, setEditHasAircon] = useState(false);
  const [editHasFan, setEditHasFan] = useState(false);
  const [editHasFurniture, setEditHasFurniture] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [copiedRoomId, setCopiedRoomId] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchProperties();
      await fetchRooms(propertyIdParam || undefined);
      setIsLoading(false);
    };
    loadData();
  }, [propertyIdParam]);

  async function fetchProperties() {
    const res = await fetch("/api/properties", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setProperties(data);
      if (!propertyId && data.length > 0 && !propertyIdParam) {
        setPropertyId(data[0].id);
      }
    }
  };

  async function fetchRooms(propId?: string) {
    let url = "/api/rooms";
    const targetPropId = propId || propertyId;
    if (targetPropId) url += `?propertyId=${targetPropId}`;

    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setRooms(data);
    }
  };

  const handlePropertyChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPropId = e.target.value;
    setPropertyId(newPropId);
    setIsLoading(true);
    await fetchRooms(newPropId);
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId, 
          number, 
          floor, 
          rentPrice: parseFloat(rentPrice)
        }),
      });

      if (res.ok) {
        setNumber("");
        setFloor("");
        setRentPrice("");
        
        fetchRooms(propertyId);
      } else {
        toast.error("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error saving room");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ยืนยันการลบห้องพัก? หากมีผู้เช่าอยู่จะไม่สามารถลบได้")) return;
    try {
      const res = await fetch(`/api/rooms/${id}`, { method: "DELETE" });
      if (res.ok) fetchRooms();
      else toast.error("ไม่สามารถลบห้องได้ อาจมีผู้เช่าอยู่");
    } catch (error) {
      console.error(error);
    }
  };

  const handleEditClick = (room: any) => {
    setEditingRoom(room);
    setEditNumber(room.number);
    setEditFloor(room.floor || "");
    setEditRentPrice(room.rentPrice.toString());
    setEditStatus(room.status || "AVAILABLE");
    setEditWaterMeter(room.waterMeterStart?.toString() || "");
    setEditElectricMeter(room.electricMeterStart?.toString() || "");
    setEditHasAircon(room.hasAircon || false);
    setEditHasFan(room.hasFan || false);
    setEditHasFurniture(room.hasFurniture || false);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditing(true);
    try {
      const res = await fetch(`/api/rooms/${editingRoom.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: editNumber,
          floor: editFloor,
          rentPrice: parseFloat(editRentPrice),
          status: editStatus,
          waterMeterStart: parseFloat(editWaterMeter) || 0,
          electricMeterStart: parseFloat(editElectricMeter) || 0,
          hasAircon: editHasAircon,
          hasFan: editHasFan,
          hasFurniture: editHasFurniture
        }),
      });

      if (res.ok) {
        setIsEditModalOpen(false);
        fetchRooms();
      } else {
        toast.error("เกิดข้อผิดพลาดในการแก้ไข");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsEditing(false);
    }
  };

  const handleCopyInvite = async (roomId: string, code: string) => {
    try {
      const inviteLink = `${window.location.origin}/register/tenant?code=${code}`;
      await navigator.clipboard.writeText(inviteLink);
      setCopiedRoomId(roomId);
      toast.success("คัดลอกลิงก์เชิญลูกบ้านสำเร็จแล้ว!");
      setTimeout(() => setCopiedRoomId(null), 2000);
    } catch (err) {
      console.error("ไม่สามารถคัดลอกลิงก์ได้:", err);
      toast.error("เกิดข้อผิดพลาดในการคัดลอกลิงก์");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <h1 className="text-3xl md:text-4xl font-extrabold text-[#1D1D1F] tracking-tight">
          จัดการห้องพัก
        </h1>
        
        {/* Select Property Filter */}
        <div className="w-full sm:w-auto bg-white rounded-full px-4 py-2 shadow-[0_2px_10px_rgb(0,0,0,0.04)] border border-slate-100">
          <select 
            value={propertyId} 
            onChange={handlePropertyChange}
            className="bg-transparent font-medium text-slate-700 focus:outline-none w-full sm:w-64"
          >
            <option value="">เลือกหอพัก...</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add Room Form */}
        <div className="lg:col-span-1">
          <div className="bg-white p-8 rounded-[32px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 sticky top-28">
            <div className="w-12 h-12 bg-[#E8F8F5] text-[#10B981] rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </div>
            <h2 className="text-xl font-bold text-[#1D1D1F] mb-6">เพิ่มห้องใหม่</h2>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-slate-600 font-medium ml-1">หอพัก/อพาร์ตเม้นท์</Label>
                <select 
                  value={propertyId} 
                  onChange={handlePropertyChange} 
                  required
                  className="w-full rounded-2xl h-12 bg-slate-50 border border-slate-200 focus:bg-white px-4 text-sm"
                >
                  <option value="" disabled>เลือกหอพัก</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-600 font-medium ml-1">หมายเลขห้อง</Label>
                  <Input 
                    value={number} 
                    onChange={(e) => setNumber(e.target.value)} 
                    required 
                    placeholder="เช่น 101"
                    className="rounded-2xl h-12 bg-slate-50 border-slate-200 focus:bg-white px-4"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600 font-medium ml-1">ชั้น</Label>
                  <Input 
                    value={floor} 
                    onChange={(e) => setFloor(e.target.value)} 
                    placeholder="เช่น 1"
                    className="rounded-2xl h-12 bg-slate-50 border-slate-200 focus:bg-white px-4"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-600 font-medium ml-1">ค่าเช่าพื้นฐาน (บาท/เดือน)</Label>
                <Input 
                  type="number" 
                  value={rentPrice} 
                  onChange={(e) => setRentPrice(e.target.value)} 
                  required 
                  placeholder="เช่น 4500"
                  className="rounded-2xl h-12 bg-slate-50 border-slate-200 focus:bg-white px-4"
                />
              </div>


              <Button 
                type="submit" 
                className="w-full rounded-full h-12 bg-[#10B981] hover:bg-[#059669] text-white font-semibold shadow-md mt-6 transition-all hover:-translate-y-0.5" 
                disabled={isUploading}
              >
                {isUploading ? "กำลังบีบอัดและบันทึกรูปภาพ..." : "เพิ่มห้องพัก"}
              </Button>
            </form>
          </div>
        </div>

        {/* Room List */}
        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-[32px] overflow-hidden shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 flex flex-col animate-pulse">
                  <div className="h-3 w-full bg-slate-200"></div>
                  <div className="p-6 flex-1 flex flex-col space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2 w-2/3">
                        <div className="h-6 bg-slate-200 rounded-md w-3/4"></div>
                        <div className="h-4 bg-slate-200 rounded-md w-1/2"></div>
                      </div>
                      <div className="h-6 bg-slate-200 rounded-full w-16"></div>
                    </div>
                    <div className="h-6 bg-slate-200 rounded-md w-1/3 mt-2"></div>
                    <div className="mt-6 flex gap-3">
                      <div className="h-11 bg-slate-100 rounded-full flex-1"></div>
                      <div className="h-11 bg-slate-200 rounded-full flex-1"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : rooms.length === 0 ? (
            <div className="bg-white rounded-[32px] p-12 text-center shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-2">ยังไม่มีห้องพัก</h3>
              <p className="text-slate-500">เพิ่มห้องพักใหม่ที่ฟอร์มด้านซ้ายมือ</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {rooms.map((room) => (
              <div key={room.id} className="bg-white rounded-[32px] overflow-hidden shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 group transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 flex flex-col">
                {room.imageMain ? (
                  <div className="h-40 w-full bg-slate-200 relative overflow-hidden shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={room.imageMain} alt={`Room ${room.number}`} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" />
                  </div>
                ) : (
                  <div className="h-3 w-full bg-[#007AFF]"></div>
                )}
                
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-extrabold text-2xl text-[#1D1D1F]">ห้อง {room.number}</h3>
                      <p className="text-sm font-medium text-slate-500 mt-1">{room.property.name} • ชั้น {room.floor || "-"}</p>
                      
                      {/* Amenities Icons/Badges */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {room.hasAircon && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                            <Wind className="w-3.5 h-3.5" /> แอร์
                          </span>
                        )}
                        {room.hasFan && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                            <RotateCw className="w-3.5 h-3.5" /> พัดลม
                          </span>
                        )}
                        {room.hasFurniture && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100">
                            <LayoutGrid className="w-3.5 h-3.5" /> เฟอร์ฯ
                          </span>
                        )}
                        {!room.hasAircon && !room.hasFan && !room.hasFurniture && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-400 italic">
                            ไม่มีสิ่งอำนวยความสะดวกพิเศษ
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wide ${
                      room.status === "AVAILABLE" ? "bg-[#E8F8F5] text-[#34C759] border border-[#34C759]/20" :
                      room.status === "OCCUPIED" ? "bg-[#E8F2FF] text-[#007AFF] border border-[#007AFF]/20" : "bg-red-50 text-red-600 border border-red-200"
                    }`}>
                      {room.status === "AVAILABLE" ? "ห้องว่าง" : room.status === "OCCUPIED" ? "มีผู้เช่า" : "ปรับปรุง"}
                    </span>
                  </div>


                  {room.inviteCode && (
                    <div 
                      onClick={() => handleCopyInvite(room.id, room.inviteCode)}
                      className={`p-3 rounded-2xl border mb-4 flex justify-between items-center transition-all duration-200 cursor-pointer select-none ${
                        copiedRoomId === room.id
                          ? "bg-green-50 border-green-300 text-green-700 shadow-sm scale-[0.98]"
                          : "bg-slate-50 border-slate-100 hover:bg-blue-50/50 hover:border-blue-200 group-hover:bg-blue-50/50"
                      }`}
                      title="คลิกเพื่อคัดลอกลิงก์เชิญลูกบ้าน"
                    >
                      <span className="text-xs font-medium text-slate-500">รหัสเชิญผู้เช่า (Invite Code)</span>
                      <span className={`font-mono text-sm font-bold bg-white px-2 py-1 rounded-lg border shadow-sm transition-all ${
                        copiedRoomId === room.id
                          ? "border-green-400 text-green-700 font-bold"
                          : "border-slate-200 text-[#007AFF]"
                      }`}>
                        {copiedRoomId === room.id ? "📋 คัดลอกลิงก์แล้ว!" : room.inviteCode}
                      </span>
                    </div>
                  )}
                  
                  <div className="text-xl font-extrabold text-[#1D1D1F] my-2 mb-6">
                    ฿{room.rentPrice.toLocaleString()}<span className="text-sm font-medium text-slate-400">/เดือน</span>
                  </div>
                  
                  <div className="mt-auto flex gap-3">
                    <Button variant="outline" className="flex-1 rounded-full border-slate-200 text-slate-600 hover:bg-slate-50 h-11 font-semibold" onClick={() => handleEditClick(room)}>
                      แก้ไข
                    </Button>
                    {room.status === "AVAILABLE" && (
                      <Link href={`/dashboard/tenants?action=create&roomId=${room.id}&roomNumber=${room.number}`} className="flex-1">
                        <Button 
                          className="w-full rounded-full bg-[#1D1D1F] hover:bg-[#333336] text-white h-11 font-semibold shadow-sm flex items-center justify-center gap-2"
                        >
                          <UserPlus className="w-4 h-4" /> รับผู้เช่า
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
            </div>
          )}
        </div>
      </div>
      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800">แก้ไขห้องพัก</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-200 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>หมายเลขห้อง</Label>
                <Input value={editNumber} onChange={e => setEditNumber(e.target.value)} required className="rounded-xl h-11" />
              </div>
              <div className="space-y-2">
                <Label>ชั้น (ไม่บังคับ)</Label>
                <Input value={editFloor} onChange={e => setEditFloor(e.target.value)} className="rounded-xl h-11" />
              </div>
              <div className="space-y-2">
                <Label>ค่าเช่าพื้นฐาน (บาท/เดือน)</Label>
                <Input type="number" value={editRentPrice} onChange={e => setEditRentPrice(e.target.value)} required className="rounded-xl h-11" />
              </div>

              <div className="mt-6 space-y-4 border-t border-slate-100 py-4">
                <h3 className="text-md font-semibold text-slate-800">การจัดการสถานะและมิเตอร์ (MVP)</h3>
                
                {/* 1. เลือกสถานะห้อง */}
                <div className="space-y-2">
                  <Label>สถานะห้องพัก</Label>
                  <select 
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full rounded-xl h-11 bg-slate-50 border border-slate-200 focus:bg-white px-4 text-sm"
                  >
                    <option value="AVAILABLE">🟢 ว่าง (พร้อมปล่อยเช่า)</option>
                    <option value="OCCUPIED">🔵 มีผู้เช่า</option>
                    <option value="MAINTENANCE">🔴 ปรับปรุง / ซ่อมแซม</option>
                  </select>
                </div>

                {/* 2. มิเตอร์ตั้งต้น */}
                <div className="space-y-4 pt-2">
                  {/* ส่วนของมิเตอร์น้ำ */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                      💧 เลขมิเตอร์น้ำตั้งต้น <span className="text-xs font-normal text-slate-400">(หน่วย)</span>
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.1"
                        value={editWaterMeter}
                        onChange={(e) => setEditWaterMeter(e.target.value)}
                        className="w-full rounded-xl border-slate-200 bg-slate-50 pr-16 focus:ring-blue-500 focus:border-blue-500 h-11"
                        placeholder="กรอกตัวเลขหน่วยปัจจุบันบนมิเตอร์ เช่น 0.0"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-sm text-slate-400 font-medium">หน่วย</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">ค่าน้ำจะคำนวณจาก: (หน่วยเดือนนี้ - หน่วยตั้งต้น) × ราคาต่อหน่วย</p>
                  </div>

                  {/* ส่วนของมิเตอร์ไฟ */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                      ⚡ เลขมิเตอร์ไฟตั้งต้น <span className="text-xs font-normal text-slate-400">(หน่วย)</span>
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="1"
                        value={editElectricMeter}
                        onChange={(e) => setEditElectricMeter(e.target.value)}
                        className="w-full rounded-xl border-slate-200 bg-slate-50 pr-16 focus:ring-blue-500 focus:border-blue-500 h-11"
                        placeholder="กรอกตัวเลขหน่วยปัจจุบันบนมิเตอร์ เช่น 1250"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-sm text-slate-400 font-medium">หน่วย</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">ค่าไฟจะคำนวณจาก: (หน่วยเดือนนี้ - หน่วยตั้งต้น) × ราคาต่อหน่วย</p>
                  </div>
                </div>
                
                {/* 3. สิ่งอำนวยความสะดวก */}
                <div className="space-y-2 mt-4">
                  <Label>สิ่งอำนวยความสะดวก</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input type="checkbox" checked={editHasAircon} onChange={(e) => setEditHasAircon(e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                      แอร์
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input type="checkbox" checked={editHasFan} onChange={(e) => setEditHasFan(e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                      พัดลม
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input type="checkbox" checked={editHasFurniture} onChange={(e) => setEditHasFurniture(e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                      เฟอร์นิเจอร์
                    </label>
                  </div>
                </div>

                <p className="text-xs text-slate-500 mt-2">
                  *หมายเหตุ: เลขมิเตอร์ตั้งต้นจะถูกใช้เป็นฐานในการคำนวณบิลค่าเช่าในเดือนแรกที่ลูกบ้านย้ายเข้า
                </p>
              </div>
              
              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)} className="rounded-xl h-11 font-semibold text-slate-600 hover:bg-slate-100">
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={isEditing} className="rounded-xl h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 shadow-sm">
                  {isEditing ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
