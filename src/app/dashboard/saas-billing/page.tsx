"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function OwnerBillingPage() {
  const [bills, setBills] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Payment Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [slipUrl, setSlipUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchBills();
  }, []);

  async function fetchBills() {
    setIsLoading(true);
    const res = await fetch("/api/owner/bills");
    if (res.ok) {
      setBills(await res.json());
    }
    setIsLoading(false);
  };

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
      fetchBills();
    } else {
      alert("เกิดข้อผิดพลาด");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">บิลค่าบริการระบบ</h1>
          <p className="text-slate-500 mt-1">ประวัติการเรียกเก็บค่าบริการแพลตฟอร์ม ApartmentOS</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100 text-slate-600">
            <tr>
              <th className="px-6 py-4 font-semibold">รอบบิล</th>
              <th className="px-6 py-4 font-semibold">ยอด (฿)</th>
              <th className="px-6 py-4 font-semibold">สถานะ</th>
              <th className="px-6 py-4 font-semibold text-right">การจัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {bills.map(bill => (
              <tr key={bill.id} className="hover:bg-slate-50/50">
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
              <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">ไม่มีบิลเรียกเก็บค่าบริการ</td></tr>
            )}
            {isLoading && (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">กำลังโหลดข้อมูล...</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in">
          <div className="bg-white rounded-[24px] p-8 w-full max-w-md shadow-lg animate-in zoom-in-95">
            <h2 className="text-xl font-bold text-slate-800 mb-2">แจ้งชำระเงิน</h2>
            <p className="text-slate-500 mb-6 text-sm">
              รอบบิล: {selectedBill.month}/{selectedBill.year} <br/>
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
                <p className="text-xs text-slate-400">กรุณาอัปโหลดรูปภาพสลิปของคุณที่เว็บรับฝากรูป และนำลิงก์มาวางที่นี่</p>
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
    </div>
  );
}
