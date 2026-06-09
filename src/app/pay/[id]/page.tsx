"use client";
import { toast } from "sonner";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Utility to compress image natively
const compressImage = (file: File, maxWidth = 1000): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        
        ctx?.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export default function PayBillPage() {
  const params = useParams();
  const [bill, setBill] = useState<any>(null);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const fetchBill = async () => {
      try {
        const res = await fetch(`/api/public/bills/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setBill(data);
          if (data.status === "PENDING" || data.status === "PAID") {
             // Already paid or pending
             setSlipPreview(data.slipUrl);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchBill();
  }, [params.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSlipFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setSlipPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slipFile || !bill) return;
    setIsUploading(true);

    try {
      const compressedSlipUrl = await compressImage(slipFile);
      
      const res = await fetch(`/api/bills/${bill.id}/pay`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slipUrl: compressedSlipUrl }),
      });

      if (res.ok) {
        setIsSuccess(true);
        const updated = await res.json();
        setBill(updated);
        if (updated.autoVerified && updated.status === "PAID") {
          toast.success("ระบบตรวจสอบสลิปอัตโนมัติแล้ว — ชำระเงินสำเร็จ ✓");
        }
      } else {
        const err = await res.json().catch(() => null);
        if (err?.code === "DUPLICATE_SLIP") {
          toast.error("สลิปนี้เคยถูกใช้ชำระเงินไปแล้ว ไม่สามารถใช้ซ้ำได้");
        } else if (err?.code === "AMOUNT_MISMATCH") {
          toast.error(err.message || "ยอดเงินในสลิปไม่ตรงกับยอดบิล กรุณาตรวจสอบและลองใหม่");
        } else {
          toast.error(err?.message || "เกิดข้อผิดพลาดในการอัปโหลดหลักฐาน");
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    }
    setIsUploading(false);
  };

  if (!bill) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="animate-pulse text-slate-500 font-medium">กำลังโหลดข้อมูลบิล...</div>
      </div>
    );
  }

  const prop = bill.room.property;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 sm:p-8 font-sans">
      <div className="w-full max-w-md bg-white rounded-[32px] shadow-xl overflow-hidden mt-4">
        
        {/* Header */}
        <div className="bg-[#1D1D1F] p-6 text-center text-white">
          <h1 className="text-xl font-bold tracking-tight mb-1">{prop.name}</h1>
          <p className="text-sm text-slate-400">ห้อง {bill.room.number}</p>
        </div>

        <div className="p-6">
          <div className="text-center mb-6">
            <p className="text-sm text-slate-500 mb-1">ยอดชำระประจำเดือน {bill.month}/{bill.year + 543}</p>
            <h2 className="text-4xl font-extrabold text-[#007AFF]">฿{bill.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</h2>
          </div>

          <div className="space-y-3 mb-8 text-sm">
            <div className="flex justify-between p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-500">ค่าเช่า</span>
              <span className="font-semibold text-slate-800">฿{bill.rentAmount.toLocaleString()}</span>
            </div>
            {(bill.waterAmount > 0 || bill.electricAmount > 0) && (
              <div className="flex justify-between p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-500">ค่าน้ำ/ค่าไฟ</span>
                <span className="font-semibold text-slate-800">฿{(bill.waterAmount + bill.electricAmount).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-500">กำหนดชำระ</span>
              <span className="font-bold text-red-500">{new Date(bill.dueDate).toLocaleDateString("th-TH")}</span>
            </div>
          </div>

          {/* Status and Action */}
          {bill.status === "UNPAID" && !isSuccess ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="p-4 border border-dashed border-slate-300 rounded-2xl bg-slate-50 text-center">
                <Label htmlFor="slip" className="cursor-pointer block">
                  {slipPreview ? (
                    <div className="space-y-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={slipPreview} alt="Slip preview" className="mx-auto h-48 object-contain rounded-xl shadow-sm" />
                      <div className="text-sm text-[#007AFF] font-medium">เปลี่ยนรูปสลิป</div>
                    </div>
                  ) : (
                    <div className="py-6">
                      <div className="w-12 h-12 bg-blue-100 text-[#007AFF] rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      </div>
                      <p className="font-bold text-slate-700 mb-1">อัปโหลดสลิปโอนเงิน</p>
                      <p className="text-xs text-slate-500">แตะเพื่อเลือกรูปภาพจากอัลบั้ม</p>
                    </div>
                  )}
                  <Input 
                    id="slip" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleFileChange}
                    required
                  />
                </Label>
              </div>

              <Button 
                type="submit" 
                disabled={!slipFile || isUploading}
                className="w-full rounded-full h-12 bg-[#007AFF] hover:bg-[#0066CC] text-white font-bold text-base shadow-lg transition-transform hover:-translate-y-0.5"
              >
                {isUploading ? "กำลังอัปโหลด..." : "ส่งหลักฐานการชำระเงิน"}
              </Button>
            </form>
          ) : (
            <div className="text-center p-6 bg-green-50 rounded-2xl border border-green-100 animate-in zoom-in-95 duration-500">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 className="text-xl font-bold text-green-700 mb-2">
                {bill.status === "PAID" ? "ชำระเงินสำเร็จ" : "ส่งหลักฐานสำเร็จ"}
              </h3>
              <p className="text-slate-600 text-sm">
                {bill.status === "PAID"
                  ? bill.autoVerified
                    ? "ระบบตรวจสอบสลิปอัตโนมัติแล้ว ✓ ยืนยันการชำระเงินเรียบร้อย ขอบคุณครับ"
                    : "เจ้าของหอพักตรวจสอบและยืนยันการชำระเงินเรียบร้อยแล้ว ขอบคุณครับ"
                  : bill.status === "PARTIAL"
                  ? "ระบบได้รับยอดชำระบางส่วนแล้ว โปรดติดต่อเจ้าของหอพักเรื่องยอดคงเหลือ"
                  : "ระบบได้รับหลักฐานของคุณแล้ว โปรดรอเจ้าของหอพักตรวจสอบความถูกต้อง"}
              </p>
              {slipPreview && (
                <div className="mt-6 opacity-70">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={slipPreview} alt="Slip" className="mx-auto h-32 object-contain rounded-lg shadow-sm" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
