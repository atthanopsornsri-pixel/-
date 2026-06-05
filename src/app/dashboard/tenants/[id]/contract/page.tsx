"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function GenerateContractPage() {
  const params = useParams();
  const router = useRouter();
  const [tenant, setTenant] = useState<any>(null);
  const [finalContract, setFinalContract] = useState("");

  useEffect(() => {
    async function fetchTenant() {
      const res = await fetch(`/api/tenants/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setTenant(data);
        
        const property = data.room?.property;
        let terms = property?.leaseTemplate || "ยังไม่ได้ตั้งค่าแม่แบบสัญญาเช่า กรุณากลับไปที่หน้าตั้งค่าสัญญา";
        
        if (terms && terms !== "ยังไม่ได้ตั้งค่าแม่แบบสัญญาเช่า กรุณากลับไปที่หน้าตั้งค่าสัญญา") {
          terms = terms.replace(/{{TENANT_NAME}}/g, data.user?.name || "________________");
          terms = terms.replace(/{{ROOM_NUMBER}}/g, data.room?.number || "");
          terms = terms.replace(/{{RENT_PRICE}}/g, data.room?.rentPrice?.toString() || "");
          terms = terms.replace(/{{DEPOSIT_AMOUNT}}/g, data.depositAmount?.toString() || "0");
          terms = terms.replace(/{{LEASE_START}}/g, data.leaseStart ? new Date(data.leaseStart).toLocaleDateString("th-TH", { dateStyle: 'long' }) : "________________");
          terms = terms.replace(/{{START_DATE}}/g, data.leaseStart ? new Date(data.leaseStart).toLocaleDateString("th-TH", { dateStyle: 'long' }) : "________________");
          terms = terms.replace(/{{ID_CARD}}/g, data.idCardNumber || "________________");
        }
        
        setFinalContract(terms);
      }
    };
    fetchTenant();
  }, [params.id]);

  if (!tenant) return <div className="p-8 text-center text-gray-500">กำลังประมวลผลสัญญา...</div>;

  const property = tenant.room?.property;

  return (
    <div className="min-h-screen bg-gray-200 p-8 flex flex-col items-center">
      
      {/* ปุ่มกดพิมพ์ (จะถูกซ่อนเวลาพิมพ์จริง) */}
      <div className="w-full max-w-3xl flex justify-between mb-4 print:hidden">
        <button 
          onClick={() => router.back()} 
          className="bg-white text-gray-700 px-6 py-2 rounded-md font-medium shadow-sm hover:bg-gray-50"
        >
          กลับ
        </button>
        <button 
          onClick={() => window.print()} 
          className="bg-blue-600 text-white px-6 py-2 rounded-md font-bold shadow-md hover:bg-blue-700"
        >
          🖨️ พิมพ์ / บันทึกเป็น PDF
        </button>
      </div>

      {/* หน้ากระดาษ A4 */}
      <div className="w-full max-w-3xl bg-white shadow-xl min-h-[1056px] p-12 print:shadow-none print:p-0 font-sarabun text-lg">
        <h1 className="text-3xl font-bold text-center mb-2 text-black">สัญญาเช่าห้องพักอาศัย</h1>
        <h2 className="text-xl font-bold text-center mb-8 text-black">{property?.name}</h2>
        
        {/* ข้อมูลเบื้องต้นที่สร้างให้แบบอัตโนมัติ */}
        <p className="mb-4 text-justify">
          สัญญาฉบับนี้ทำขึ้นระหว่าง <strong>{property?.name || "________________"}</strong> (ผู้ให้เช่า) 
          และ <strong>{tenant.user?.name || "________________"}</strong> (ผู้เช่า) ผู้ถือบัตรประชาชนเลขที่ <strong>{tenant.idCardNumber || "________________"}</strong>
        </p>
        <p className="mb-8 text-justify">
          ตกลงเช่าห้องพักหมายเลข <strong>{tenant.room?.number || "____"}</strong> 
          ในอัตราค่าเช่าเดือนละ <strong>{tenant.room?.rentPrice?.toLocaleString() || "________________"}</strong> บาท 
          โดยมีเงินประกันการเช่าจำนวน <strong>{tenant.depositAmount ? tenant.depositAmount.toLocaleString() : "0"}</strong> บาท 
          โดยสัญญาเริ่มต้นตั้งแต่วันที่ <strong>{tenant.leaseStart ? new Date(tenant.leaseStart).toLocaleDateString("th-TH", { dateStyle: 'long' }) : "________________"}</strong> เป็นต้นไป
        </p>

        <hr className="my-8 border-gray-300" />

        {/* แสดงข้อความสัญญาที่แทนที่ตัวแปรแล้ว */}
        <div className="whitespace-pre-wrap text-black text-lg leading-relaxed text-justify">
          {finalContract}
        </div>

        <div className="mt-32 flex justify-between px-12 break-inside-avoid">
          <div className="text-center">
            <p>ลงชื่อ...................................................</p>
            <p className="mt-2">( {tenant.user?.name || "________________"} )</p>
            <p className="text-sm mt-1 text-gray-500">ผู้เช่า</p>
          </div>
          <div className="text-center">
            <p>ลงชื่อ...................................................</p>
            <p className="mt-2">( ผู้จัดการหอพัก )</p>
            <p className="text-sm mt-1 text-gray-500">ผู้ให้เช่า</p>
          </div>
        </div>
      </div>

      {/* CSS พิเศษสำหรับซ่อนสิ่งที่ไม่จำเป็นตอนกดพิมพ์ */}
      <style dangerouslySetInnerHTML={{__html: \`
        @media print {
          body { background-color: white !important; }
          @page { margin: 20mm; }
        }
      \`}} />
    </div>
  );
}
