"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";

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

export default function PropertiesPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    const res = await fetch("/api/properties");
    if (res.ok) {
      const data = await res.json();
      setProperties(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      let imageUrl = "";

      if (imageFile) {
        imageUrl = await compressImage(imageFile);
      }

      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address, imageUrl }),
      });

      if (res.ok) {
        setName("");
        setAddress("");
        setImageFile(null);
        (document.getElementById("image") as HTMLInputElement).value = "";
        fetchProperties();
        router.refresh();
      } else {
        alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      }
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ");
    }
    
    setIsUploading(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-3xl md:text-4xl font-extrabold text-[#1D1D1F] tracking-tight">
          จัดการหอพักและอพาร์ตเม้นท์
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add Property Form */}
        <div className="lg:col-span-1">
          <div className="bg-white p-8 rounded-[32px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 sticky top-28">
            <div className="w-12 h-12 bg-[#E8F2FF] text-[#007AFF] rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </div>
            <h2 className="text-xl font-bold text-[#1D1D1F] mb-6">เพิ่มหอพักใหม่</h2>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-600 font-medium ml-1">ชื่อหอพัก</Label>
                <Input 
                  id="name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                  className="rounded-2xl h-12 bg-slate-50 border-slate-200 focus:bg-white px-4"
                  placeholder="เช่น อพาร์ตเม้นท์สุขสันต์"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address" className="text-slate-600 font-medium ml-1">ที่อยู่/รายละเอียด</Label>
                <Input 
                  id="address" 
                  value={address} 
                  onChange={(e) => setAddress(e.target.value)} 
                  required 
                  className="rounded-2xl h-12 bg-slate-50 border-slate-200 focus:bg-white px-4"
                  placeholder="เขต/อำเภอ หรือจุดสังเกต"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="image" className="text-slate-600 font-medium ml-1">ภาพปกหอพัก</Label>
                <div className="relative">
                  <Input 
                    id="image" 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)} 
                    className="rounded-2xl h-12 bg-slate-50 border-slate-200 focus:bg-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full rounded-full h-12 bg-[#007AFF] hover:bg-[#0066CC] text-white font-semibold shadow-md mt-4 transition-all hover:-translate-y-0.5" 
                disabled={isUploading}
              >
                {isUploading ? "กำลังบันทึก..." : "เพิ่มหอพัก"}
              </Button>
            </form>
          </div>
        </div>

        {/* Property List */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {properties.map((prop) => (
              <div key={prop.id} className="bg-white rounded-[32px] overflow-hidden shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 group transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 flex flex-col">
                {prop.imageUrl ? (
                  <div className="h-48 w-full bg-slate-200 relative overflow-hidden shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={prop.imageUrl} alt={prop.name} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" />
                  </div>
                ) : (
                  <div className="h-48 w-full bg-slate-50 flex flex-col items-center justify-center text-slate-400 group-hover:bg-blue-50/50 transition-colors shrink-0">
                    <svg className="w-12 h-12 mb-2 text-slate-300 group-hover:text-blue-200 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    <span className="text-sm font-medium">ไม่มีรูปภาพ</span>
                  </div>
                )}
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="font-extrabold text-xl mb-1 text-[#1D1D1F] group-hover:text-[#007AFF] transition-colors">{prop.name}</h3>
                  <p className="text-slate-500 text-sm mb-4 line-clamp-2">{prop.address}</p>
                  
                  <div className="inline-flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full mb-6 border border-slate-100 w-fit">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-sm font-semibold text-slate-600">
                      {prop._count?.rooms || 0} ห้องพักในระบบ
                    </span>
                  </div>

                  <div className="flex flex-col gap-3 mt-auto">
                    <Button 
                      onClick={() => router.push(`/dashboard/rooms?propertyId=${prop.id}`)}
                      className="w-full rounded-full bg-[#1D1D1F] hover:bg-[#333336] text-white font-semibold shadow-sm h-11"
                    >
                      จัดการห้องพัก
                    </Button>
                    <div className="grid grid-cols-2 gap-3">
                      <Button variant="outline" className="rounded-full border-slate-200 text-slate-600 hover:bg-slate-50 h-11" onClick={() => router.push(`/dashboard/properties/${prop.id}/lease-settings`)}>
                        สัญญาเช่า
                      </Button>
                      <a href={`/p/${prop.id}`} target="_blank" rel="noreferrer" className="flex-1">
                        <Button variant="outline" className="w-full rounded-full border-[#E8F2FF] text-[#007AFF] bg-[#F4F9FF] hover:bg-[#E8F2FF] transition-colors h-11">
                          หน้าโปรโมท
                        </Button>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {properties.length === 0 && (
              <div className="md:col-span-2 text-center py-16 bg-white rounded-[32px] border border-dashed border-slate-300">
                <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </div>
                <h3 className="text-lg font-bold text-[#1D1D1F] mb-1">ยังไม่มีข้อมูลหอพัก</h3>
                <p className="text-slate-500">เริ่มเพิ่มหอพักแรกของคุณทางด้านซ้ายเพื่อเริ่มต้นใช้งานระบบ</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
