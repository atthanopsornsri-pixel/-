"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function BillPrintPage() {
  const params = useParams();
  const router = useRouter();
  const [bill, setBill] = useState<any>(null);

  useEffect(() => {
    const fetchBill = async () => {
      const res = await fetch("/api/bills");
      if (res.ok) {
        const data = await res.json();
        const found = data.find((b: any) => b.id === params.id);
        setBill(found);
      }
    };
    fetchBill();
  }, [params.id]);

  if (!bill) return <div className="p-8 text-center font-sans">กำลังโหลดข้อมูล...</div>;

  const docNo = `INV-${bill.year}${bill.month.toString().padStart(2, '0')}-${bill.id.substring(0, 4).toUpperCase()}`;

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center font-sans print:bg-white print:p-0 p-4 md:p-8">
      {/* 
        A4 Size is 210mm x 297mm. 
        Using fixed exact sizing with overflow-hidden ensures it fits on exactly 1 page.
      */}
      <div className="w-[210mm] h-[297mm] bg-white shadow-xl print:shadow-none mx-auto relative overflow-hidden flex flex-col p-8 md:p-12 print:p-8">
        
        {/* Print Action Bar - Hidden during print */}
        <div className="absolute top-4 right-4 flex gap-2 print:hidden z-10">
          <Button variant="outline" onClick={() => router.back()}>กลับ</Button>
          <Button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            พิมพ์ / บันทึกเป็น PDF
          </Button>
        </div>

        {/* Header Section */}
        <div className="flex justify-between items-start mb-6 pt-4">
          <div className="max-w-[60%]">
            <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-wide">{bill.room.property.name}</h1>
            <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap leading-relaxed">{bill.room.property.address || "ที่อยู่หอพัก (ตั้งค่าในหน้าจัดการหอพัก)"}</p>
            <p className="text-sm text-slate-600">เลขประจำตัวผู้เสียภาษี: <span className="text-slate-400 font-light">(กรุณาตั้งค่าในระบบ)</span></p>
          </div>
          <div className="text-right">
            <div className="inline-block border border-slate-800 text-slate-800 font-bold px-3 py-1 mb-2 text-sm tracking-widest">ต้นฉบับ (ORIGINAL)</div>
            <h2 className="text-2xl font-bold text-slate-800 uppercase">ใบแจ้งหนี้</h2>
            <h3 className="text-sm font-semibold text-slate-600">INVOICE / RECEIPT</h3>
          </div>
        </div>

        {/* Divider */}
        <div className="w-full h-0.5 bg-slate-800 mb-6"></div>

        {/* Document Info Grid */}
        <div className="grid grid-cols-2 gap-8 mb-8 text-sm">
          <div>
            <h4 className="font-bold text-slate-700 mb-2 border-b border-slate-200 pb-1">ข้อมูลลูกค้า (Customer Info)</h4>
            <div className="grid grid-cols-[100px_1fr] gap-1 mt-2">
              <span className="text-slate-500">ชื่อลูกค้า:</span>
              <span className="text-slate-800 font-bold">ห้องพักเลขที่ {bill.room.number}</span>
              
              <span className="text-slate-500">ที่อยู่:</span>
              <span className="text-slate-800">{bill.room.property.name} ห้อง {bill.room.number}</span>
            </div>
          </div>
          <div>
            <h4 className="font-bold text-slate-700 mb-2 border-b border-slate-200 pb-1">รายละเอียดเอกสาร (Document Info)</h4>
            <div className="grid grid-cols-[120px_1fr] gap-1 mt-2">
              <span className="text-slate-500">เลขที่เอกสาร:</span>
              <span className="text-slate-800 font-bold">{docNo}</span>
              
              <span className="text-slate-500">วันที่ออกเอกสาร:</span>
              <span className="text-slate-800">{new Date(bill.createdAt).toLocaleDateString("th-TH")}</span>
              
              <span className="text-slate-500">กำหนดชำระเงิน:</span>
              <span className="text-red-600 font-bold">{new Date(bill.dueDate).toLocaleDateString("th-TH")}</span>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="flex-1">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 text-slate-700">
                <th className="py-2 px-3 font-bold border border-slate-300 w-12 text-center">ลำดับ</th>
                <th className="py-2 px-3 font-bold border border-slate-300">รายการ (Description)</th>
                <th className="py-2 px-3 font-bold border border-slate-300 text-center w-24">หน่วย</th>
                <th className="py-2 px-3 font-bold border border-slate-300 text-right w-32">จำนวนเงิน (บาท)</th>
              </tr>
            </thead>
            <tbody className="text-slate-800">
              <tr>
                <td className="py-3 px-3 border border-slate-300 text-center">1</td>
                <td className="py-3 px-3 border border-slate-300">ค่าเช่าห้องพักประจำเดือน {bill.month}/{bill.year}</td>
                <td className="py-3 px-3 border border-slate-300 text-center">-</td>
                <td className="py-3 px-3 border border-slate-300 text-right">{bill.rentAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
              </tr>
              <tr>
                <td className="py-3 px-3 border border-slate-300 text-center">2</td>
                <td className="py-3 px-3 border border-slate-300">ค่าน้ำประปา</td>
                <td className="py-3 px-3 border border-slate-300 text-center">{bill.waterUnits || "-"}</td>
                <td className="py-3 px-3 border border-slate-300 text-right">{bill.waterAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
              </tr>
              <tr>
                <td className="py-3 px-3 border border-slate-300 text-center">3</td>
                <td className="py-3 px-3 border border-slate-300">ค่าไฟฟ้า</td>
                <td className="py-3 px-3 border border-slate-300 text-center">{bill.electricUnits || "-"}</td>
                <td className="py-3 px-3 border border-slate-300 text-right">{bill.electricAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
              </tr>
              {bill.commonFee > 0 && (
                <tr>
                  <td className="py-3 px-3 border border-slate-300 text-center">4</td>
                  <td className="py-3 px-3 border border-slate-300">ค่าส่วนกลาง</td>
                  <td className="py-3 px-3 border border-slate-300 text-center">-</td>
                  <td className="py-3 px-3 border border-slate-300 text-right">{bill.commonFee.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                </tr>
              )}
              {bill.parkingFee > 0 && (
                <tr>
                  <td className="py-3 px-3 border border-slate-300 text-center">5</td>
                  <td className="py-3 px-3 border border-slate-300">ค่าที่จอดรถ</td>
                  <td className="py-3 px-3 border border-slate-300 text-center">-</td>
                  <td className="py-3 px-3 border border-slate-300 text-right">{bill.parkingFee.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mt-4">
            <div className="w-1/2">
              <div className="flex justify-between py-1 px-3">
                <span className="text-slate-600 text-sm">รวมเป็นเงิน (Sub Total)</span>
                <span className="font-bold text-slate-800 text-sm">฿{bill.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between py-2 px-3 bg-slate-100 border border-slate-300 mt-2">
                <span className="font-bold text-slate-800">ยอดสุทธิ (Grand Total)</span>
                <span className="font-bold text-lg text-slate-800">฿{bill.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Note / Terms */}
        <div className="text-xs text-slate-500 mb-8 mt-4">
          <p className="font-bold text-slate-700 mb-1">หมายเหตุ (Remarks):</p>
          <ul className="list-disc list-inside">
            <li>กรุณาชำระเงินภายในวันที่กำหนด มิฉะนั้นอาจมีค่าปรับล่าช้าตามที่ระบุในสัญญา</li>
            <li>เอกสารฉบับนี้จะสมบูรณ์ต่อเมื่อบริษัท/หอพักได้รับเงินครบถ้วนและเช็คผ่านธนาคารเรียบร้อยแล้ว</li>
          </ul>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-12 text-center mt-auto pt-6 border-t border-slate-200">
          <div>
            <div className="border-b border-slate-400 w-40 mx-auto mb-2 h-10"></div>
            <p className="text-slate-800 text-sm font-bold">ผู้ออกเอกสาร / ผู้รับเงิน</p>
            <p className="text-xs text-slate-500 mt-1">วันที่ (Date) ____/____/____</p>
          </div>
          <div>
            <div className="border-b border-slate-400 w-40 mx-auto mb-2 h-10"></div>
            <p className="text-slate-800 text-sm font-bold">ผู้รับเอกสาร / ผู้จ่ายเงิน</p>
            <p className="text-xs text-slate-500 mt-1">วันที่ (Date) ____/____/____</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-slate-400 text-[10px] mt-8 pt-4">
          สร้างโดย ApartmentOS - เอกสารอิเล็กทรอนิกส์ (Electronic Document)
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
