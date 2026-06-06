"use client";

import React, { useRef, useState, useTransition } from "react";
import { generateBulkBills, updateBulkMeters } from "@/app/actions/billing-batch";
import { Button } from "@/components/ui/button";
import { Save, PlusSquare, Loader2, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

// Define the shape of the data we expect from the Server Component
export type BillRowData = {
  id: string;
  roomId: string;
  roomNumber: string;
  rentAmount: number;
  waterUnits: number | null;
  electricUnits: number | null;
  status: string;
  totalAmount: number;
};

type BillingDataGridProps = {
  propertyId: string;
  month: number;
  year: number;
  bills: BillRowData[];
};

export function BillingDataGrid({ propertyId, month, year, bills }: BillingDataGridProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Performance Architect Move: 
  // Use a ref to store all meter updates instead of state.
  // This completely eliminates React re-renders when typing across 200+ rows!
  const updatesRef = useRef<{ [billId: string]: { waterUnit: number; electricUnit: number } }>({});

  // Initialize the ref with existing values so we don't send 0s by mistake
  // We only run this once on mount/data change
  React.useEffect(() => {
    bills.forEach(bill => {
      updatesRef.current[bill.id] = {
        waterUnit: bill.waterUnits || 0,
        electricUnit: bill.electricUnits || 0,
      };
    });
  }, [bills]);

  const handleInputChange = (billId: string, type: "water" | "electric", value: string) => {
    if (!updatesRef.current[billId]) {
      updatesRef.current[billId] = { waterUnit: 0, electricUnit: 0 };
    }
    const numValue = value === "" ? 0 : Number(value);
    
    if (type === "water") {
      updatesRef.current[billId].waterUnit = numValue;
    } else {
      updatesRef.current[billId].electricUnit = numValue;
    }
  };

  const handleGenerateBills = async () => {
    setIsGenerating(true);
    setFeedbackMsg(null);
    try {
      const res = await generateBulkBills(propertyId, month, year);
      if (res.success) {
        setFeedbackMsg({ type: 'success', text: res.message || 'สร้างบิลสำเร็จ' });
        // Force refresh the server component to fetch the newly created bills
        startTransition(() => {
          router.refresh();
        });
      } else {
        setFeedbackMsg({ type: 'error', text: res.error || 'เกิดข้อผิดพลาด' });
      }
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: 'ระบบขัดข้อง' });
    }
    setIsGenerating(false);
  };

  const handleSaveMeters = async () => {
    setIsSaving(true);
    setFeedbackMsg(null);
    try {
      // Transform the ref dictionary back into an array for the API
      const updatesArray = Object.entries(updatesRef.current).map(([billId, data]) => ({
        billId,
        waterUnit: data.waterUnit,
        electricUnit: data.electricUnit,
      }));

      // Validation check for negative values
      const hasNegative = updatesArray.some(u => u.waterUnit < 0 || u.electricUnit < 0);
      if (hasNegative) {
        setFeedbackMsg({ type: 'error', text: 'หน่วยน้ำและไฟห้ามเป็นค่าติดลบ' });
        setIsSaving(false);
        return;
      }

      const res = await updateBulkMeters(propertyId, updatesArray);
      
      if (res.success) {
        setFeedbackMsg({ type: 'success', text: res.message || 'บันทึกมิเตอร์สำเร็จ' });
        startTransition(() => {
          router.refresh(); // Refresh page to recalculate totalAmount
        });
      } else {
        setFeedbackMsg({ type: 'error', text: res.error || 'เกิดข้อผิดพลาด' });
      }
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: 'ระบบขัดข้อง' });
    }
    setIsSaving(false);
  };

  const formatTHB = (amount: number) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Actions Toolbar */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-slate-800">
            ระบบจดมิเตอร์ (เดือน {month}/{year})
          </h2>
          <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">
            {bills.length} บิล
          </span>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button 
            variant="outline" 
            onClick={handleGenerateBills} 
            disabled={isGenerating || isPending}
            className="w-full sm:w-auto border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PlusSquare className="w-4 h-4 mr-2" />}
            สร้างบิลตั้งต้น
          </Button>

          <Button 
            onClick={handleSaveMeters} 
            disabled={isSaving || isPending || bills.length === 0}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            บันทึกทั้งหมด
          </Button>
        </div>
      </div>

      {feedbackMsg && (
        <div className={`p-3 text-sm flex items-center gap-2 border-b ${feedbackMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
          <CheckCircle2 className="w-4 h-4" />
          {feedbackMsg.text}
        </div>
      )}

      {/* Data Grid (Excel Like) */}
      <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-600 uppercase bg-slate-100 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-4 py-3 border-b border-slate-200 font-bold">ห้อง</th>
              <th className="px-4 py-3 border-b border-slate-200 font-bold">ค่าเช่าตั้งต้น</th>
              <th className="px-4 py-3 border-b border-slate-200 font-bold text-blue-600 bg-blue-50/50">หน่วยน้ำที่ใช้ (หน่วย)</th>
              <th className="px-4 py-3 border-b border-slate-200 font-bold text-amber-600 bg-amber-50/50">หน่วยไฟที่ใช้ (หน่วย)</th>
              <th className="px-4 py-3 border-b border-slate-200 font-bold">ยอดสุทธิ (ณ ปัจจุบัน)</th>
              <th className="px-4 py-3 border-b border-slate-200 font-bold">สถานะ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {bills.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-400 font-medium">
                  ยังไม่มีบิลในเดือนนี้ กรุณากดปุ่ม "สร้างบิลตั้งต้น"
                </td>
              </tr>
            ) : (
              bills.map((bill) => (
                <tr key={bill.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2 font-bold text-slate-800">
                    {bill.roomNumber}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {formatTHB(bill.rentAmount)}
                  </td>
                  {/* Water Input - Uncontrolled for performance */}
                  <td className="px-4 py-2 bg-blue-50/20">
                    <input
                      type="number"
                      defaultValue={bill.waterUnits || ''}
                      onChange={(e) => handleInputChange(bill.id, "water", e.target.value)}
                      className="w-full sm:w-24 px-2 py-1.5 text-sm border border-blue-200 rounded outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white shadow-inner transition-shadow text-slate-800 font-medium"
                      placeholder="0"
                    />
                  </td>
                  {/* Electric Input - Uncontrolled for performance */}
                  <td className="px-4 py-2 bg-amber-50/20">
                    <input
                      type="number"
                      defaultValue={bill.electricUnits || ''}
                      onChange={(e) => handleInputChange(bill.id, "electric", e.target.value)}
                      className="w-full sm:w-24 px-2 py-1.5 text-sm border border-amber-200 rounded outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 bg-white shadow-inner transition-shadow text-slate-800 font-medium"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-4 py-2 font-bold text-slate-800">
                    {formatTHB(bill.totalAmount)}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                      bill.status === 'UNPAID' ? 'bg-slate-100 text-slate-600' :
                      bill.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                      bill.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-rose-100 text-rose-700'
                    }`}>
                      {bill.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
