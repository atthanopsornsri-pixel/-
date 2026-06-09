"use client";
import { toast } from "sonner";

import { useState, useEffect, useRef, ChangeEvent, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface Property {
  id: string;
  name: string;
  leaseTemplate: string | null;
}

const DEFAULT_TEMPLATE = `ข้อตกลงและเงื่อนไขการเช่าพักอาศัย:

1. ข้อมูลการเช่า:
สัญญานี้ทำขึ้นเพื่อห้องพักหมายเลข {{ROOM_NUMBER}} 
ผู้เช่าชื่อ: {{TENANT_NAME}}
ค่าเช่ารายเดือน: {{RENT_PRICE}} บาท/เดือน

2. กฎระเบียบหอพัก:
- ผู้เช่าต้องชำระค่าเช่าภายในวันที่ 5 ของทุกเดือน หากล่าช้าจะมีค่าปรับวันละ 100 บาท
- ห้ามส่งเสียงดังรบกวนห้องข้างเคียงหลังเวลา 22:00 น.
- ห้ามเลี้ยงสัตว์ทุกชนิดภายในบริเวณอาคารและห้องพัก
- ห้ามดัดแปลง ต่อเติม หรือเจาะผนังห้องโดยไม่ได้รับอนุญาตเป็นลายลักษณ์อักษร

3. การย้ายออกและมัดจำ:
- ผู้เช่าต้องแจ้งย้ายออกล่วงหน้าอย่างน้อย 30 วัน
- หากอยู่ไม่ครบสัญญาเช่า ผู้ให้เช่าขอสงวนสิทธิ์ไม่คืนเงินมัดจำในทุกกรณี`;

export default function ContractSettingsPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    async function fetchProperties() {
      try {
        const res = await fetch("/api/properties");
        if (res.ok) {
          const data = await res.json();
          setProperties(data);
          if (data.length > 0) {
            setSelectedPropertyId(data[0].id);
            setTemplate(data[0].leaseTemplate || DEFAULT_TEMPLATE);
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
      setTemplate(prop.leaseTemplate || DEFAULT_TEMPLATE);
    }
  };

  const variables = [
    { label: "ชื่อผู้เช่า", code: "{{TENANT_NAME}}" },
    { label: "เลขบัตรประชาชน", code: "{{ID_CARD}}" },
    { label: "ที่อยู่ผู้เช่า", code: "{{ADDRESS}}" },
    { label: "เบอร์โทรผู้เช่า", code: "{{PHONE}}" },
    { label: "เลขห้อง", code: "{{ROOM_NUMBER}}" },
    { label: "ค่าเช่าพื้นฐาน", code: "{{RENT_PRICE}}" },
    { label: "เงินประกัน", code: "{{DEPOSIT_AMOUNT}}" },
    { label: "วันที่เริ่มสัญญา", code: "{{START_DATE}}" },
    { label: "วันที่สิ้นสุดสัญญา", code: "{{END_DATE}}" },
    { label: "ยานพาหนะ (ทะเบียนรถ)", code: "{{VEHICLES}}" },
  ];

  const insertVariable = (variableCode: string) => {
    if (!textareaRef.current) return;
    
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const currentText = textareaRef.current.value;
    
    const before = currentText.substring(0, start);
    const after = currentText.substring(end, currentText.length);
    
    const newText = before + variableCode + after;
    setTemplate(newText);
    
    // ดึง Focus กลับไปที่กล่องข้อความหลังแทรกเสร็จ
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + variableCode.length;
      }
    }, 0);
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
        toast.success("บันทึกแม่แบบสัญญาเช่าเรียบร้อยแล้ว");
        setProperties(properties.map(p => p.id === selectedPropertyId ? { ...p, leaseTemplate: template } : p));
      } else {
        toast.error("เกิดข้อผิดพลาดในการบันทึก");
      }
    } catch (error) {
      console.error(error);
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">กำลังโหลดข้อมูล...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">ตั้งค่าสัญญาเช่า</h2>
        <p className="text-sm text-gray-500">
          กำหนดข้อตกลง กฎระเบียบ และเงื่อนไขต่างๆ ในสัญญาเช่าสำหรับหอพักของคุณ ระบบจะนำแม่แบบนี้ไปสร้างเป็นสัญญาฉบับสมบูรณ์ให้ลูกบ้านเซ็นอัตโนมัติ
        </p>
      </div>

      {properties.length > 1 && (
        <div className="mb-6">
          <Label className="mb-2 block font-semibold text-gray-700">เลือกหอพัก</Label>
          <select
            value={selectedPropertyId}
            onChange={handlePropertyChange}
            className="w-full max-w-md h-12 rounded-xl border border-gray-300 px-4 bg-white shadow-sm"
          >
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* แถบเครื่องมือ: ตัวแปร (Cheat Sheet) */}
        <div className="lg:col-span-1 bg-gray-50 p-5 rounded-xl border border-gray-200 h-fit shadow-sm sticky top-24">
          <h3 className="text-sm font-bold text-gray-800 mb-2">แทรกตัวแปรอัตโนมัติ</h3>
          <p className="text-xs text-gray-500 mb-4">คลิกเพื่อแทรกข้อมูลลงในสัญญา</p>
          <div className="flex flex-col space-y-2">
            {variables.map((v) => (
              <button
                key={v.code}
                type="button"
                onClick={() => insertVariable(v.code)}
                className="text-left px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-blue-600 font-medium hover:bg-blue-50 hover:border-blue-300 transition-colors shadow-sm"
              >
                + {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* พื้นที่แก้ไขข้อความ */}
        <div className="lg:col-span-3 flex flex-col bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <label className="text-sm font-bold text-gray-800 mb-3">ข้อตกลงและเงื่อนไขเพิ่มเติม (Terms and Conditions)</label>
          <textarea
            ref={textareaRef}
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="w-full h-[500px] p-5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y text-sm text-gray-800 leading-relaxed font-sans shadow-inner"
            placeholder="พิมพ์กฎระเบียบของคุณที่นี่..."
          />
          
          <div className="mt-6 flex justify-end">
            <button 
              onClick={handleSave}
              disabled={isSaving || !selectedPropertyId}
              className="px-8 py-3 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 transition-colors shadow-md disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {isSaving ? "กำลังบันทึก..." : "บันทึกแม่แบบสัญญาเช่า"}
            </button>
          </div>
        </div>
        
      </div>
    </div>
  );
}
