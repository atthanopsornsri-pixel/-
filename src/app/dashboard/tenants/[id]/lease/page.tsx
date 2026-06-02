"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function LeasePrintPage() {
  const params = useParams();
  const router = useRouter();
  const [tenant, setTenant] = useState<any>(null);

  const defaultTemplate = `ข้อตกลงและเงื่อนไขการเช่าห้องพัก:
1. ผู้เช่าตกลงชำระค่าเช่าล่วงหน้า 1 เดือน และเงินประกันความเสียหาย 1 เดือน ก่อนเข้าพัก
2. ห้ามส่งเสียงดังรบกวนผู้อื่นหลังเวลา 22.00 น.
3. ห้ามเลี้ยงสัตว์ทุกชนิดภายในห้องพักและบริเวณอาคาร
4. หากพบว่ามีการทำลายทรัพย์สินของทางหอพัก ผู้เช่าต้องชดใช้ตามมูลค่าจริง
5. การย้ายออกต้องแจ้งล่วงหน้าอย่างน้อย 30 วัน มิฉะนั้นจะถูกริบเงินประกัน`;

  useEffect(() => {
    const fetchTenant = async () => {
      const res = await fetch(`/api/tenants/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setTenant(data);
      }
    };
    fetchTenant();
  }, [params.id]);

  if (!tenant) return <div className="p-8 text-center">กำลังโหลดข้อมูลสัญญา...</div>;

  const property = tenant.room?.property;
  const terms = property?.leaseTemplate || defaultTemplate;

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 flex justify-center print:bg-white print:p-0">
      <div className="max-w-[210mm] w-full bg-white shadow-xl min-h-[297mm] p-10 md:p-16 print:shadow-none print:w-[210mm] print:h-[297mm] mx-auto relative">
        
        {/* Print Action Bar */}
        <div className="absolute top-4 right-4 flex gap-2 print:hidden">
          <Button variant="outline" onClick={() => router.back()}>กลับ</Button>
          <Button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            พิมพ์ / บันทึกเป็น PDF
          </Button>
        </div>

        {/* Header */}
        <div className="text-center mb-8 mt-8 print:mt-0">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">สัญญาเช่าห้องพัก</h1>
          <h2 className="text-xl font-semibold text-slate-600 mt-2">{property?.name}</h2>
          <p className="text-sm text-slate-500 mt-1">{property?.address}</p>
        </div>

        <div className="mb-6 text-slate-800 leading-relaxed text-justify indent-8">
          สัญญาฉบับนี้ทำขึ้นเมื่อวันที่ <span className="underline decoration-dotted">{new Date().toLocaleDateString("th-TH")}</span> ณ {property?.name} 
          ระหว่างข้าพเจ้า <span className="underline decoration-dotted">{(property as any)?.owner?.name || "เจ้าของหอพัก"}</span> ซึ่งต่อไปในสัญญานี้เรียกว่า <b>"ผู้ให้เช่า"</b> ฝ่ายหนึ่ง 
          และ <span className="underline decoration-dotted">{tenant.user.name || "-"}</span> ซึ่งต่อไปในสัญญานี้เรียกว่า <b>"ผู้เช่า"</b> อีกฝ่ายหนึ่ง 
          คู่สัญญาได้ตกลงกันมีข้อความดังต่อไปนี้
        </div>

        <div className="mb-6 text-slate-800 leading-relaxed text-justify indent-8">
          <b>ข้อ 1.</b> ผู้ให้เช่าตกลงให้เช่า และผู้เช่าตกลงรับเช่าห้องพักหมายเลข <b>{tenant.room?.number}</b> 
          ในอัตราค่าเช่าเดือนละ <b>{tenant.room?.rentPrice?.toLocaleString()}</b> บาท 
          โดยผู้เช่าได้วางเงินประกันจำนวน <span className="underline decoration-dotted">_________________</span> บาท ให้แก่ผู้ให้เช่าไว้เรียบร้อยแล้ว
        </div>

        <div className="mb-8">
          <h3 className="font-bold text-lg text-slate-800 mb-3 border-b border-slate-200 pb-1">ข้อตกลงและเงื่อนไขเพิ่มเติม (Lease Terms)</h3>
          <div className="text-slate-700 leading-relaxed whitespace-pre-wrap pl-4 border-l-4 border-slate-200">
            {terms}
          </div>
        </div>

        <div className="mb-16 text-slate-800 leading-relaxed text-justify indent-8">
          คู่สัญญาได้อ่านและเข้าใจข้อความในสัญญานี้โดยตลอดแล้ว เห็นว่าถูกต้องตรงตามความประสงค์ จึงได้ลงลายมือชื่อไว้เป็นสำคัญต่อหน้าพยาน
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-16 text-center mt-16 pt-8">
          <div>
            <div className="border-b border-slate-400 w-48 mx-auto mb-2 h-8"></div>
            <p className="text-slate-700">ลงชื่อ ผู้ให้เช่า (Owner)</p>
            <p className="text-sm text-slate-500 mt-1">(________________________)</p>
          </div>
          <div>
            <div className="border-b border-slate-400 w-48 mx-auto mb-2 h-8"></div>
            <p className="text-slate-700">ลงชื่อ ผู้เช่า (Tenant)</p>
            <p className="text-sm text-slate-500 mt-1">({tenant.user.name || "________________________"})</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-16 text-center mt-16 pt-8">
          <div>
            <div className="border-b border-slate-400 w-48 mx-auto mb-2 h-8"></div>
            <p className="text-slate-700">ลงชื่อ พยาน (Witness)</p>
            <p className="text-sm text-slate-500 mt-1">(________________________)</p>
          </div>
          <div>
            <div className="border-b border-slate-400 w-48 mx-auto mb-2 h-8"></div>
            <p className="text-slate-700">ลงชื่อ พยาน (Witness)</p>
            <p className="text-sm text-slate-500 mt-1">(________________________)</p>
          </div>
        </div>

        <div className="mt-16 pt-4 border-t border-slate-200 text-center text-slate-400 text-sm print:absolute print:bottom-8 print:w-full print:left-0">
          เอกสารสัญญาเช่าห้องพัก - พิมพ์จาก ApartmentOS Platform
        </div>
      </div>
    </div>
  );
}
