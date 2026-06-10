/* eslint-disable */
"use client";

import useSWR from "swr";
import { jsonFetcher } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

export default function AdminOwnersPage() {
  const { data: owners = [], isLoading } = useSWR<any[]>("/api/admin/owners", jsonFetcher);

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
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  ยังไม่มีเจ้าของหอพักในระบบ
                </td>
              </tr>
            )}
            {isLoading && Array.from({ length: 4 }).map((_, i) => (
              <tr key={i} className="animate-pulse border-b border-slate-50">
                {[1,2,3,4,5].map(j => (
                  <td key={j} className="px-6 py-4">
                    <div className="h-4 bg-slate-100 rounded w-3/4" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
