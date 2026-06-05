"use client";

import { useOptimistic, useTransition, useState } from "react";
import { approveBill, rejectBill, approvePartialBill } from "@/app/actions/payment-approval";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Search, Loader2 } from "lucide-react";

export type ApprovalBill = {
  id: string;
  roomNumber: string;
  totalAmount: number;
  signedSlipUrl: string;
  month: number;
  year: number;
};

export function ApprovalCards({ initialBills }: { initialBills: ApprovalBill[] }) {
  const [isPending, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Optimistic UI to remove the card immediately
  const [optimisticBills, removeOptimisticBill] = useOptimistic(
    initialBills,
    (state, billIdToRemove: string) => state.filter((b) => b.id !== billIdToRemove)
  );

  // Modal State
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  const handleApprove = async (billId: string) => {
    setLoadingId(billId);
    startTransition(() => {
      removeOptimisticBill(billId);
    });
    await approveBill(billId);
    setLoadingId(null);
  };

  const handleReject = async (billId: string) => {
    // Optional: Could prompt for a reason here. 
    // For high-speed verification, we'll just reject directly.
    setLoadingId(billId);
    startTransition(() => {
      removeOptimisticBill(billId);
    });
    await rejectBill(billId, "Slip Invalid or Unreadable");
    setLoadingId(null);
  };

  const handlePartialApprove = async (billId: string, total: number) => {
    const inputAmount = window.prompt(`ยอดโอนตามบิลคือ ${formatTHB(total)}\nกรุณาระบุยอดที่ผู้เช่าโอนมาจริง (จ่ายไม่ครบ):`);
    if (!inputAmount) return;
    
    const paidAmount = parseFloat(inputAmount);
    if (isNaN(paidAmount) || paidAmount <= 0) {
      alert("ระบุยอดเงินไม่ถูกต้อง");
      return;
    }
    if (paidAmount >= total) {
      alert("ถ้ายอดเงินครบถ้วน ให้กดยืนยันปกติครับ");
      return;
    }

    setLoadingId(billId);
    startTransition(() => {
      removeOptimisticBill(billId);
    });
    await approvePartialBill(billId, paidAmount);
    setLoadingId(null);
  };

  const formatTHB = (amount: number) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);
  };

  if (optimisticBills.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-50 border border-slate-200 rounded-3xl mt-6">
        <CheckCircle className="w-16 h-16 text-emerald-400 mb-4" />
        <h2 className="text-xl font-bold text-slate-700">ไม่มีสลิปตกค้าง!</h2>
        <p className="text-slate-500 mt-2">ยอดเยี่ยมมาก คุณตรวจสลิปครบหมดแล้ว</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
        {optimisticBills.map((bill) => (
          <div key={bill.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col transition-all hover:shadow-md">
            
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <span className="font-bold text-slate-800 text-lg">ห้อง {bill.roomNumber}</span>
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full">รอตรวจสอบ</span>
            </div>

            {/* Slip Image */}
            <div className="relative group cursor-pointer bg-slate-100 aspect-[3/4] overflow-hidden" onClick={() => setEnlargedImage(bill.signedSlipUrl)}>
              {bill.signedSlipUrl ? (
                // Using standard img tag here instead of next/image to avoid remote pattern configuration overhead for dynamic signed URLs
                <img 
                  src={bill.signedSlipUrl} 
                  alt={`Slip for Room ${bill.roomNumber}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">ไม่มีรูปภาพ</div>
              )}
              
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="bg-white/90 text-slate-900 rounded-full p-3 flex items-center gap-2 font-semibold shadow-lg">
                  <Search className="w-5 h-5" /> ขยายรูป
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 flex flex-col flex-grow">
              <div className="text-sm text-slate-500 font-medium">ยอดโอน (เดือน {bill.month}/{bill.year})</div>
              <div className="text-2xl font-black text-slate-800 mb-4">{formatTHB(bill.totalAmount)}</div>
              
              <div className="mt-auto flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    onClick={() => handleReject(bill.id)}
                    disabled={loadingId === bill.id}
                    variant="outline" 
                    className="w-full border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-bold shadow-sm"
                  >
                    {loadingId === bill.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />} ปฏิเสธ
                  </Button>
                  <Button 
                    onClick={() => handleApprove(bill.id)}
                    disabled={loadingId === bill.id}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
                  >
                    {loadingId === bill.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />} ยืนยัน
                  </Button>
                </div>
                <Button 
                    onClick={() => handlePartialApprove(bill.id, bill.totalAmount)}
                    disabled={loadingId === bill.id}
                    variant="ghost"
                    className="w-full text-amber-600 hover:bg-amber-50 hover:text-amber-700 text-xs font-semibold"
                  >
                    ลูกบ้านโอนยอดไม่ครบ? (ระบุยอดจริง)
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox / Modal for Image Enlargement */}
      {enlargedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-pointer backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setEnlargedImage(null)}
        >
          <div className="relative max-w-3xl w-full max-h-[90vh] flex items-center justify-center">
            <button className="absolute -top-12 right-0 text-white hover:text-slate-300 transition-colors">
              <XCircle className="w-10 h-10" />
            </button>
            <img 
              src={enlargedImage} 
              alt="Enlarged Slip" 
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()} 
            />
          </div>
        </div>
      )}
    </>
  );
}
