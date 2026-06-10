"use client";
import { toast } from "sonner";
import { useState } from "react";
import useSWR from "swr";
import { jsonFetcher } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminBillsPage() {
  // ── SWR ─────────────────────────────────────────────────────────────────
  const { data: bills = [], isLoading: billsLoading, mutate: mutateBills } = useSWR<any[]>(
    "/api/admin/bills", jsonFetcher
  );
  const { data: owners = [], isLoading: ownersLoading, mutate: mutateOwners } = useSWR<any[]>(
    "/api/admin/owners", jsonFetcher
  );
  const isLoading = billsLoading || ownersLoading;
  const mutateData = () => { mutateBills(); mutateOwners(); };

  // Create Bill Form
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    ownerId: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    amount: 500,
  });

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    
    const res = await fetch("/api/admin/bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      toast.success("ออกบิลสำเร็จ");
      mutateData();
    } else {
      toast.error("เกิดข้อผิดพลาดในการออกบิล");
    }
    setIsCreating(false);
  };

  const handleApprove = async (id: string) => {
    if (!confirm("ยืนยันการรับชำระเงินบิลนี้?")) return;
    
    const res = await fetch(`/api/admin/bills/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PAID" }),
    });

    if (res.ok) {
      mutateData();
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("ปฏิเสธสลิปนี้ และให้เจ้าของหอแนบใหม่?")) return;
    
    const res = await fetch(`/api/admin/bills/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "UNPAID" }), // Revert to unpaid
    });

    if (res.ok) {
      mutateData();
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">บิลค่าบริการระบบ (SaaS)</h1>
          <p className="text-slate-500 mt-1">ออกบิลเรียกเก็บค่าบริการจากเจ้าของหอพัก และตรวจสอบสลิป</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Create Form */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 h-fit">
          <h2 className="text-lg font-bold text-slate-800 mb-4">ออกบิลใหม่</h2>
          <form onSubmit={handleCreateBill} className="space-y-4">
            <div className="space-y-2">
              <Label>เจ้าของหอพัก (Owner)</Label>
              <select 
                required
                className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                value={formData.ownerId}
                onChange={e => setFormData({...formData, ownerId: e.target.value})}
              >
                <option value="">-- เลือกเจ้าของหอ --</option>
                {owners.map(o => (
                  <option key={o.id} value={o.id}>{o.name || o.email}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>เดือน (1-12)</Label>
                <Input 
                  type="number" min={1} max={12} required 
                  value={formData.month} 
                  onChange={e => setFormData({...formData, month: parseInt(e.target.value)})}
                  className="rounded-xl bg-slate-50"
                />
              </div>
              <div className="space-y-2">
                <Label>ปี (ค.ศ.)</Label>
                <Input 
                  type="number" min={2020} required 
                  value={formData.year} 
                  onChange={e => setFormData({...formData, year: parseInt(e.target.value)})}
                  className="rounded-xl bg-slate-50"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>จำนวนเงิน (บาท)</Label>
              <Input 
                type="number" min={0} required 
                value={formData.amount} 
                onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})}
                className="rounded-xl bg-slate-50 font-bold text-blue-600"
              />
            </div>
            
            <Button type="submit" disabled={isCreating} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl mt-4">
              {isCreating ? "กำลังสร้างบิล..." : "ออกบิลค่าบริการ"}
            </Button>
          </form>
        </div>

        {/* Right Col: Bill List */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-600">
              <tr>
                <th className="px-6 py-4 font-semibold">รอบบิล</th>
                <th className="px-6 py-4 font-semibold">เจ้าของหอ</th>
                <th className="px-6 py-4 font-semibold">ยอด (฿)</th>
                <th className="px-6 py-4 font-semibold">สถานะ</th>
                <th className="px-6 py-4 font-semibold text-right">สลิป/จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {bills.map(bill => (
                <tr key={bill.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-medium text-slate-800">
                    {bill.month}/{bill.year + 543}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {bill.owner?.name || bill.owner?.email}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-800">
                    {bill.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    {bill.status === "UNPAID" && <span className="bg-red-50 text-red-600 px-2 py-1 rounded font-medium">รอชำระ</span>}
                    {bill.status === "PENDING" && (
                      <span className="bg-amber-50 text-amber-600 px-2 py-1 rounded font-medium">
                        รอตรวจสลิป
                      </span>
                    )}
                    {bill.status === "PAID" && (
                      <span className="inline-flex items-center gap-1 bg-green-50 text-green-600 px-2 py-1 rounded font-medium">
                        จ่ายแล้ว
                        {bill.slipVerified && (
                          <span title="ผ่านการตรวจสลิปอัตโนมัติ (SlipOK)" className="text-emerald-500 font-bold">
                            ✓ Auto
                          </span>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                    {bill.slipUrl ? (
                      <a href={bill.slipUrl} target="_blank" className="text-blue-500 hover:underline text-xs bg-blue-50 px-2 py-1 rounded">
                        ดูสลิป
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                    
                    {bill.status === "PENDING" && (
                      <div className="flex items-center gap-1 ml-2">
                        <Button size="sm" onClick={() => handleApprove(bill.id)} className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white px-2">ยืนยัน</Button>
                        <Button size="sm" variant="outline" onClick={() => handleReject(bill.id)} className="h-7 text-xs px-2 border-red-200 text-red-600 hover:bg-red-50">ปฏิเสธ</Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {!isLoading && bills.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">ยังไม่มีประวัติการออกบิล</td></tr>
              )}
              {isLoading && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">กำลังโหลดข้อมูล...</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
