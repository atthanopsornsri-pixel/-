/* eslint-disable */
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "next-auth/react";

export default function ParcelsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  
  const [parcels, setParcels] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  
  // Form State
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchParcels();
    if (role === "OWNER") {
      fetchProperties();
    }
  }, [role]);

  useEffect(() => {
    if (selectedPropertyId) {
      fetchRooms(selectedPropertyId);
    } else {
      setRooms([]);
    }
  }, [selectedPropertyId]);

  async function fetchParcels() {
    const res = await fetch("/api/parcels");
    if (res.ok) {
      setParcels(await res.json());
    }
  };

  async function fetchProperties() {
    const res = await fetch("/api/properties");
    if (res.ok) {
      const data = await res.json();
      setProperties(data);
      if (data.length > 0) setSelectedPropertyId(data[0].id);
    }
  };

  async function fetchRooms(propId: string) {
    const res = await fetch(`/api/rooms?propertyId=${propId}`);
    if (res.ok) {
      setRooms(await res.json());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId) return alert("กรุณาเลือกห้อง");

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
      fetchParcels();
      alert("บันทึกพัสดุสำเร็จ");
    } else {
      alert("เกิดข้อผิดพลาด");
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
      fetchParcels();
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">ระบบจัดการพัสดุ</h1>

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
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={isSubmitting}>
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
                    {parcels.map(parcel => (
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
                    {parcels.length === 0 && (
                      <tr>
                        <td colSpan={role === "OWNER" ? 6 : 4} className="px-4 py-8 text-center text-slate-500">
                          ไม่มีข้อมูลพัสดุ
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
