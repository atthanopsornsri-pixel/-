"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function BillPrintPage() {
  const params = useParams();
  const router = useRouter();
  const [bill, setBill] = useState<any>(null);

  useEffect(() => {
    // In a real app, we'd fetch the specific bill by ID.
    // For this demo, we'll fetch all and find it, or just show a template if not found.
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

  if (!bill) return <div className="p-8 text-center">กำลังโหลดข้อมูล...</div>;

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 flex justify-center print:bg-white print:p-0">
      <div className="max-w-[210mm] w-full bg-white shadow-xl min-h-[297mm] p-10 md:p-16 print:shadow-none print:w-[210mm] print:h-[297mm] mx-auto relative">
        
        {/* Print Action Bar - Hidden during print */}
        <div className="absolute top-4 right-4 flex gap-2 print:hidden">
          <Button variant="outline" onClick={() => router.back()}>กลับ</Button>
          <Button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            พิมพ์ / บันทึกเป็น PDF
          </Button>
        </div>

        {/* Invoice Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-8 mt-8 print:mt-0">
          <div>
            <h1 className="text-4xl font-bold text-slate-800 tracking-tight uppercase">Invoice</h1>
            <h2 className="text-2xl font-semibold text-slate-600 mt-1">ใบแจ้งหนี้ / ใบเสร็จรับเงิน</h2>
          </div>
          <div className="text-right">
            <h3 className="text-xl font-bold text-slate-800">{bill.room.property.name}</h3>
            <p className="text-slate-500 mt-1">ห้องพักเลขที่: <span className="font-bold text-slate-800">{bill.room.number}</span></p>
            <p className="text-slate-500">ประจำเดือน: {bill.month}/{bill.year}</p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-8 mb-10">
          <div>
            <h4 className="font-bold text-slate-700 mb-2 border-b border-slate-200 pb-1">ข้อมูลผู้เช่า</h4>
            <p className="text-slate-800">ผู้เช่าห้อง {bill.room.number}</p>
            <p className="text-slate-500 mt-1 text-sm">อ้างอิงบิลเลขที่: {bill.id.substring(0, 8).toUpperCase()}</p>
          </div>
          <div className="text-right">
            <h4 className="font-bold text-slate-700 mb-2 border-b border-slate-200 pb-1">รายละเอียดเอกสาร</h4>
            <div className="grid grid-cols-2 text-sm mt-2">
              <span className="text-slate-500">วันที่ออกเอกสาร:</span>
              <span className="text-slate-800 font-medium">{new Date(bill.createdAt).toLocaleDateString("th-TH")}</span>
              <span className="text-slate-500 mt-1">กำหนดชำระเงิน:</span>
              <span className="text-red-600 font-bold mt-1">{new Date(bill.dueDate).toLocaleDateString("th-TH")}</span>
              <span className="text-slate-500 mt-1">สถานะ:</span>
              <span className={`font-bold mt-1 ${bill.status === "PAID" ? "text-green-600" : "text-slate-800"}`}>
                {bill.status === "PAID" ? "ชำระแล้ว (PAID)" : "ค้างชำระ (UNPAID)"}
              </span>
            </div>
          </div>
        </div>

        {/* Invoice Items Table */}
        <table className="w-full text-left border-collapse mb-10">
          <thead>
            <tr className="bg-slate-100 text-slate-700 uppercase text-sm">
              <th className="py-3 px-4 font-bold rounded-tl-lg">รายการ (Description)</th>
              <th className="py-3 px-4 font-bold text-center">หน่วย (Units)</th>
              <th className="py-3 px-4 font-bold text-right rounded-tr-lg">จำนวนเงิน (Amount)</th>
            </tr>
          </thead>
          <tbody className="text-slate-700">
            <tr className="border-b border-slate-100">
              <td className="py-4 px-4">ค่าเช่าห้องพัก (Room Rent)</td>
              <td className="py-4 px-4 text-center">-</td>
              <td className="py-4 px-4 text-right">฿{bill.rentAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-4 px-4">ค่าน้ำประปา (Water Supply)</td>
              <td className="py-4 px-4 text-center">{bill.waterUnits || "-"}</td>
              <td className="py-4 px-4 text-right">฿{bill.waterAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-4 px-4">ค่าไฟฟ้า (Electricity)</td>
              <td className="py-4 px-4 text-center">{bill.electricUnits || "-"}</td>
              <td className="py-4 px-4 text-right">฿{bill.electricAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            </tr>
            {bill.commonFee > 0 && (
              <tr className="border-b border-slate-100">
                <td className="py-4 px-4">ค่าส่วนกลาง (Common Fee)</td>
                <td className="py-4 px-4 text-center">-</td>
                <td className="py-4 px-4 text-right">฿{bill.commonFee.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
              </tr>
            )}
            {bill.parkingFee > 0 && (
              <tr className="border-b border-slate-100">
                <td className="py-4 px-4">ค่าที่จอดรถ (Parking Fee)</td>
                <td className="py-4 px-4 text-center">-</td>
                <td className="py-4 px-4 text-right">฿{bill.parkingFee.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
              </tr>
            )}
            {bill.internetFee > 0 && (
              <tr className="border-b border-slate-100">
                <td className="py-4 px-4">ค่าอินเทอร์เน็ต (Internet Fee)</td>
                <td className="py-4 px-4 text-center">-</td>
                <td className="py-4 px-4 text-right">฿{bill.internetFee.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
              </tr>
            )}
            {bill.otherFee > 0 && (
              <tr className="border-b border-slate-100">
                <td className="py-4 px-4">ค่าบริการอื่นๆ (Other Fees)</td>
                <td className="py-4 px-4 text-center">-</td>
                <td className="py-4 px-4 text-right">฿{bill.otherFee.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Total Section */}
        <div className="flex justify-end mb-16">
          <div className="w-1/2">
            <div className="flex justify-between py-2 border-b border-slate-200">
              <span className="font-medium text-slate-600">รวมเป็นเงิน (Sub Total)</span>
              <span className="font-bold text-slate-800">฿{bill.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between py-4 bg-slate-50 mt-2 px-4 rounded-lg border border-slate-200">
              <span className="font-bold text-lg text-slate-800">ยอดสุทธิ (Total Due)</span>
              <span className="font-bold text-xl text-blue-600">฿{bill.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-16 text-center mt-16 pt-8">
          <div>
            <div className="border-b border-slate-400 w-48 mx-auto mb-2 h-8"></div>
            <p className="text-slate-600">ผู้รับเงิน (Receiver)</p>
            <p className="text-sm text-slate-400">วันที่ (Date) ____/____/____</p>
          </div>
          <div>
            <div className="border-b border-slate-400 w-48 mx-auto mb-2 h-8"></div>
            <p className="text-slate-600">ผู้จ่ายเงิน (Payer)</p>
            <p className="text-sm text-slate-400">วันที่ (Date) ____/____/____</p>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-slate-200 text-center text-slate-400 text-sm">
          สร้างโดย ApartmentOS Platform - เอกสารฉบับนี้ถูกสร้างขึ้นด้วยระบบอิเล็กทรอนิกส์
        </div>
      </div>
    </div>
  );
}
