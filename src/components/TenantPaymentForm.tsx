"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { submitPaymentSlip } from "@/app/actions/tenant-payment";
import { Button } from "@/components/ui/button";
import { Loader2, Camera, AlertCircle } from "lucide-react";

// The Submit button isolated to use useFormStatus correctly
function SubmitButton({ fileSelected }: { fileSelected: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button 
      type="submit" 
      disabled={pending || !fileSelected}
      className={`w-full h-14 font-bold rounded-xl text-lg shadow-lg transition-all mt-4 ${
        fileSelected && !pending 
          ? "bg-[#00C300] hover:bg-[#00B000] text-white shadow-[#00C300]/30" 
          : "bg-slate-200 text-slate-400 shadow-none"
      }`}
    >
      {pending ? (
        <span className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> กำลังอัปโหลด...
        </span>
      ) : (
        "ยืนยันการชำระเงิน"
      )}
    </Button>
  );
}

export function TenantPaymentForm({ billId }: { billId: string }) {
  const [state, formAction] = useActionState(submitPaymentSlip, { success: false, error: "", message: "" } as any);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setFilePreview(url);
    } else {
      setFilePreview(null);
    }
  };

  useEffect(() => {
    // Cleanup URL object when unmounted or changed
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview);
    };
  }, [filePreview]);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="billId" value={billId} />
      
      {state.error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{state.error}</p>
        </div>
      )}

      {/* The Pro-Tip UX: capture="environment" */}
      <div 
        className={`relative border-2 border-dashed rounded-2xl p-6 transition-all cursor-pointer overflow-hidden ${
          filePreview ? "border-[#00C300] bg-emerald-50/50" : "border-slate-300 bg-slate-50 hover:bg-slate-100"
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <input 
          ref={fileInputRef}
          type="file" 
          name="file" 
          accept="image/*" 
          capture="environment" // Opens rear camera by default on mobile
          onChange={handleFileChange}
          className="hidden" 
        />
        
        {filePreview ? (
          <div className="flex flex-col items-center">
            <div className="w-full aspect-[3/4] max-w-[200px] bg-slate-200 rounded-xl overflow-hidden shadow-sm mb-3">
              <img src={filePreview} alt="Slip Preview" className="w-full h-full object-cover" />
            </div>
            <span className="text-sm font-semibold text-emerald-600 underline">แตะเพื่อเปลี่ยนรูป</span>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center py-6">
            <div className="w-16 h-16 bg-slate-200 text-slate-500 rounded-full flex items-center justify-center mb-4">
              <Camera className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-slate-700 text-lg">แนบสลิปโอนเงิน</h3>
            <p className="text-slate-500 text-sm mt-1">ถ่ายรูป หรือ เลือกจากอัลบั้ม</p>
          </div>
        )}
      </div>

      <SubmitButton fileSelected={!!filePreview} />
    </form>
  );
}
