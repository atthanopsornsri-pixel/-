"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

import { QRCodeSVG } from "qrcode.react";
import generatePayload from "promptpay-qr";

export default function BillPrintPage() {
  const params = useParams();
  const router = useRouter();
  const [bill, setBill] = useState<any>(null);
  const [qrPayload, setQrPayload] = useState<string>("");

  useEffect(() => {
    async function fetchBill() {
      const res = await fetch("/api/bills");
      if (res.ok) {
        const data = await res.json();
        const found = data.find((b: any) => b.id === params.id);
        setBill(found);
        
        if (found?.room?.property?.promptPayNo) {
          const payload = generatePayload(found.room.property.promptPayNo, { amount: found.totalAmount });
          setQrPayload(payload);
        }
      }
    };
    fetchBill();
  }, [params.id]);

  if (!bill) return <div className="p-8 text-center font-sans">กำลังโหลดข้อมูล...</div>;

  const prop = bill.room.property;
  const docNo = `INV-${bill.year}${bill.month.toString().padStart(2, '0')}-${bill.id.substring(0, 4).toUpperCase()}`;
  const displayCompanyName = prop.companyName || prop.name;

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center font-sarabun print:bg-white print:p-0 p-4 md:p-8 text-slate-800">
      {/* 
        A4 1/3 Size is approx 210mm x 99mm. 
        Using fixed exact sizing with overflow-hidden ensures it fits perfectly.
      */}
      <div className="w-[210mm] h-[99mm] bg-white shadow-xl print:shadow-none mx-auto relative overflow-hidden flex flex-col p-4">
        
        {/* Print Action Bar - Hidden during print */}
        <div className="absolute top-2 right-2 flex gap-2 print:hidden z-10">
          <Button variant="outline" size="sm" onClick={() => router.back()} className="font-sans">กลับ</Button>
          <Button size="sm" onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white font-sans">
            พิมพ์ / PDF
          </Button>
        </div>

        {/* Header Section */}
        <div className="flex justify-between items-start border-b-2 border-slate-800 pb-1 mb-1">
          <div className="max-w-[60%]">
            <h1 className="text-2xl font-bold uppercase leading-none mb-1">{displayCompanyName}</h1>
            <p className="text-[13px] leading-tight">{prop.address || "ที่อยู่หอพัก"}</p>
            <p className="text-[13px] leading-tight mt-0.5">เลขประจำตัวผู้เสียภาษี: {prop.taxId || "ไม่ได้ระบุ"}</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold uppercase leading-none">ใบแจ้งหนี้ / INVOICE</h2>
            <div className="text-[13px] mt-1">
              เลขที่ (No): <span className="font-bold">{docNo}</span><br/>
              วันที่ (Date): {new Date(bill.createdAt).toLocaleDateString("th-TH")}<br/>
              กำหนดชำระ (Due): <span className="font-bold text-red-600">{new Date(bill.dueDate).toLocaleDateString("th-TH")}</span>
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="flex justify-between items-center text-[15px] mb-1 px-1 bg-slate-50 py-0.5 border border-slate-200">
          <div><b>ห้องพัก (Room):</b> <span className="text-lg font-bold ml-1">{bill.room.number}</span></div>
          <div><b>ชื่อลูกค้า (Name):</b> ลูกบ้านห้อง {bill.room.number}</div>
        </div>

        {/* Main Content Area: Left (Table) + Right (QR) */}
        <div className="flex-1 flex gap-3 h-full overflow-hidden">
          {/* Left: Items Table */}
          <div className="w-[65%] flex flex-col h-full">
            <table className="w-full text-left border-collapse text-[14px]">
              <thead>
                <tr className="border-b-2 border-slate-300">
                  <th className="py-0.5">รายการ (Description)</th>
                  <th className="py-0.5 text-center w-12">หน่วย</th>
                  <th className="py-0.5 text-right w-24">จำนวนเงิน (บาท)</th>
                </tr>
              </thead>
              <tbody className="align-top">
                <tr>
                  <td className="py-0.5 leading-tight">ค่าเช่าห้องพักประจำเดือน {bill.month}/{bill.year}</td>
                  <td className="py-0.5 text-center leading-tight">-</td>
                  <td className="py-0.5 text-right leading-tight">{bill.rentAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                </tr>
                <tr>
                  <td className="py-0.5 leading-tight">ค่าน้ำประปา</td>
                  <td className="py-0.5 text-center leading-tight">{bill.waterUnits || "-"}</td>
                  <td className="py-0.5 text-right leading-tight">{bill.waterAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                </tr>
                <tr>
                  <td className="py-0.5 leading-tight">ค่าไฟฟ้า</td>
                  <td className="py-0.5 text-center leading-tight">{bill.electricUnits || "-"}</td>
                  <td className="py-0.5 text-right leading-tight">{bill.electricAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                </tr>
                {bill.commonFee > 0 && (
                  <tr>
                    <td className="py-0.5 leading-tight">ค่าส่วนกลาง</td>
                    <td className="py-0.5 text-center leading-tight">-</td>
                    <td className="py-0.5 text-right leading-tight">{bill.commonFee.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  </tr>
                )}
                {bill.parkingFee > 0 && (
                  <tr>
                    <td className="py-0.5 leading-tight">ค่าที่จอดรถ</td>
                    <td className="py-0.5 text-center leading-tight">-</td>
                    <td className="py-0.5 text-right leading-tight">{bill.parkingFee.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  </tr>
                )}
              </tbody>
            </table>
            
            <div className="mt-auto border-t border-slate-800 pt-0.5 flex justify-between items-center font-bold text-[17px] text-slate-900 bg-slate-100 px-1">
               <span>รวมเป็นเงินสุทธิ (Net Total)</span>
               <span>฿{bill.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
            
            {/* Note & Signature left */}
            <div className="flex justify-between items-end mt-1">
               <div className="text-[11px] text-slate-500 italic leading-tight max-w-[60%]">
                 * กรุณาชำระเงินภายในวันที่กำหนด เพื่อหลีกเลี่ยงค่าปรับล่าช้า<br/>
                 * เอกสารนี้จะสมบูรณ์เมื่อได้รับเงินครบถ้วนแล้ว
               </div>
               <div className="text-center w-[35%]">
                 <div className="border-b border-slate-400 w-full mb-0.5 h-6 relative flex items-end justify-center">
                   {prop.signatureUrl && (
                     // eslint-disable-next-line @next/next/no-img-element
                     <img src={prop.signatureUrl} alt="Signature" className="h-8 object-contain mix-blend-multiply absolute bottom-0" />
                   )}
                 </div>
                 <p className="text-[10px] text-slate-600">ผู้ออกเอกสาร</p>
               </div>
            </div>
          </div>

          {/* Right: QR Codes */}
          <div className="w-[35%] flex gap-1.5 border-l-2 border-dashed border-slate-300 pl-3">
            <div className="flex-1 bg-white border border-slate-300 rounded p-1 flex flex-col items-center text-center">
              <p className="text-[11px] font-bold mb-1 text-[#003399] leading-tight">1. สแกนจ่าย Thai QR</p>
              {qrPayload ? (
                <>
                  <QRCodeSVG value={qrPayload} size={50} level="M" />
                  <p className="text-[10px] font-bold mt-1 leading-tight text-slate-800 w-[60px] truncate">{prop.promptPayName || prop.promptPayNo}</p>
                </>
              ) : (
                <div className="text-[10px] text-slate-400 h-[50px] flex items-center text-center">ยังไม่ตั้งค่า</div>
              )}
            </div>
            <div className="flex-1 bg-white border border-slate-300 rounded p-1 flex flex-col items-center text-center">
              <p className="text-[11px] font-bold mb-1 leading-tight">2. สแกนส่งสลิป</p>
              <QRCodeSVG 
                value={typeof window !== "undefined" ? `${window.location.origin}/pay/${bill.id}` : `https://JadHor OS.com/pay/${bill.id}`} 
                size={50} 
                level="L" 
              />
              <p className="text-[9px] mt-1 leading-tight text-slate-600">ระบบอัตโนมัติ</p>
            </div>
          </div>
        </div>

      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            margin: 0;
            padding: 0;
            background: white;
          }
        }
      `}</style>
    </div>
  );
}
