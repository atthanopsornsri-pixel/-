"use client";

import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface Property {
  id: string;
  name: string;
  leaseTemplate: string | null;
}

export default function ContractSettingsPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [template, setTemplate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchProperties() {
      try {
        const res = await fetch("/api/properties");
        if (res.ok) {
          const data = await res.json();
          setProperties(data);
          if (data.length > 0) {
            setSelectedPropertyId(data[0].id);
            setTemplate(data[0].leaseTemplate || "");
          }
        }
      } catch (error) {
        console.error("Failed to fetch properties:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProperties();
  }, []);

  const handlePropertyChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedPropertyId(id);
    const prop = properties.find((p) => p.id === id);
    if (prop) {
      setTemplate(prop.leaseTemplate || "");
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedPropertyId) return;
    
    setIsSaving(true);
    try {
      const res = await fetch(`/api/properties/${selectedPropertyId}/contract-template`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaseTemplate: template }),
      });

      if (res.ok) {
        alert("บันทึกแม่แบบสัญญาเช่าเรียบร้อยแล้ว");
        setProperties(properties.map(p => p.id === selectedPropertyId ? { ...p, leaseTemplate: template } : p));
      } else {
        alert("เกิดข้อผิดพลาดในการบันทึก");
      }
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">กำลังโหลดข้อมูล...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">ตั้งค่าแม่แบบสัญญาเช่า</h1>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
        <p className="text-slate-500 text-sm mb-6">
          กำหนดข้อตกลง กฎระเบียบ และเงื่อนไขต่างๆ ในสัญญาเช่าสำหรับหอพักของคุณ 
          ระบบจะนำแม่แบบนี้ไปสร้างเป็นสัญญาฉบับสมบูรณ์ให้ลูกบ้านเซ็นอัตโนมัติ
        </p>

        {properties.length > 1 && (
          <div className="mb-6">
            <Label className="mb-2 block">เลือกหอพัก</Label>
            <select
              value={selectedPropertyId}
              onChange={handlePropertyChange}
              className="w-full h-12 rounded-xl border border-slate-300 px-4 bg-slate-50"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mb-6 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
          <h3 className="font-semibold text-blue-800 mb-2">ตัวแปรอัตโนมัติ (Placeholders)</h3>
          <p className="text-sm text-slate-600 mb-2">คุณสามารถคัดลอกข้อความด้านล่างไปวางในสัญญาได้ ระบบจะแทนที่ด้วยข้อมูลจริงของลูกบ้านอัตโนมัติ:</p>
          <div className="flex flex-wrap gap-2 text-xs font-mono">
            <span className="bg-white px-2 py-1 rounded border border-blue-200 text-blue-600">{"{{TENANT_NAME}}"}</span>
            <span className="bg-white px-2 py-1 rounded border border-blue-200 text-blue-600">{"{{ROOM_NUMBER}}"}</span>
            <span className="bg-white px-2 py-1 rounded border border-blue-200 text-blue-600">{"{{RENT_PRICE}}"}</span>
            <span className="bg-white px-2 py-1 rounded border border-blue-200 text-blue-600">{"{{DEPOSIT_AMOUNT}}"}</span>
            <span className="bg-white px-2 py-1 rounded border border-blue-200 text-blue-600">{"{{LEASE_START}}"}</span>
            <span className="bg-white px-2 py-1 rounded border border-blue-200 text-blue-600">{"{{ID_CARD}}"}</span>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label>ข้อความในสัญญาเช่า</Label>
            <textarea
              value={template}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setTemplate(e.target.value)}
              placeholder="พิมพ์ข้อตกลงและกฎระเบียบของหอพักที่นี่..."
              className="w-full min-h-[400px] rounded-xl p-4 leading-relaxed border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
          
          <div className="pt-4">
            <Button 
              type="submit" 
              disabled={isSaving || !selectedPropertyId} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-8 py-6 h-auto w-full md:w-auto font-medium"
            >
              {isSaving ? "กำลังบันทึก..." : "บันทึกแม่แบบสัญญาเช่า"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
