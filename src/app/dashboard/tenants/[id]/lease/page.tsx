"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function LeasePrintPage() {
  const params = useParams();
  const router = useRouter();
  const [tenant, setTenant] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchTenant() {
      const res = await fetch(`/api/tenants/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setTenant(data);
      }
    };
    fetchTenant();
  }, [params.id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Simulate upload (in reality you'd upload to cloud storage like Supabase/S3 and get a URL)
    // Here we'll convert it to base64 for simplicity since it's a demo
    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        
        const res = await fetch(`/api/tenants/${params.id}/contract-upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pdfUrl: base64String }),
        });

        if (res.ok) {
          alert("อัปโหลดสัญญาเช่าเรียบร้อยแล้ว");
          window.location.reload();
        } else {
          alert("เกิดข้อผิดพลาดในการอัปโหลด");
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาด");
    } finally {
      setIsUploading(false);
    }
  };

  if (!tenant) return <div className="p-8 text-center">กำลังโหลดข้อมูลสัญญา...</div>;

  const property = tenant.room?.property;
  
  // Apply the same placeholder replacement logic as the tenant side
  let terms = property?.leaseTemplate || "";
  if (terms) {
    terms = terms.replace(/{{TENANT_NAME}}/g, tenant.user?.name || "________________");
    terms = terms.replace(/{{ROOM_NUMBER}}/g, tenant.room?.number || "");
    terms = terms.replace(/{{RENT_PRICE}}/g, tenant.room?.rentPrice?.toString() || "");
    terms = terms.replace(/{{DEPOSIT_AMOUNT}}/g, tenant.depositAmount?.toString() || "0");
    terms = terms.replace(/{{LEASE_START}}/g, tenant.leaseStart ? new Date(tenant.leaseStart).toLocaleDateString("th-TH", { dateStyle: 'long' }) : "________________");
    terms = terms.replace(/{{START_DATE}}/g, tenant.leaseStart ? new Date(tenant.leaseStart).toLocaleDateString("th-TH", { dateStyle: 'long' }) : "________________");
    terms = terms.replace(/{{ID_CARD}}/g, tenant.idCardNumber || "________________");
  }

  // Auto-generate standard preamble
  const preamble = `
<p style="margin-bottom: 1rem;">
  สัญญาฉบับนี้ทำขึ้นระหว่าง <strong>${property?.name || "________________"}</strong> (ผู้ให้เช่า) 
  และ <strong>${tenant.user?.name || "________________"}</strong> (ผู้เช่า) ผู้ถือบัตรประชาชนเลขที่ <strong>${tenant.idCardNumber || "________________"}</strong>
</p>
<p style="margin-bottom: 1rem;">
  ตกลงเช่าห้องพักหมายเลข <strong>${tenant.room?.number || "____"}</strong> 
  ในอัตราค่าเช่าเดือนละ <strong>${tenant.room?.rentPrice?.toLocaleString() || "________________"}</strong> บาท 
  โดยมีเงินประกันการเช่าจำนวน <strong>${tenant.depositAmount ? tenant.depositAmount.toLocaleString() : "0"}</strong> บาท 
  โดยสัญญาเริ่มต้นตั้งแต่วันที่ <strong>${tenant.leaseStart ? new Date(tenant.leaseStart).toLocaleDateString("th-TH", { dateStyle: 'long' }) : "________________"}</strong> เป็นต้นไป
</p>
<hr style="margin: 2rem 0; border: 0; border-top: 1px solid #cbd5e1;" />
  `;

  terms = preamble + terms;

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 flex flex-col items-center print:bg-white print:p-0 relative">
      
      {/* Top Action Bar (Not Printed) */}
      <div className="w-full max-w-[210mm] flex justify-between items-center mb-6 print:hidden">
        <Button variant="outline" onClick={() => router.back()} className="bg-white">กลับสู่หน้ารายชื่อผู้เช่า</Button>
        <div className="flex gap-2">
          {tenant.contractPdfUrl ? (
            <Button variant="secondary" onClick={() => window.open(tenant.contractPdfUrl, '_blank')} className="bg-amber-100 text-amber-800 hover:bg-amber-200">
              ดูไฟล์สัญญาที่อัปโหลดไว้
            </Button>
          ) : (
            <>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
                accept=".pdf,image/*" 
              />
              <Button 
                variant="secondary" 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
              >
                {isUploading ? "กำลังอัปโหลด..." : "อัปโหลดสัญญา (ไฟล์สแกน)"}
              </Button>
            </>
          )}
          
          <Button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            พิมพ์สัญญาให้ผู้เช่าเซ็น
          </Button>
        </div>
      </div>

      {/* Contract Document (A4 Size) */}
      <div className="max-w-[210mm] w-full bg-white shadow-xl min-h-[297mm] p-10 md:p-16 print:shadow-none print:w-[210mm] print:h-[297mm] relative font-sarabun text-lg">
        
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-slate-800 tracking-tight">สัญญาเช่าห้องพักอาศัย</h1>
          <h2 className="text-2xl font-bold text-slate-800 mt-2">{property?.name}</h2>
          <p className="text-lg text-slate-700 mt-1">{property?.address}</p>
        </div>

        <div className="mb-6 font-bold text-lg text-slate-800">
          วันที่ทำสัญญา: {tenant.contractSignedAt ? new Date(tenant.contractSignedAt).toLocaleDateString("th-TH") : "________________"}
        </div>

        {/* Dynamic Contract Content */}
        {terms ? (
          <div className="prose max-w-none text-xl text-slate-800 whitespace-pre-wrap leading-relaxed text-justify mb-10">
            <div dangerouslySetInnerHTML={{ __html: terms }} />
          </div>
        ) : (
          <div className="text-center p-8 text-slate-500 border-2 border-dashed rounded-xl mb-12 print:hidden">
            กรุณาตั้งค่าแม่แบบสัญญาเช่า (Lease Template) ที่เมนู "ตั้งค่าสัญญาเช่า" ก่อน
          </div>
        )}

        {/* E-Signature Audit Trail (If Signed Online) */}
        {tenant.contractSignedAt && tenant.signatureUrl && (
          <div className="mb-10 p-4 border border-blue-200 bg-blue-50/50 rounded-lg text-xs text-slate-600 print:border-slate-300 print:bg-white print:text-black">
            <div className="font-bold text-blue-800 print:text-black mb-1">E-Signature Audit Trail</div>
            <div>Signer IP Address: {tenant.contractIpAddress || "N/A"}</div>
            <div>Signed Timestamp: {new Date(tenant.contractSignedAt).toLocaleString("en-US", { timeZone: "Asia/Bangkok" })}</div>
            <div>User Agent: {tenant.contractUserAgent || "N/A"}</div>
          </div>
        )}

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-16 text-center mt-16 pt-8 break-inside-avoid">
          <div>
            <div className="border-b border-slate-400 w-48 mx-auto mb-2 h-16 flex items-end justify-center pb-2">
              {/* Owner Signature could go here if implemented, for now leave blank for physical sign */}
            </div>
            <p className="text-slate-700 font-medium">ลงชื่อ ผู้ให้เช่า</p>
            <p className="text-sm text-slate-500 mt-1">({property?.companyName || property?.name || "________________________"})</p>
          </div>
          <div>
            <div className="border-b border-slate-400 w-48 mx-auto mb-2 h-16 flex items-end justify-center pb-2 relative">
              {tenant.signatureUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={tenant.signatureUrl} alt="Tenant Signature" className="max-h-16 object-contain absolute bottom-0" />
              )}
            </div>
            <p className="text-slate-700 font-medium">ลงชื่อ ผู้เช่า</p>
            <p className="text-sm text-slate-500 mt-1">({tenant.user?.name || "________________________"})</p>
          </div>
        </div>
        
        <div className="mt-16 pt-4 border-t border-slate-200 text-center text-slate-400 text-xs print:absolute print:bottom-8 print:w-full print:left-0 print:border-none">
          สร้างโดยระบบบริหารจัดการหอพัก JadHor OS (Paperless Lease Agreement)
        </div>
      </div>
    </div>
  );
}
