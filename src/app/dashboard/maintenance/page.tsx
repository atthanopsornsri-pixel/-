"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "next-auth/react";

export default function MaintenancePage() {
  const { data: session } = useSession();
  const [requests, setRequests] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const role = session?.user?.role;

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    const res = await fetch("/api/maintenance");
    if (res.ok) {
      const data = await res.json();
      setRequests(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
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

      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, imageUrl }),
      });

      if (res.ok) {
        setTitle("");
        setDescription("");
        setImageFile(null);
        fetchRequests();
        alert("แจ้งซ่อมสำเร็จ");
      } else {
        const data = await res.json();
        alert(data.message || "เกิดข้อผิดพลาด");
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาด");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    const res = await fetch("/api/maintenance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });

    if (res.ok) {
      fetchRequests();
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "PENDING") return <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-semibold">รอดำเนินการ</span>;
    if (status === "IN_PROGRESS") return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-semibold">กำลังแก้ไข</span>;
    if (status === "COMPLETED") return <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold">เรียบร้อย</span>;
    return null;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">ระบบแจ้งซ่อม</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {role === "TENANT" && (
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>แจ้งปัญหาใหม่</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>หัวข้อปัญหา</Label>
                    <Input value={title} onChange={e => setTitle(e.target.value)} required placeholder="เช่น แอร์ไม่เย็น, ท่อน้ำซึม" />
                  </div>
                  <div className="space-y-2">
                    <Label>รายละเอียด</Label>
                    <textarea 
                      className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
                      value={description} onChange={e => setDescription(e.target.value)} required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>แนบรูปภาพ (ถ้ามี)</Label>
                    <Input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} />
                  </div>
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                    {isSubmitting ? "กำลังส่ง..." : "ส่งเรื่องแจ้งซ่อม"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        <div className={role === "TENANT" ? "lg:col-span-2" : "lg:col-span-3"}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requests.map(req => (
              <Card key={req.id}>
                {req.imageUrl && (
                  <div className="h-40 w-full bg-slate-100 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={req.imageUrl} alt={req.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-lg text-slate-800">{req.title}</h3>
                      {role === "OWNER" && (
                        <p className="text-xs text-blue-600 font-medium">ห้อง {req.room?.number} ({req.room?.property?.name})</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">{new Date(req.createdAt).toLocaleString("th-TH")}</p>
                    </div>
                    {getStatusBadge(req.status)}
                  </div>
                  <p className="text-sm text-slate-600 my-3 whitespace-pre-wrap">{req.description}</p>
                  
                  {role === "OWNER" && req.status !== "COMPLETED" && (
                    <div className="pt-3 border-t border-slate-100 flex gap-2">
                      {req.status === "PENDING" && (
                        <Button size="sm" variant="outline" className="w-full" onClick={() => handleUpdateStatus(req.id, "IN_PROGRESS")}>รับเรื่อง/กำลังซ่อม</Button>
                      )}
                      <Button size="sm" className="w-full bg-green-600 hover:bg-green-700" onClick={() => handleUpdateStatus(req.id, "COMPLETED")}>ซ่อมเสร็จสิ้น</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {requests.length === 0 && (
              <div className="col-span-full text-center py-12 text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                ไม่มีประวัติการแจ้งซ่อม
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
