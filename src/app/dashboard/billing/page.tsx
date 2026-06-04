"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BillingPage() {
  const [bills, setBills] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  
  const [propertyId, setPropertyId] = useState("");
  const [roomId, setRoomId] = useState("");
  
  // Bill form state
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [dueDate, setDueDate] = useState("");
  const [rentAmount, setRentAmount] = useState("");
  const [waterUnits, setWaterUnits] = useState("");
  const [waterAmount, setWaterAmount] = useState("");
  const [electricUnits, setElectricUnits] = useState("");
  const [electricAmount, setElectricAmount] = useState("");
  const [commonFee, setCommonFee] = useState("");
  const [parkingFee, setParkingFee] = useState("");
  const [internetFee, setInternetFee] = useState("");
  const [otherFee, setOtherFee] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<any>(null);

  useEffect(() => {
    fetchProperties();
    fetchBills();
  }, []);

  async function fetchProperties() {
    const res = await fetch("/api/properties");
    if (res.ok) {
      const data = await res.json();
      setProperties(data);
    }
  };

  async function fetchRooms(propId: string) {
    const res = await fetch(`/api/rooms?propertyId=${propId}`);
    if (res.ok) {
      const data = await res.json();
      setRooms(data);
    }
  };

  async function fetchBills() {
    const res = await fetch("/api/bills");
    if (res.ok) {
      const data = await res.json();
      setBills(data);
    }
  };

  const handlePropertyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = e.target.value;
    setPropertyId(pId);
    setRoomId("");
    if (pId) fetchRooms(pId);
    else setRooms([]);
  };

  const handleRoomChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const rId = e.target.value;
    setRoomId(rId);
    
    // Auto fill rent price if room is selected
    const room = rooms.find(r => r.id === rId);
    if (room) {
      setRentAmount(room.rentPrice.toString());
    }

    // Auto fill default fees from property
    const prop = properties.find(p => p.id === propertyId);
    if (prop) {
      if (prop.defaultCommonFee) setCommonFee(prop.defaultCommonFee.toString());
      else setCommonFee("");
      
      if (prop.defaultParkingFee) setParkingFee(prop.defaultParkingFee.toString());
      else setParkingFee("");
      
      if (prop.defaultInternetFee) setInternetFee(prop.defaultInternetFee.toString());
      else setInternetFee("");
    }
  };

  const handleWaterUnitsChange = (val: string) => {
    setWaterUnits(val);
    const prop = properties.find(p => p.id === propertyId);
    if (prop && prop.waterRate && val) {
      const units = parseFloat(val);
      if (!isNaN(units)) {
        setWaterAmount((units * prop.waterRate).toString());
      } else {
        setWaterAmount("");
      }
    } else {
      setWaterAmount("");
    }
  };

  const handleElectricUnitsChange = (val: string) => {
    setElectricUnits(val);
    const prop = properties.find(p => p.id === propertyId);
    if (prop && prop.electricRate && val) {
      const units = parseFloat(val);
      if (!isNaN(units)) {
        setElectricAmount((units * prop.electricRate).toString());
      } else {
        setElectricAmount("");
      }
    } else {
      setElectricAmount("");
    }
  };

  const calculateTotal = () => {
    return (
      (parseFloat(rentAmount) || 0) +
      (parseFloat(waterAmount) || 0) +
      (parseFloat(electricAmount) || 0) +
      (parseFloat(commonFee) || 0) +
      (parseFloat(parkingFee) || 0) +
      (parseFloat(internetFee) || 0) +
      (parseFloat(otherFee) || 0)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId) return alert("กรุณาเลือกห้องพัก");
    setIsLoading(true);

    const res = await fetch("/api/bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId, month, year, dueDate,
        rentAmount, waterUnits, waterAmount, electricUnits, electricAmount,
        commonFee, parkingFee, internetFee, otherFee
      }),
    });

    if (res.ok) {
      alert("สร้างบิลสำเร็จ");
      fetchBills();
      // Reset some fields
      setWaterUnits(""); setWaterAmount("");
      setElectricUnits(""); setElectricAmount("");
    } else {
      const data = await res.json();
      alert(data.message || "เกิดข้อผิดพลาด");
    }
    
    setIsLoading(false);
  };

  const handleApproveSlip = async (billId: string) => {
    try {
      const res = await fetch(`/api/bills/${billId}/approve`, {
        method: "PATCH",
      });
      if (res.ok) {
        alert("อนุมัติบิลสำเร็จ! สถานะเปลี่ยนเป็นชำระแล้ว");
        setSelectedSlip(null);
        fetchBills();
      } else {
        alert("เกิดข้อผิดพลาดในการอนุมัติ");
      }
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">จัดการบิลค่าเช่า & ค่าน้ำไฟ</h1>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Create Bill Form */}
        <div className="xl:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>สร้างบิลใหม่</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>อพาร์ตเม้นท์</Label>
                    <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" value={propertyId} onChange={handlePropertyChange} required>
                      <option value="" disabled>เลือกอพาร์ตเม้นท์</option>
                      {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>ห้องพัก</Label>
                    <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" value={roomId} onChange={handleRoomChange} required disabled={!propertyId}>
                      <option value="" disabled>เลือกห้อง</option>
                      {rooms.map(r => <option key={r.id} value={r.id}>{r.number} {r.status === "OCCUPIED" ? "(มีผู้เช่า)" : ""}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>ประจำเดือน</Label>
                    <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" value={month} onChange={e => setMonth(Number(e.target.value))}>
                      {[...Array(12)].map((_, i) => <option key={i} value={i+1}>{i+1}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>ปี</Label>
                    <Input type="number" value={year} onChange={e => setYear(Number(e.target.value))} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>กำหนดชำระ</Label>
                  <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
                </div>

                <div className="bg-slate-50 p-4 rounded-lg space-y-4 border border-slate-200">
                  <div className="space-y-2">
                    <Label>ค่าเช่าห้อง (บาท)</Label>
                    <Input type="number" value={rentAmount} onChange={e => setRentAmount(e.target.value)} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>ค่าน้ำ (หน่วย)</Label>
                      <Input type="number" step="0.1" value={waterUnits} onChange={e => handleWaterUnitsChange(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>รวมค่าน้ำ (บาท)</Label>
                      <Input type="number" value={waterAmount} onChange={e => setWaterAmount(e.target.value)} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>ค่าไฟ (หน่วย)</Label>
                      <Input type="number" step="0.1" value={electricUnits} onChange={e => handleElectricUnitsChange(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>รวมค่าไฟ (บาท)</Label>
                      <Input type="number" value={electricAmount} onChange={e => setElectricAmount(e.target.value)} required />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg space-y-4 border border-slate-200">
                  <p className="font-semibold text-sm text-slate-700">ค่าบริการอื่นๆ (ถ้ามี)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>ค่าส่วนกลาง</Label>
                      <Input type="number" value={commonFee} onChange={e => setCommonFee(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>ค่าที่จอดรถ</Label>
                      <Input type="number" value={parkingFee} onChange={e => setParkingFee(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>ค่าอินเทอร์เน็ต</Label>
                      <Input type="number" value={internetFee} onChange={e => setInternetFee(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>อื่นๆ (ค่าปรับ ฯลฯ)</Label>
                      <Input type="number" value={otherFee} onChange={e => setOtherFee(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 flex justify-between items-center">
                  <span className="font-bold text-slate-700">ยอดรวมทั้งสิ้น</span>
                  <span className="text-2xl font-black text-blue-700">฿ {calculateTotal().toLocaleString()}</span>
                </div>

                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                  {isLoading ? "กำลังบันทึก..." : "ออกใบแจ้งหนี้"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Bills List */}
        <div className="xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>รายการบิลทั้งหมด</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                    <tr>
                      <th className="px-4 py-3">ห้อง</th>
                      <th className="px-4 py-3">รอบบิล</th>
                      <th className="px-4 py-3">ยอดรวม (บาท)</th>
                      <th className="px-4 py-3">สถานะ</th>
                      <th className="px-4 py-3 text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.map(bill => (
                      <tr key={bill.id} className="border-b hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium">
                          {bill.room.number}
                          <div className="text-xs text-slate-400">{bill.room.property.name}</div>
                        </td>
                        <td className="px-4 py-3">{bill.month}/{bill.year}</td>
                        <td className="px-4 py-3 font-bold text-blue-600">฿{bill.totalAmount.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            bill.status === "PAID" ? "bg-green-100 text-green-700" :
                            bill.status === "PENDING" ? "bg-orange-100 text-orange-700 animate-pulse" :
                            bill.status === "UNPAID" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                          }`}>
                            {bill.status === "PENDING" ? "รอตรวจสอบ" : bill.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          {bill.status === "PENDING" && (
                            <Button variant="default" size="sm" className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => setSelectedSlip(bill)}>
                              ตรวจสอบสลิป
                            </Button>
                          )}
                          <Button variant="outline" size="sm" onClick={() => window.open(`/dashboard/billing/${bill.id}/print`, '_blank')}>
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                            พิมพ์
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {bills.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                          ยังไม่มีข้อมูลบิลในระบบ
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

      {/* Verify Slip Modal */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-[#1D1D1F]">ตรวจสอบหลักฐานการโอนเงิน</h3>
              <button onClick={() => setSelectedSlip(null)} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shadow-sm border border-slate-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-4 flex-1 overflow-auto bg-slate-100/50 flex flex-col items-center">
              <div className="w-full bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-4">
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-slate-500">ห้องพัก:</span>
                  <span className="font-bold text-slate-800">{selectedSlip.room.number}</span>
                </div>
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-slate-500">ยอดที่ต้องชำระ:</span>
                  <span className="font-bold text-blue-600">฿{selectedSlip.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">เวลาที่ส่งสลิป:</span>
                  <span className="text-slate-700">{selectedSlip.paymentDate ? new Date(selectedSlip.paymentDate).toLocaleString("th-TH") : "-"}</span>
                </div>
              </div>

              {selectedSlip.slipUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selectedSlip.slipUrl} alt="Payment Slip" className="w-full max-w-[300px] object-contain rounded-xl shadow-md border border-slate-200" />
              ) : (
                <div className="p-8 text-slate-400 text-center">ไม่มีรูปภาพสลิป</div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-slate-100 flex gap-3">
              <Button variant="outline" className="flex-1 rounded-full border-slate-200 h-12" onClick={() => setSelectedSlip(null)}>
                ปิด
              </Button>
              <Button className="flex-1 rounded-full bg-green-600 hover:bg-green-700 text-white font-bold h-12 shadow-sm" onClick={() => handleApproveSlip(selectedSlip.id)}>
                อนุมัติรับเงิน
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
