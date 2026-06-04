/* eslint-disable */
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

export default function AdminOwnersPage() {
  const [owners, setOwners] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchOwners();
  }, []);

  async function fetchOwners() {
    const res = await fetch("/api/admin/owners");
    if (res.ok) {
      const data = await res.json();
      setOwners(data);
    }
    setIsLoading(false);
  };

  const togglePassword = (id: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">จัดการบัญชีเจ้าของหอพัก</h1>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100 text-slate-600">
            <tr>
              <th className="px-6 py-4 font-semibold">ชื่อบัญชี</th>
              <th className="px-6 py-4 font-semibold">อีเมล (Username)</th>
              <th className="px-6 py-4 font-semibold">รหัสผ่าน</th>
              <th className="px-6 py-4 font-semibold text-center">จำนวนหอพัก</th>
              <th className="px-6 py-4 font-semibold">สิทธิ์ใช้งาน (Invite Code)</th>
              <th className="px-6 py-4 font-semibold">วันที่สมัคร</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {owners.map(owner => (
              <tr key={owner.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-4 font-semibold text-slate-800">{owner.name || "-"}</td>
                <td className="px-6 py-4 text-slate-600">{owner.email}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <code className="bg-slate-100 px-2 py-1 rounded text-sm text-slate-700 min-w-[100px] text-center">
                      {visiblePasswords[owner.id] ? (owner.unencryptedPassword || "N/A") : "••••••••"}
                    </code>
                    <button 
                      onClick={() => togglePassword(owner.id)}
                      className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
                      title="แสดง/ซ่อน รหัสผ่าน"
                    >
                      {visiblePasswords[owner.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4 text-center font-bold text-indigo-600">
                  {owner._count.properties}
                </td>
                <td className="px-6 py-4 text-sm">
                  {owner.registrationCodes && owner.registrationCodes.length > 0 ? (
                    <div>
                      <span className="font-mono bg-indigo-50 text-indigo-700 px-2 py-1 rounded">
                        {owner.registrationCodes[0].code}
                      </span>
                      <span className="ml-2 text-slate-500">
                        ({owner.registrationCodes[0].months} เดือน)
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">ไม่มีข้อมูล</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {new Date(owner.createdAt).toLocaleDateString('th-TH')}
                </td>
              </tr>
            ))}
            {!isLoading && owners.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  ยังไม่มีเจ้าของหอพักในระบบ
                </td>
              </tr>
            )}
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  กำลังโหลดข้อมูล...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
