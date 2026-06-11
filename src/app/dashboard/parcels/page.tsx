/* eslint-disable */
"use client";
import { toast } from "sonner";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/PageHeader";
import { Package } from "lucide-react";
import { jsonFetcher } from "@/lib/fetcher";

export default function ParcelsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  
  // Form State
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── SWR: parcels (cached, instant on revisit) ─────────────────────
  const { data: parcels = [], isLoading, mutate: mutateParcels } = useSWR<any[]>(
    "/api/parcels",
    jsonFetcher
  );

  // ── SWR: properties (OWNER only) ──────────────────────────────────
  const { data: properties = [] } = useSWR<any[]>(
    role === "OWNER" ? "/api/properties" : null,
    jsonFetcher
  );

  // ── SWR: rooms for selected property ─────────────────────────────
  const { data: rooms = [] } = useSWR<any[]>(
    selectedPropertyId ? `/api/rooms?propertyId=${selectedPropertyId}` : null,
    jsonFetcher
  );

  // Auto-select first property
  useEffect(() => {
    if (!selectedPropertyId && properties.length > 0) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId) return toast.error("กรุณาเลือกห้อง");

    setIsSubmitting(true);
    const res = await fetch("/api/parcels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackingNumber, recipientName, roomId }),
    });

    if (res.ok) {
      setTrackingNumber("");
      setRecipientName("");
      setRoomId("");
      mutateParcels();
      toast.success("บันทึกพัสดุสำเร็จ");
    } else {
      toast.error("เกิดข้อผิดพลาด");
    }
    setIsSubmitting(false);
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    const res = await fetch("/api/parcels", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });

    if (res.ok) {
      mutateParcels();
    }
  };

  return (
    <div>
      <PageHeader
        icon={Package}
        tone="orange"
        title="ระบบจัดการพัสดุ"
        subtitle={role === "OWNER" ? "บันทึกพัสดุที่เข้ามาและแจ้งลูกบ้านมารับ" : "ติดตามพัสดุของคุณที่หอพักรับไว้"}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {role === "OWNER" && (
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>บันทึกรับพัสดุใหม่</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>หอพัก/อพาร์ตเม้นท์</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
                      value={selectedPropertyId} onChange={e => setSelectedPropertyId(e.target.value)} required
                    >
                      <option value="">เลือกหอพัก</option>
                      {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>เลขห้องผู้รับ</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
                      value={roomId} onChange={e => setRoomId(e.target.value)} required
                    >
                      <option value="">เลือกห้อง</option>
                      {rooms.map(r => <option key={r.id} value={r.id}>{r.number}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>ชื่อผู้รับ (หน้ากล่อง)</Label>
                    <Input value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="เช่น สมชาย ใจดี" />
                  </div>
                  <div className="space-y-2">
                    <Label>เลขพัสดุ (Tracking No.)</Label>
                    <Input value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} placeholder="เช่น TH123456789" />
                  </div>
                  <Button type="submit" className="w-full rounded-full bg-[#ff9500] hover:brightness-105 text-white font-semibold shadow-[0_8px_18px_-6px_#ff9500] transition-all hover:-translate-y-0.5" disabled={isSubmitting}>
                    {isSubmitting ? "กำลังบันทึก..." : "บันทึกข้อมูลพัสดุ"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        <div className={role === "OWNER" ? "lg:col-span-2" : "lg:col-span-3"}>
          <Card>
            <CardHeader>
              <CardTitle>รายการพัสดุ</CardTitle>
            </CardHeader>
            <CardContent>
              {parcels.length === 0 && !isLoading ? (
                <div className="text-center py-10 px-4">
                  <img
                    src="/images/mascot/empty_parcels.png?v=2"
                    alt="ไม่มีพัสดุ"
                    className="w-32 h-32 mx-auto mb-4 jh-float-soft drop-shadow-[0_8px_16px_rgba(0,0,0,0.06)] object-contain"
                  />
                  <p className="font-bold text-slate-800 text-base">ไม่พบข้อมูลพัสดุในขณะนี้</p>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed max-w-sm mx-auto">
                    {role === "OWNER"
                      ? "ยังไม่มีการบันทึกรับพัสดุใหม่เข้ามาเลยค่ะ คุณสามารถเพิ่มรายการพัสดุใหม่ได้จากฟอร์มด้านซ้าย"
                      : "ขณะนี้ยังไม่มีพัสดุมาส่งถึงห้องของคุณเลยค่ะ หากมีพัสดุเข้ามาระบบจะแจ้งเตือนให้ทราบทันทีนะคะ 📦"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                      <tr>
                        {role === "OWNER" && <th className="px-4 py-3">ห้อง / หอพัก</th>}
                        <th className="px-4 py-3">ชื่อผู้รับ</th>
                        <th className="px-4 py-3">เลขพัสดุ</th>
                        <th className="px-4 py-3">วันที่รับของ</th>
                        <th className="px-4 py-3">สถานะ</th>
                        {role === "OWNER" && <th className="px-4 py-3 text-right">จัดการ</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading
                        ? Array.from({ length: 4 }).map((_, i) => (
                            <tr key={i} className="border-b animate-pulse">
                              {role === "OWNER" && <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>}
                              <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                              <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                              <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                              <td className="px-4 py-3"><Skeleton className="h-6 w-20 rounded-full" /></td>
                              {role === "OWNER" && <td className="px-4 py-3"><Skeleton className="h-8 w-20 ml-auto" /></td>}
                            </tr>
                          ))
                        : parcels.map(parcel => (
                        <tr key={parcel.id} className="border-b hover:bg-slate-50">
                          {role === "OWNER" && (
                            <td className="px-4 py-3 font-bold text-slate-700">
                              ห้อง {parcel.room?.number}
                              <div className="text-xs text-slate-400 font-normal">{parcel.room?.property?.name}</div>
                            </td>
                          )}
                          <td className="px-4 py-3">{parcel.recipientName || "-"}</td>
                          <td className="px-4 py-3 text-blue-600">{parcel.trackingNumber || "-"}</td>
                          <td className="px-4 py-3 text-slate-500">
                            {new Date(parcel.receivedAt).toLocaleString("th-TH")}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              parcel.status === "PICKED_UP" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                            }`}>
                              {parcel.status === "PICKED_UP" ? "รับของแล้ว" : "รอมารับ"}
                            </span>
                          </td>
                          {role === "OWNER" && (
                            <td className="px-4 py-3 text-right">
                              {parcel.status === "PENDING" && (
                                <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(parcel.id, "PICKED_UP")} className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200">
                                  มารับแล้ว
                                </Button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
