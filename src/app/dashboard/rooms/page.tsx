"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSearchParams } from "next/navigation";

export default function RoomsPage() {
  const searchParams = useSearchParams();
  const propertyIdParam = searchParams.get("propertyId");

  const [rooms, setRooms] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  
  const [propertyId, setPropertyId] = useState(propertyIdParam || "");
  const [number, setNumber] = useState("");
  const [floor, setFloor] = useState("");
  const [rentPrice, setRentPrice] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchProperties();
    fetchRooms(propertyIdParam || undefined);
  }, [propertyIdParam]);

  const fetchProperties = async () => {
    const res = await fetch("/api/properties");
    if (res.ok) {
      const data = await res.json();
      setProperties(data);
      if (!propertyId && data.length > 0 && !propertyIdParam) {
        setPropertyId(data[0].id);
      }
    }
  };

  const fetchRooms = async (propId?: string) => {
    let url = "/api/rooms";
    if (propId) url += `?propertyId=${propId}`;
    else if (propertyId) url += `?propertyId=${propertyId}`;

    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setRooms(data);
    }
  };

  const handlePropertyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPropId = e.target.value;
    setPropertyId(newPropId);
    fetchRooms(newPropId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId) return alert("กรุณาเลือกหอพักก่อนเพิ่มห้อง");
    setIsUploading(true);

    let imageUrl = "";
    if (imageFile) {
      const formData = new FormData();
      formData.append("file", imageFile);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        imageUrl = uploadData.url;
      }
    }

    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId, number, floor, rentPrice, imageUrl }),
    });

    if (res.ok) {
      setNumber("");
      setFloor("");
      setRentPrice("");
      setImageFile(null);
      fetchRooms(propertyId);
    }
    
    setIsUploading(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <h1 className="text-3xl md:text-4xl font-extrabold text-[#1D1D1F] tracking-tight">
          จัดการห้องพัก
        </h1>
        {properties.length > 0 && (
          <select 
            className="rounded-2xl h-11 bg-white border border-slate-200 focus:bg-white px-4 shadow-[0_2px_10px_rgb(0,0,0,0.02)] text-slate-700 font-medium cursor-pointer hover:border-slate-300 transition-colors"
            value={propertyId}
            onChange={handlePropertyChange}
          >
            <option value="">-- ดูห้องทั้งหมด --</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add Room Form */}
        <div className="lg:col-span-1">
          <div className="bg-white p-8 rounded-[32px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 sticky top-28">
            <div className="w-12 h-12 bg-[#E8F8F5] text-[#34C759] rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </div>
            <h2 className="text-xl font-bold text-[#1D1D1F] mb-6">เพิ่มห้องใหม่</h2>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-slate-600 font-medium ml-1">หอพัก/อพาร์ตเม้นท์</Label>
                <select 
                  className="w-full rounded-2xl h-12 bg-slate-50 border-slate-200 focus:bg-white px-4 text-slate-700 disabled:opacity-50"
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  required
                >
                  <option value="" disabled>เลือกหอพัก</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="number" className="text-slate-600 font-medium ml-1">หมายเลขห้อง</Label>
                  <Input 
                    id="number" 
                    value={number} 
                    onChange={(e) => setNumber(e.target.value)} 
                    required 
                    className="rounded-2xl h-12 bg-slate-50 border-slate-200 focus:bg-white px-4"
                    placeholder="เช่น 101"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="floor" className="text-slate-600 font-medium ml-1">ชั้น</Label>
                  <Input 
                    id="floor" 
                    value={floor} 
                    onChange={(e) => setFloor(e.target.value)} 
                    className="rounded-2xl h-12 bg-slate-50 border-slate-200 focus:bg-white px-4"
                    placeholder="เช่น 1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rentPrice" className="text-slate-600 font-medium ml-1">ค่าเช่าพื้นฐาน (บาท/เดือน)</Label>
                <Input 
                  id="rentPrice" 
                  type="number" 
                  value={rentPrice} 
                  onChange={(e) => setRentPrice(e.target.value)} 
                  required 
                  className="rounded-2xl h-12 bg-slate-50 border-slate-200 focus:bg-white px-4"
                  placeholder="เช่น 4500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="image" className="text-slate-600 font-medium ml-1">ภาพถ่ายห้อง (อัปโหลด)</Label>
                <div className="relative">
                  <Input 
                    id="image" 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)} 
                    className="rounded-2xl h-12 bg-slate-50 border-slate-200 focus:bg-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full rounded-full h-12 bg-[#34C759] hover:bg-[#2DB34D] text-white font-semibold shadow-md mt-4 transition-all hover:-translate-y-0.5" 
                disabled={isUploading || properties.length === 0}
              >
                {isUploading ? "กำลังบันทึก..." : "เพิ่มห้องพัก"}
              </Button>
            </form>
          </div>
        </div>

        {/* Room List */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {rooms.map((room) => (
              <div key={room.id} className="bg-white rounded-[32px] overflow-hidden shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 group transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 flex flex-col">
                {room.imageUrl ? (
                  <div className="h-40 w-full bg-slate-200 relative overflow-hidden shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={room.imageUrl} alt={`Room ${room.number}`} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" />
                  </div>
                ) : (
                  <div className="h-3 w-full bg-[#007AFF]"></div>
                )}
                
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-extrabold text-2xl text-[#1D1D1F]">ห้อง {room.number}</h3>
                      <p className="text-sm font-medium text-slate-500 mt-1">{room.property.name} • ชั้น {room.floor || "-"}</p>
                    </div>
                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wide ${
                      room.status === "AVAILABLE" ? "bg-[#E8F8F5] text-[#34C759] border border-[#34C759]/20" :
                      room.status === "OCCUPIED" ? "bg-[#E8F2FF] text-[#007AFF] border border-[#007AFF]/20" : "bg-red-50 text-red-600 border border-red-200"
                    }`}>
                      {room.status === "AVAILABLE" ? "ห้องว่าง" : room.status === "OCCUPIED" ? "มีผู้เช่า" : "ปรับปรุง"}
                    </span>
                  </div>

                  {room.inviteCode && (
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-4 flex justify-between items-center group-hover:bg-blue-50/50 transition-colors">
                      <span className="text-xs font-medium text-slate-500">รหัสเชิญผู้เช่า (Invite Code)</span>
                      <span className="font-mono text-sm font-bold text-[#007AFF] bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm">{room.inviteCode}</span>
                    </div>
                  )}
                  
                  <div className="text-xl font-extrabold text-[#1D1D1F] my-2 mb-6">
                    ฿{room.rentPrice.toLocaleString()}<span className="text-sm font-medium text-slate-400">/เดือน</span>
                  </div>
                  
                  <div className="mt-auto flex gap-3">
                    <Button variant="outline" className="flex-1 rounded-full border-slate-200 text-slate-600 hover:bg-slate-50 h-11 font-semibold">
                      แก้ไข
                    </Button>
                    {room.status === "AVAILABLE" && (
                      <Button className="flex-1 rounded-full bg-[#1D1D1F] hover:bg-[#333336] text-white h-11 font-semibold shadow-sm">
                        รับผู้เช่า
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {rooms.length === 0 && (
              <div className="md:col-span-2 text-center py-16 bg-white rounded-[32px] border border-dashed border-slate-300">
                <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </div>
                <h3 className="text-lg font-bold text-[#1D1D1F] mb-1">ยังไม่มีข้อมูลห้องพัก</h3>
                <p className="text-slate-500">เริ่มเพิ่มห้องพักแรกของคุณทางด้านซ้าย</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
