"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">จัดการห้องพัก</h1>
        {properties.length > 0 && (
          <select 
            className="border-slate-300 rounded-md shadow-sm p-2 bg-white"
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
          <Card>
            <CardHeader>
              <CardTitle>เพิ่มห้องใหม่</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>หอพัก/อพาร์ตเม้นท์</Label>
                  <select 
                    className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                    <Label htmlFor="number">หมายเลขห้อง</Label>
                    <Input id="number" value={number} onChange={(e) => setNumber(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="floor">ชั้น</Label>
                    <Input id="floor" value={floor} onChange={(e) => setFloor(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rentPrice">ค่าเช่าพื้นฐาน (บาท/เดือน)</Label>
                  <Input id="rentPrice" type="number" value={rentPrice} onChange={(e) => setRentPrice(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="image">ภาพถ่ายห้อง (อัปโหลด)</Label>
                  <Input id="image" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                </div>
                <Button type="submit" className="w-full" disabled={isUploading || properties.length === 0}>
                  {isUploading ? "กำลังบันทึก..." : "เพิ่มห้องพัก"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Room List */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {rooms.map((room) => (
              <Card key={room.id} className="overflow-hidden flex flex-col">
                {room.imageUrl ? (
                  <div className="h-32 w-full bg-slate-200 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={room.imageUrl} alt={`Room ${room.number}`} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="h-2 w-full bg-blue-500"></div>
                )}
                <CardContent className="p-4 flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-xl text-slate-800">ห้อง {room.number}</h3>
                      <p className="text-xs text-slate-500">{room.property.name} • ชั้น {room.floor || "-"}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      room.status === "AVAILABLE" ? "bg-green-100 text-green-700" :
                      room.status === "OCCUPIED" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"
                    }`}>
                      {room.status === "AVAILABLE" ? "ว่าง" : room.status === "OCCUPIED" ? "มีผู้เช่า" : "ปรับปรุง"}
                    </span>
                  </div>
                  {room.inviteCode && (
                    <div className="bg-slate-50 p-2 rounded border border-slate-200 mt-2 mb-1 flex justify-between items-center">
                      <span className="text-xs text-slate-500">รหัสเชิญ (Invite Code):</span>
                      <span className="font-mono text-sm font-bold text-blue-600 tracking-wider">{room.inviteCode}</span>
                    </div>
                  )}
                  <div className="text-lg font-medium text-slate-700 my-2">
                    ฿{room.rentPrice.toLocaleString()}<span className="text-sm font-normal text-slate-500">/เดือน</span>
                  </div>
                  <div className="mt-auto pt-2 border-t border-slate-100 flex gap-2">
                    <Button variant="outline" size="sm" className="w-full text-xs">แก้ไข</Button>
                    {room.status === "AVAILABLE" && (
                      <Button size="sm" className="w-full text-xs">รับผู้เช่า</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {rooms.length === 0 && (
              <div className="col-span-1 md:col-span-2 xl:col-span-3 text-center py-12 text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                ยังไม่มีข้อมูลห้องพัก โปรดเพิ่มห้องพักใหม่ทางด้านซ้าย
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
