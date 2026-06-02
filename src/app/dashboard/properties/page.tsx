"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";

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

    const res = await fetch("/api/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, address, imageUrl }),
    });

    if (res.ok) {
      setName("");
      setAddress("");
      setImageFile(null);
      fetchProperties();
      router.refresh();
    }
    
    setIsUploading(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">จัดการหอพัก/อพาร์ตเม้นท์</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add Property Form */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>เพิ่มหอพักใหม่</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">ชื่อหอพัก</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">ที่อยู่/รายละเอียด</Label>
                  <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="image">ภาพปกหอพัก (อัปโหลด)</Label>
                  <Input id="image" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                </div>
                <Button type="submit" className="w-full" disabled={isUploading}>
                  {isUploading ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Property List */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {properties.map((prop) => (
              <Card key={prop.id} className="overflow-hidden">
                {prop.imageUrl ? (
                  <div className="h-48 w-full bg-slate-200 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={prop.imageUrl} alt={prop.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="h-48 w-full bg-slate-100 flex items-center justify-center text-slate-400">
                    ไม่มีรูปภาพ
                  </div>
                )}
                <CardContent className="p-4">
                  <h3 className="font-bold text-lg mb-1">{prop.name}</h3>
                  <p className="text-slate-500 text-sm mb-3 line-clamp-2">{prop.address}</p>
                  <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md font-medium">
                        {prop._count?.rooms || 0} ห้องพัก
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="default" size="sm" onClick={() => router.push(`/dashboard/rooms?propertyId=${prop.id}`)}>
                        จัดการห้อง
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/properties/${prop.id}/lease-settings`)}>
                        สัญญาเช่า
                      </Button>
                      <a href={`/p/${prop.id}`} target="_blank" rel="noreferrer" className="flex-1">
                        <Button variant="outline" size="sm" className="w-full text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200">
                          ดูหน้าโปรโมทหอพัก
                        </Button>
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {properties.length === 0 && (
              <div className="col-span-2 text-center py-12 text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                ยังไม่มีข้อมูลหอพัก ลองเพิ่มหอพักแรกของคุณทางด้านซ้ายดูสิ
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
