"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import SignatureCanvas from "react-signature-canvas";

export default function EContractSendPage() {
  const params = useParams();
  const router = useRouter();
  
  const [tenant, setTenant] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  
  const sigCanvas = useRef<SignatureCanvas>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/tenants/${params.id}/e-contract`);
        if (res.ok) {
          const json = await res.json();
          setTenant(json);
          if (json.token) {
            setGeneratedLink(`${window.location.origin}/sign/${json.token}`);
          }
        }
      } catch (e) {
        toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [params.id]);

  const handleClearSignature = () => {
    sigCanvas.current?.clear();
  };

  const handleSend = async () => {
    if (sigCanvas.current?.isEmpty() && !tenant.data?.landlordSignature) {
      toast.error("กรุณาวาดลายเซ็นของคุณ (ผู้ให้เช่า)");
      return;
    }

    setIsSending(true);
    let signatureBase64 = tenant.data?.landlordSignature;
    
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      signatureBase64 = sigCanvas.current.getTrimmedCanvas().toDataURL("image/png");
    }

    try {
      const res = await fetch(`/api/tenants/${params.id}/e-contract/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ landlordSignature: signatureBase64 })
      });
      
      if (res.ok) {
        const data = await res.json();
        setGeneratedLink(`${window.location.origin}/sign/${data.token}`);
        toast.success("สร้างลิงก์สำหรับเซ็นสัญญาสำเร็จ!");
      } else {
        toast.error("ไม่สามารถสร้างสัญญาได้");
      }
    } catch (e) {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setIsSending(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLink);
    toast.success("คัดลอกลิงก์แล้ว! ส่งให้ลูกบ้านผ่านแชทได้เลย");
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">กำลังโหลด...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8 animate-in fade-in">
      <div className="flex items-center gap-4 border-b pb-4">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">← กลับ</button>
        <h1 className="text-2xl font-bold text-slate-800">ส่งสัญญาเพื่อลงนาม</h1>
      </div>

      {/* Progress Tracker */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center w-full max-w-md">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">1</div>
            <span className="text-xs mt-2 font-semibold">ฝ่ายที่ 1 (คุณ)</span>
          </div>
          <div className="flex-1 h-1 bg-gray-200 mx-2 relative">
            <div className="absolute h-full bg-blue-600" style={{ width: generatedLink ? '100%' : '50%' }}></div>
          </div>
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${generatedLink ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
            <span className="text-xs mt-2 text-gray-600">ฝ่ายที่ 2 (ลูกบ้าน)</span>
          </div>
          <div className="flex-1 h-1 bg-gray-200 mx-2"></div>
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-bold">✓</div>
            <span className="text-xs mt-2 text-gray-600">สมบูรณ์</span>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">ข้อมูลผู้รับ (ลูกบ้าน)</h2>
          <div className="bg-slate-50 p-4 rounded-xl">
            <p><strong>ชื่อ:</strong> {tenant?.data?.tenantName}</p>
            <p><strong>อีเมล / เบอร์โทร:</strong> ส่งผ่านลิงก์ด้วยตัวเอง</p>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">ลายเซ็นของคุณ (ฝ่ายที่ 1)</h2>
          <p className="text-sm text-slate-500 mb-4">ลงลายเซ็นในฐานะผู้ให้เช่า สัญญานี้จะถูกประทับลายเซ็นของคุณและส่งให้ลูกบ้าน</p>
          
          <div className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 flex flex-col items-center justify-center relative">
            <SignatureCanvas 
              ref={sigCanvas}
              canvasProps={{
                className: "w-full h-48 cursor-crosshair rounded-xl",
              }}
              backgroundColor="rgb(249, 250, 251)"
            />
            <button 
              onClick={handleClearSignature}
              className="absolute top-2 right-2 text-xs text-gray-500 hover:text-red-500 bg-white px-2 py-1 rounded shadow-sm"
            >
              ล้างลายเซ็น
            </button>
          </div>
        </div>

        {!generatedLink ? (
          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg rounded-xl"
            onClick={handleSend}
            disabled={isSending}
          >
            {isSending ? "กำลังสร้างสัญญา..." : "บันทึกลายเซ็นและสร้างลิงก์"}
          </Button>
        ) : (
          <div className="mt-8 p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-4">
            <h3 className="text-emerald-700 font-bold text-lg">🎉 สร้างสัญญาพร้อมส่งแล้ว!</h3>
            <p className="text-sm text-emerald-600">คัดลอกลิงก์ด้านล่างนี้ส่งให้ลูกบ้านเพื่อเปิดอ่านและเซ็นสัญญาผ่านมือถือได้เลย</p>
            <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-emerald-100">
              <input 
                type="text" 
                readOnly 
                value={generatedLink} 
                className="flex-1 bg-transparent border-none text-sm outline-none text-gray-700 px-2"
              />
              <Button onClick={handleCopy} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-md">
                คัดลอก
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
