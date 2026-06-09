"use client";
import { toast } from "sonner";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function TenantContractPage() {
  const [contractData, setContractData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigning, setIsSigning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/tenant/contract");
        if (res.ok) {
          const data = await res.json();
          setContractData(data);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Simple signature canvas drawing logic
  useEffect(() => {
    if (isSigning && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      let isDrawing = false;
      let lastX = 0;
      let lastY = 0;

      const draw = (e: MouseEvent | TouchEvent) => {
        if (!isDrawing) return;
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        
        let clientX, clientY;
        if (e instanceof MouseEvent) {
          clientX = e.clientX;
          clientY = e.clientY;
        } else {
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
        }
        
        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        
        ctx.lineTo(x, y);
        ctx.stroke();
        lastX = x;
        lastY = y;
      };

      const startDrawing = (e: MouseEvent | TouchEvent) => {
        isDrawing = true;
        const rect = canvas.getBoundingClientRect();
        if (e instanceof MouseEvent) {
          lastX = e.clientX - rect.left;
          lastY = e.clientY - rect.top;
        } else {
          lastX = e.touches[0].clientX - rect.left;
          lastY = e.touches[0].clientY - rect.top;
        }
      };

      const stopDrawing = () => {
        isDrawing = false;
      };

      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#000";

      canvas.addEventListener("mousedown", startDrawing);
      canvas.addEventListener("mousemove", draw);
      canvas.addEventListener("mouseup", stopDrawing);
      canvas.addEventListener("mouseout", stopDrawing);
      
      canvas.addEventListener("touchstart", startDrawing, { passive: false });
      canvas.addEventListener("touchmove", (e) => { e.preventDefault(); draw(e); }, { passive: false });
      canvas.addEventListener("touchend", stopDrawing);

      return () => {
        canvas.removeEventListener("mousedown", startDrawing);
        canvas.removeEventListener("mousemove", draw);
        canvas.removeEventListener("mouseup", stopDrawing);
        canvas.removeEventListener("mouseout", stopDrawing);
        canvas.removeEventListener("touchstart", startDrawing);
        canvas.removeEventListener("touchmove", draw);
        canvas.removeEventListener("touchend", stopDrawing);
      };
    }
  }, [isSigning]);

  const clearSignature = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const handleSign = async () => {
    if (!canvasRef.current) return;
    const signatureUrl = canvasRef.current.toDataURL("image/png");
    
    // Check if empty
    const ctx = canvasRef.current.getContext("2d");
    const pixelBuffer = new Uint32Array(
      ctx!.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height).data.buffer
    );
    if (!pixelBuffer.some(color => color !== 0)) {
      toast.error("กรุณาเซ็นชื่อก่อนกดยืนยัน");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/tenant/contract/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureUrl }),
      });

      if (res.ok) {
        toast.success("เซ็นสัญญาสำเร็จ");
        window.location.reload();
      } else {
        toast.error("เกิดข้อผิดพลาดในการบันทึก");
      }
    } catch (error) {
      console.error(error);
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center">กำลังโหลดสัญญา...</div>;
  }

  if (!contractData) {
    return <div className="p-8 text-center text-red-500">ไม่พบข้อมูลสัญญาของคุณ</div>;
  }

  const { tenant, content, canSign = true, checkinBill = null } = contractData;

  return (
    <div className="max-w-3xl mx-auto space-y-6 print-card">
      <style>{`
        @media print {
          body, html, main, #__next {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
          aside, header, button, .no-print, nav, [role="navigation"] {
            display: none !important;
          }
          .print-card {
            max-width: 100% !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
          .contract-box {
            border: none !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      <h1 className="text-2xl font-bold text-slate-800 no-print">สัญญาเช่าห้องพักอาศัย</h1>

      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-slate-200 contract-box">
        <div className="prose max-w-none mb-12 whitespace-pre-wrap font-sarabun text-xl leading-relaxed text-slate-800">
          {content ? (
            <div dangerouslySetInnerHTML={{ __html: content }} />
          ) : (
            <div className="text-slate-500 italic font-sans text-base">หอพักยังไม่ได้ตั้งค่าสัญญาเช่า</div>
          )}
        </div>

        <div className="border-t border-slate-200 pt-8 mt-8">
          {tenant.contractPdfUrl ? (
            <div className="text-center p-6 bg-blue-50 rounded-xl border border-blue-100 no-print">
              <h3 className="font-bold text-blue-800 mb-2">สัญญาฉบับจริงถูกจัดเก็บเรียบร้อยแล้ว</h3>
              <p className="text-sm text-slate-600 mb-4">หอพักได้ทำการอัปโหลดสัญญาที่คุณเซ็นไว้เข้าระบบแล้ว</p>
              <a href={tenant.contractPdfUrl} target="_blank" rel="noreferrer">
                <Button className="bg-blue-600 text-white">ดูไฟล์สัญญา (PDF/รูปภาพ)</Button>
              </a>
            </div>
          ) : tenant.signatureUrl ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-8 p-6 bg-slate-50 rounded-xl border border-slate-100">
                {/* Landlord Side */}
                <div className="flex flex-col items-center text-center border-r border-slate-200 pr-4">
                  <h3 className="font-bold text-slate-800 mb-4">ผู้ให้เช่า (Landlord)</h3>
                  {tenant.landlordSignatureUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={tenant.landlordSignatureUrl} alt="Landlord Signature" className="h-24 object-contain mb-4 mix-blend-multiply" />
                  ) : (
                    <div className="h-24 flex items-center justify-center text-slate-400 italic text-sm mb-4">
                      (เซ็นอนุมัติผ่านระบบแล้ว)
                    </div>
                  )}
                  <p className="font-bold text-slate-700 text-sm">{tenant.landlordName}</p>
                  <p className="text-xs text-slate-400 mt-1">ผู้ให้เช่า / ผู้รับมอบอำนาจ</p>
                </div>

                {/* Tenant Side */}
                <div className="flex flex-col items-center text-center">
                  <h3 className="font-bold text-slate-800 mb-4">ผู้เช่า (Tenant)</h3>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={tenant.signatureUrl} alt="Tenant Signature" className="h-24 object-contain mb-4" />
                  <p className="font-bold text-slate-700 text-sm">{tenant.name || "ผู้เช่าอาศัย"}</p>
                  <p className="text-xs text-slate-400 mt-1">เซ็นเมื่อ: {new Date(tenant.contractSignedAt).toLocaleDateString("th-TH")}</p>
                </div>
              </div>

              {/* Legal metadata footer */}
              <div className="text-center text-xs text-slate-400 space-y-1 mt-4">
                <p>ลงนามอิเล็กทรอนิกส์สำเร็จผ่านระบบ JadHor OS</p>
                <p className="no-print">IP Address: {tenant.contractIpAddress} | เบราว์เซอร์: {tenant.contractUserAgent || "Unknown"}</p>
              </div>

              {/* Print Button */}
              <div className="flex justify-center mt-6 no-print">
                <Button onClick={() => window.print()} className="bg-slate-800 hover:bg-slate-900 text-white rounded-full px-8">
                  🖨️ พิมพ์สัญญาเช่า (Print)
                </Button>
              </div>
            </div>
          ) : !canSign ? (
            /* ── Gate: ยังไม่จ่ายบิลเข้าอยู่ ── */
            <div className="text-center p-6 bg-amber-50 rounded-xl border border-amber-200 no-print">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <h3 className="font-bold text-amber-800 mb-1">ต้องชำระบิลค่าเข้าอยู่ก่อน</h3>
              <p className="text-sm text-amber-700 mb-1">
                กรุณาชำระบิลค่าเข้าอยู่ (เงินประกัน + ค่าเช่าล่วงหน้า) ให้เรียบร้อยก่อนจึงจะเซ็นสัญญาได้
              </p>
              {checkinBill && (
                <p className="text-sm font-bold text-amber-900 mb-4">
                  ยอดที่ต้องชำระ: ฿{Number(checkinBill.totalAmount).toLocaleString()}
                  {checkinBill.status === "PENDING" && " (รอเจ้าของหอตรวจสอบสลิป)"}
                </p>
              )}
              <a href="/dashboard/my-bills">
                <Button className="bg-amber-600 hover:bg-amber-700 text-white rounded-full px-8">
                  ไปหน้าชำระบิลค่าเข้าอยู่ →
                </Button>
              </a>
            </div>
          ) : (
            <div>
              {!isSigning ? (
                <div className="text-center">
                  <p className="mb-4 text-slate-600">คุณยังไม่ได้เซ็นสัญญาเช่าออนไลน์</p>
                  <Button
                    onClick={() => setIsSigning(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 rounded-full"
                    disabled={!content}
                  >
                    คลิกเพื่อเซ็นสัญญา
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <h3 className="font-bold text-slate-800 mb-4">กรุณาเซ็นชื่อด้านล่าง</h3>
                  <div className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 mb-4 overflow-hidden touch-none">
                    <canvas 
                      ref={canvasRef} 
                      width={400} 
                      height={200}
                      className="cursor-crosshair bg-transparent"
                    />
                  </div>
                  <div className="flex gap-4">
                    <Button variant="outline" onClick={clearSignature}>ลบและเซ็นใหม่</Button>
                    <Button onClick={handleSign} disabled={isSubmitting} className="bg-indigo-600 text-white">
                      {isSubmitting ? "กำลังบันทึก..." : "ยืนยันและยอมรับเงื่อนไข"}
                    </Button>
                  </div>
                  <p className="text-xs text-slate-400 mt-4 text-center max-w-sm">
                    การกดยืนยันถือเป็นการยอมรับเงื่อนไขตามสัญญาเช่า ระบบจะบันทึก IP Address และเวลาเพื่อเป็นหลักฐานทางกฎหมาย
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
