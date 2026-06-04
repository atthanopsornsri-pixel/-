"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { QRCodeSVG } from "qrcode.react";
import generatePayload from "promptpay-qr";

export default function MyBillsPage() {
  const [bills, setBills] = useState<any[]>([]);
  const [selectedBill, setSelectedBill] = useState<any | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Replace this with the owner's actual PromptPay number in a real app
  const promptPayNumber = "0999999999"; 

  useEffect(() => {
    fetchBills();
  }, []);

  async function fetchBills() {
    const res = await fetch("/api/bills");
    if (res.ok) {
      const data = await res.json();
      setBills(data);
    }
  };

  const handlePay = (bill: any) => {
    setSelectedBill(bill);
    setIsPaying(true);
  };

  const submitSlip = async () => {
    if (!slipFile) return alert("กรุณาแนบสลิปก่อนยืนยัน");
    setIsUploading(true);

    try {
      // 1. Upload the file
      const formData = new FormData();
      formData.append("file", slipFile);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      let slipUrl = "";
      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        slipUrl = uploadData.url;
      }

      // 2. Simulate sending to SlipOk API and recording the payment
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billId: selectedBill.id,
          amount: selectedBill.totalAmount,
          slipUrl,
        }),
      });

      if (res.ok) {
        alert("ตรวจสอบสลิปอัตโนมัติสำเร็จ! ชำระเงินเรียบร้อยแล้ว");
        setIsPaying(false);
        setSlipFile(null);
        setSelectedBill(null);
        fetchBills();
      } else {
        alert("ตรวจสอบสลิปไม่ผ่าน กรุณาลองใหม่อีกครั้ง");
      }
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการตรวจสอบสลิป");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">บิลค่าเช่าของฉัน</h1>

      {isPaying && selectedBill ? (
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>ชำระเงินค่าเช่า (เดือน {selectedBill.month}/{selectedBill.year})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-sm text-slate-500 mb-2">ยอดที่ต้องชำระ</p>
              <p className="text-4xl font-bold text-blue-600">฿{selectedBill.totalAmount.toLocaleString()}</p>
            </div>
            
            <div className="bg-slate-50 p-6 rounded-xl flex flex-col items-center justify-center border border-slate-200">
              <p className="text-sm text-slate-600 mb-4 text-center">สแกน QR Code ด้านล่างเพื่อชำระเงินผ่านแอปธนาคาร</p>
              <div className="bg-white p-4 rounded-xl shadow-sm inline-block">
                <QRCodeSVG value={generatePayload(promptPayNumber, { amount: selectedBill.totalAmount })} size={200} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">อัปโหลดสลิปเพื่อยืนยัน (ตรวจด้วย AI อัตโนมัติ)</label>
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => setSlipFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsPaying(false)}>ยกเลิก</Button>
            <Button onClick={submitSlip} disabled={!slipFile || isUploading}>
              {isUploading ? "กำลังตรวจสอบสลิป..." : "ยืนยันการชำระเงิน"}
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bills.map(bill => (
            <Card key={bill.id} className={bill.status === "PAID" ? "opacity-75" : "border-blue-200 shadow-md"}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">บิลเดือน {bill.month}/{bill.year}</CardTitle>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    bill.status === "PAID" ? "bg-green-100 text-green-700" :
                    bill.status === "UNPAID" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {bill.status === "PAID" ? "ชำระแล้ว" : bill.status === "UNPAID" ? "ค้างชำระ" : bill.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-3xl font-bold text-slate-800">
                  ฿{bill.totalAmount.toLocaleString()}
                </div>
                
                <div className="space-y-1 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="flex justify-between">
                    <span>ค่าห้อง</span>
                    <span>฿{bill.rentAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ค่าน้ำ</span>
                    <span>฿{bill.waterAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ค่าไฟ</span>
                    <span>฿{bill.electricAmount.toLocaleString()}</span>
                  </div>
                  {(bill.commonFee > 0 || bill.parkingFee > 0 || bill.internetFee > 0 || bill.otherFee > 0) && (
                    <div className="flex justify-between font-medium text-slate-500 pt-1 border-t border-slate-200 mt-1">
                      <span>ค่าใช้จ่ายอื่นๆ</span>
                      <span>฿{(bill.commonFee + bill.parkingFee + bill.internetFee + bill.otherFee).toLocaleString()}</span>
                    </div>
                  )}
                </div>
                
                <div className="text-sm text-red-500 font-medium flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  กำหนดชำระ: {new Date(bill.dueDate).toLocaleDateString("th-TH")}
                </div>
              </CardContent>
              {bill.status === "UNPAID" && (
                <CardFooter>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => handlePay(bill)}>
                    ชำระเงิน (QR Code)
                  </Button>
                </CardFooter>
              )}
            </Card>
          ))}
          
          {bills.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
              ไม่มีบิลเรียกเก็บในขณะนี้
            </div>
          )}
        </div>
      )}
    </div>
  );
}
