"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Star, Zap, Server } from "lucide-react";

export default function OwnerBillingPage() {
  const [bills, setBills] = useState<any[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Payment Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [slipUrl, setSlipUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Upgrade Modal
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    const [billsRes, statusRes] = await Promise.all([
      fetch("/api/owner/bills"),
      fetch("/api/owner/saas-status")
    ]);
    
    if (billsRes.ok) setBills(await billsRes.json());
    if (statusRes.ok) setStatus(await statusRes.json());
    
    setIsLoading(false);
  }

  const openPaymentModal = (bill: any) => {
    setSelectedBill(bill);
    setSlipUrl("");
    setIsModalOpen(true);
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBill) return;
    
    setIsSubmitting(true);
    const res = await fetch(`/api/owner/bills/${selectedBill.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slipUrl }),
    });

    if (res.ok) {
      alert("ส่งหลักฐานการโอนเงินเรียบร้อย รอผู้ดูแลระบบตรวจสอบ");
      setIsModalOpen(false);
      fetchData();
    } else {
      alert("เกิดข้อผิดพลาด");
    }
    setIsSubmitting(false);
  };

  const handleUpgrade = async (planTier: string, cycle: string) => {
    setIsUpgrading(true);
    const res = await fetch("/api/owner/upgrade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planTier, cycle })
    });
    
    if (res.ok) {
      alert("สร้างบิลแจ้งชำระเงินเรียบร้อย กรุณาแนบสลิปในรายการบิลด้านล่าง");
      setIsUpgradeOpen(false);
      fetchData();
    } else {
      alert("เกิดข้อผิดพลาด");
    }
    setIsUpgrading(false);
  };

  const renderProgressBar = () => {
    if (!status) return null;
    const { totalRooms, roomLimit, planTier } = status;
    const percentage = roomLimit >= 999999 ? 0 : Math.min(100, (totalRooms / roomLimit) * 100);
    const isDanger = percentage >= 90;

    return (
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex-grow w-full">
          <div className="flex justify-between items-end mb-2">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Server className="w-5 h-5 text-blue-500" /> แพ็กเกจปัจจุบัน: {planTier}
              </h3>
              <p className="text-slate-500 text-sm mt-1">โควตาจำนวนห้องพักทั้งหมดของคุณ</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-slate-800">{totalRooms}</span>
              <span className="text-slate-500 font-medium text-sm"> / {roomLimit >= 999999 ? "∞" : roomLimit} ห้อง</span>
            </div>
          </div>
          
          {roomLimit < 999999 && (
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div 
                className={`h-3 rounded-full ${isDanger ? 'bg-red-500' : 'bg-blue-500'} transition-all duration-500`}
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
          )}
          
          {isDanger && roomLimit < 999999 && (
            <p className="text-red-500 text-xs font-bold mt-2">ใกล้เต็มโควตาแล้ว กรุณาอัปเกรดแพ็กเกจเพื่อขยายธุรกิจของคุณ!</p>
          )}
        </div>
        
        <div className="shrink-0 w-full md:w-auto">
          <Button onClick={() => setIsUpgradeOpen(true)} className="w-full md:w-auto bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-bold h-12 px-8 rounded-xl shadow-md">
            <Zap className="w-4 h-4 mr-2" /> อัปเกรดแพ็กเกจ
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">การจัดการแพ็กเกจ</h1>
          <p className="text-slate-500 mt-1">รายละเอียดการใช้งานและบิลค่าบริการแพลตฟอร์ม</p>
        </div>
      </div>

      {renderProgressBar()}

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-800">ประวัติการเรียกเก็บเงิน</h2>
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100 text-slate-600">
            <tr>
              <th className="px-6 py-4 font-semibold">แพ็กเกจ</th>
              <th className="px-6 py-4 font-semibold">รอบบิล</th>
              <th className="px-6 py-4 font-semibold">ยอด (฿)</th>
              <th className="px-6 py-4 font-semibold">สถานะ</th>
              <th className="px-6 py-4 font-semibold text-right">การจัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {bills.map(bill => (
              <tr key={bill.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-4 font-bold text-slate-800">
                  {bill.planTier} <span className="text-xs text-slate-400 ml-1 font-medium">({bill.cycle})</span>
                </td>
                <td className="px-6 py-4 font-medium text-slate-800">
                  {bill.month}/{bill.year}
                </td>
                <td className="px-6 py-4 font-bold text-slate-800">
                  {bill.amount.toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  {bill.status === "UNPAID" && <span className="bg-red-50 text-red-600 px-2 py-1 rounded font-medium">รอชำระเงิน</span>}
                  {bill.status === "PENDING" && <span className="bg-amber-50 text-amber-600 px-2 py-1 rounded font-medium">รอตรวจสอบสลิป</span>}
                  {bill.status === "PAID" && <span className="bg-green-50 text-green-600 px-2 py-1 rounded font-medium">ชำระแล้ว</span>}
                </td>
                <td className="px-6 py-4 text-right">
                  {bill.status === "UNPAID" && (
                    <Button onClick={() => openPaymentModal(bill)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
                      แจ้งชำระเงิน
                    </Button>
                  )}
                  {bill.status !== "UNPAID" && bill.slipUrl && (
                    <a href={bill.slipUrl} target="_blank" className="text-blue-500 hover:underline text-sm mr-2">
                      ดูสลิปที่แนบ
                    </a>
                  )}
                </td>
              </tr>
            ))}
            {!isLoading && bills.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">ไม่มีบิลเรียกเก็บค่าบริการ</td></tr>
            )}
            {isLoading && (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">กำลังโหลดข้อมูล...</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in px-4">
          <div className="bg-white rounded-[24px] p-8 w-full max-w-md shadow-lg animate-in zoom-in-95">
            <h2 className="text-xl font-bold text-slate-800 mb-2">แจ้งชำระเงิน</h2>
            <p className="text-slate-500 mb-6 text-sm">
              แพ็กเกจ: {selectedBill.planTier} ({selectedBill.cycle}) <br/>
              ยอดที่ต้องชำระ: <span className="font-bold text-slate-800">{selectedBill.amount.toLocaleString()} บาท</span>
            </p>
            
            <form onSubmit={handlePayment} className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-700 mb-4 border border-slate-200">
                <p className="font-bold mb-1">โอนเงินมาที่บัญชี:</p>
                <p>ธนาคาร: กสิกรไทย (KBank)</p>
                <p>ชื่อบัญชี: บจก. อพาร์ทเมนท์ โอเอส</p>
                <p>เลขที่บัญชี: 012-3-45678-9</p>
              </div>

              <div className="space-y-2">
                <Label>ลิงก์รูปภาพสลิปการโอนเงิน</Label>
                <Input 
                  required 
                  placeholder="เช่น https://imgur.com/..." 
                  className="rounded-xl"
                  value={slipUrl}
                  onChange={e => setSlipUrl(e.target.value)}
                />
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-xl">
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={isSubmitting} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white">
                  {isSubmitting ? "กำลังบันทึก..." : "ส่งหลักฐาน"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isUpgradeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-8 w-full max-w-4xl shadow-2xl animate-in zoom-in-95 my-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-extrabold text-slate-900">เลือกแพ็กเกจที่เหมาะกับคุณ</h2>
              <p className="text-slate-500 mt-2">ประหยัดทันที 2 เดือน เมื่อชำระแบบรายปี</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* STARTER */}
              <div className="border border-slate-200 rounded-2xl p-6 hover:border-blue-300 hover:shadow-md transition-all">
                <h3 className="text-lg font-bold text-slate-800">Starter</h3>
                <p className="text-sm text-slate-500">สูงสุด 30 ห้อง</p>
                <div className="my-4">
                  <span className="text-3xl font-black text-slate-800">฿199</span><span className="text-slate-500">/ด.</span>
                </div>
                <div className="space-y-2 mb-6">
                  <Button disabled={isUpgrading} onClick={() => handleUpgrade("STARTER", "MONTHLY")} variant="outline" className="w-full font-bold">รายเดือน (฿199)</Button>
                  <Button disabled={isUpgrading} onClick={() => handleUpgrade("STARTER", "YEARLY")} variant="outline" className="w-full font-bold bg-slate-50 text-blue-600 border-blue-200 hover:bg-blue-50">รายปี (฿1,990)</Button>
                </div>
              </div>

              {/* GROWTH */}
              <div className="border-2 border-blue-500 rounded-2xl p-6 shadow-xl relative bg-blue-50/30">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">แนะนำ</div>
                <h3 className="text-lg font-bold text-slate-800">Growth</h3>
                <p className="text-sm text-slate-500">สูงสุด 100 ห้อง</p>
                <div className="my-4">
                  <span className="text-3xl font-black text-slate-800">฿599</span><span className="text-slate-500">/ด.</span>
                </div>
                <div className="space-y-2 mb-6">
                  <Button disabled={isUpgrading} onClick={() => handleUpgrade("GROWTH", "MONTHLY")} variant="outline" className="w-full font-bold border-blue-200">รายเดือน (฿599)</Button>
                  <Button disabled={isUpgrading} onClick={() => handleUpgrade("GROWTH", "YEARLY")} className="w-full font-bold bg-blue-600 hover:bg-blue-700 text-white">รายปี (฿5,990)</Button>
                </div>
              </div>

              {/* ENTERPRISE */}
              <div className="border border-slate-200 rounded-2xl p-6 hover:border-blue-300 hover:shadow-md transition-all">
                <h3 className="text-lg font-bold text-slate-800">Enterprise</h3>
                <p className="text-sm text-slate-500">ไม่จำกัดห้อง</p>
                <div className="my-4">
                  <span className="text-3xl font-black text-slate-800">฿1,299</span><span className="text-slate-500">/ด.</span>
                </div>
                <div className="space-y-2 mb-6">
                  <Button disabled={isUpgrading} onClick={() => handleUpgrade("ENTERPRISE", "MONTHLY")} variant="outline" className="w-full font-bold">รายเดือน (฿1,299)</Button>
                  <Button disabled={isUpgrading} onClick={() => handleUpgrade("ENTERPRISE", "YEARLY")} variant="outline" className="w-full font-bold bg-slate-50 text-blue-600 border-blue-200 hover:bg-blue-50">รายปี (฿12,990)</Button>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center">
              <Button variant="ghost" onClick={() => setIsUpgradeOpen(false)} className="text-slate-500 hover:text-slate-800">
                ปิดหน้าต่าง
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
