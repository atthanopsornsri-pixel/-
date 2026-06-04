"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSearchParams } from "next/navigation";

// Utility to compress image natively
const compressImage = (file: File, maxWidth = 1000): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Compress to JPEG with 0.7 quality
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export default function RoomsPage() {
  const searchParams = useSearchParams();
  const propertyIdParam = searchParams.get("propertyId");

  const [rooms, setRooms] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  
  const [propertyId, setPropertyId] = useState(propertyIdParam || "");
  const [number, setNumber] = useState("");
  const [floor, setFloor] = useState("");
  const [rentPrice, setRentPrice] = useState("");
  
  // Specific image fields
  const [fileMain, setFileMain] = useState<File | null>(null);
  const [fileBathroom, setFileBathroom] = useState<File | null>(null);
  const [fileBalcony, setFileBalcony] = useState<File | null>(null);
  const [fileFacility, setFileFacility] = useState<File | null>(null);

  const [isUploading, setIsUploading] = useState(false);

  // Edit states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [editNumber, setEditNumber] = useState("");
  const [editFloor, setEditFloor] = useState("");
  const [editRentPrice, setEditRentPrice] = useState("");
  const [isEditing, setIsEditing] = useState(false);

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

    try {
      let imageMain = "";
      let imageBathroom = "";
      let imageBalcony = "";
      let imageFacility = "";

      if (fileMain) imageMain = await compressImage(fileMain);
      if (fileBathroom) imageBathroom = await compressImage(fileBathroom);
      if (fileBalcony) imageBalcony = await compressImage(fileBalcony);
      if (fileFacility) imageFacility = await compressImage(fileFacility);

      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          propertyId, 
          number, 
          floor, 
          rentPrice,
          imageMain,
          imageBathroom,
          imageBalcony,
          imageFacility
        }),
      });

      if (res.ok) {
        setNumber("");
        setFloor("");
        setRentPrice("");
        setFileMain(null);
        setFileBathroom(null);
        setFileBalcony(null);
        setFileFacility(null);
        
        // Reset file inputs manually
        (document.getElementById("imageMain") as HTMLInputElement).value = "";
        (document.getElementById("imageBathroom") as HTMLInputElement).value = "";
        (document.getElementById("imageBalcony") as HTMLInputElement).value = "";
        (document.getElementById("imageFacility") as HTMLInputElement).value = "";

        fetchRooms(propertyId);
      } else {
        alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      }
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ");
    }
    
    setIsUploading(false);
  };

  const openEditModal = (room: any) => {
    setEditingRoom(room);
    setEditNumber(room.number);
    setEditFloor(room.floor || "");
    setEditRentPrice(room.rentPrice.toString());
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;

    setIsEditing(true);
    try {
      const res = await fetch(`/api/rooms/${editingRoom.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: editNumber,
          floor: editFloor,
          rentPrice: editRentPrice
        }),
      });

      if (res.ok) {
        setIsEditModalOpen(false);
        fetchRooms(propertyId);
      } else {
        alert("เกิดข้อผิดพลาดในการแก้ไขข้อมูล");
      }
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsEditing(false);
    }
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

              <div className="pt-4 border-t border-slate-100">
                <h3 className="font-semibold text-slate-800 mb-4">รูปภาพบังคับ (4 มุม)</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="imageMain" className="text-xs text-slate-500 font-medium ml-1">1. ภาพรวมห้อง</Label>
                    <Input id="imageMain" type="file" accept="image/*" onChange={(e) => setFileMain(e.target.files?.[0] || null)} className="text-xs rounded-xl h-9 bg-slate-50 border-slate-200 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-emerald-50 file:text-emerald-700 px-2 cursor-pointer" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="imageBathroom" className="text-xs text-slate-500 font-medium ml-1">2. ภาพห้องน้ำ</Label>
                    <Input id="imageBathroom" type="file" accept="image/*" onChange={(e) => setFileBathroom(e.target.files?.[0] || null)} className="text-xs rounded-xl h-9 bg-slate-50 border-slate-200 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-blue-50 file:text-blue-700 px-2 cursor-pointer" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="imageBalcony" className="text-xs text-slate-500 font-medium ml-1">3. ภาพระเบียง/วิว</Label>
                    <Input id="imageBalcony" type="file" accept="image/*" onChange={(e) => setFileBalcony(e.target.files?.[0] || null)} className="text-xs rounded-xl h-9 bg-slate-50 border-slate-200 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-amber-50 file:text-amber-700 px-2 cursor-pointer" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="imageFacility" className="text-xs text-slate-500 font-medium ml-1">4. สิ่งอำนวยความสะดวก</Label>
                    <Input id="imageFacility" type="file" accept="image/*" onChange={(e) => setFileFacility(e.target.files?.[0] || null)} className="text-xs rounded-xl h-9 bg-slate-50 border-slate-200 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-purple-50 file:text-purple-700 px-2 cursor-pointer" required />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-3 text-center">* ระบบจะทำการย่อขนาดภาพอัตโนมัติเพื่อประหยัดพื้นที่เซิร์ฟเวอร์</p>
              </div>

              <Button 
                type="submit" 
                className="w-full rounded-full h-12 bg-[#34C759] hover:bg-[#2DB34D] text-white font-semibold shadow-md mt-4 transition-all hover:-translate-y-0.5" 
                disabled={isUploading || properties.length === 0}
              >
                {isUploading ? "กำลังบีบอัดและบันทึกรูปภาพ..." : "เพิ่มห้องพัก"}
              </Button>
            </form>
          </div>
        </div>

        {/* Room List */}
        <div className="lg:col-span-2">
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
                    </div>
                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wide ${
                      room.status === "AVAILABLE" ? "bg-[#E8F8F5] text-[#34C759] border border-[#34C759]/20" :
                      room.status === "OCCUPIED" ? "bg-[#E8F2FF] text-[#007AFF] border border-[#007AFF]/20" : "bg-red-50 text-red-600 border border-red-200"
                    }`}>
                      {room.status === "AVAILABLE" ? "ห้องว่าง" : room.status === "OCCUPIED" ? "มีผู้เช่า" : "ปรับปรุง"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 mb-4">
                    <div className={`w-2 h-2 rounded-full ${room.imageMain ? "bg-emerald-400" : "bg-slate-200"}`}></div>
                    <div className={`w-2 h-2 rounded-full ${room.imageBathroom ? "bg-emerald-400" : "bg-slate-200"}`}></div>
                    <div className={`w-2 h-2 rounded-full ${room.imageBalcony ? "bg-emerald-400" : "bg-slate-200"}`}></div>
                    <div className={`w-2 h-2 rounded-full ${room.imageFacility ? "bg-emerald-400" : "bg-slate-200"}`}></div>
                    <span className="text-[10px] text-slate-400 ml-1">
                      {[room.imageMain, room.imageBathroom, room.imageBalcony, room.imageFacility].filter(Boolean).length}/4 ภาพ
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
                    <Button variant="outline" className="flex-1 rounded-full border-slate-200 text-slate-600 hover:bg-slate-50 h-11 font-semibold" onClick={() => openEditModal(room)}>
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
