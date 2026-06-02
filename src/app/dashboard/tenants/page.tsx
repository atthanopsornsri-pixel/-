"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";

export default function TenantsPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<any[]>([]);

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    const res = await fetch("/api/tenants");
    if (res.ok) {
      const data = await res.json();
      setTenants(data);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">จัดการข้อมูลผู้เช่า</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>รายชื่อผู้เช่าทั้งหมด</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3">ชื่อลูกบ้าน</th>
                  <th className="px-4 py-3">อีเมล</th>
                  <th className="px-4 py-3">ห้องพัก</th>
                  <th className="px-4 py-3">อพาร์ตเม้นท์</th>
                  <th className="px-4 py-3">วันที่เริ่มเช่า</th>
                  <th className="px-4 py-3 text-right">จัดการสัญญา</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map(tenant => (
                  <tr key={tenant.id} className="border-b hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{tenant.user.name || "-"}</td>
                    <td className="px-4 py-3">{tenant.user.email}</td>
                    <td className="px-4 py-3 font-bold text-blue-600">{tenant.room?.number || "-"}</td>
                    <td className="px-4 py-3 text-slate-500">{tenant.room?.property?.name || "-"}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {tenant.leaseStart ? new Date(tenant.leaseStart).toLocaleDateString("th-TH") : "ยังไม่ระบุ"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="outline" size="sm" onClick={() => window.open(`/dashboard/tenants/${tenant.id}/lease`, '_blank')}>
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        พิมพ์สัญญาเช่า
                      </Button>
                    </td>
                  </tr>
                ))}
                {tenants.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      ยังไม่มีข้อมูลผู้เช่า (ผู้เช่าต้องสมัครสมาชิกด้วย Invite Code จึงจะแสดงที่นี่)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
