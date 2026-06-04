"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminCodesPage() {
  const [codes, setCodes] = useState<any[]>([]);
  const [months, setMonths] = useState("1");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchCodes();
  }, []);

  async function fetchCodes() {
    const res = await fetch("/api/admin/codes");
    if (res.ok) {
      const data = await res.json();
      setCodes(data);
    }
  };

  const generateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const res = await fetch("/api/admin/codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ months: Number(months) }),
    });

    if (res.ok) {
      alert("สร้างโค้ดสำเร็จ");
      fetchCodes();
    } else {
      alert("เกิดข้อผิดพลาดในการสร้างโค้ด");
    }
    setIsLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">ระบบออก Invite Code สำหรับเจ้าของหอพัก</h1>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <form onSubmit={generateCode} className="flex items-end gap-4">
          <div className="space-y-2 flex-1">
            <Label>ระยะเวลาเช่าระบบ (เดือน)</Label>
            <Input 
              type="number" 
              value={months} 
              onChange={e => setMonths(e.target.value)} 
              min="1" 
              required 
              className="h-12 rounded-xl"
            />
          </div>
          <Button type="submit" disabled={isLoading} className="h-12 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700">
            {isLoading ? "กำลังสร้าง..." : "+ สร้างโค้ดใหม่"}
          </Button>
        </form>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100 text-slate-600">
            <tr>
              <th className="px-6 py-4 font-semibold">Invite Code</th>
              <th className="px-6 py-4 font-semibold">ระยะเวลา (เดือน)</th>
              <th className="px-6 py-4 font-semibold">สถานะ</th>
              <th className="px-6 py-4 font-semibold">ผู้ใช้งาน</th>
              <th className="px-6 py-4 font-semibold">วันที่สร้าง</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {codes.map(code => (
              <tr key={code.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-4 font-mono font-bold text-indigo-600 text-lg">{code.code}</td>
                <td className="px-6 py-4">{code.months} เดือน</td>
                <td className="px-6 py-4">
                  {code.isUsed ? (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">ใช้งานแล้ว</span>
                  ) : (
                    <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">ยังไม่ใช้งาน</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {code.usedBy ? (
                    <div>
                      <div className="font-semibold">{code.usedBy.name}</div>
                      <div className="text-xs text-slate-400">{code.usedBy.email}</div>
                    </div>
                  ) : "-"}
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {new Date(code.createdAt).toLocaleDateString('th-TH')}
                </td>
              </tr>
            ))}
            {codes.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  ยังไม่มีประวัติการสร้างรหัส
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
