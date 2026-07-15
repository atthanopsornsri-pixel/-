"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import SignatureCanvas from "react-signature-canvas";

export default function TenantSigningPage() {
  const params = useParams();
  
  const [contract, setContract] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigning, setIsSigning] = useState(false);
  
  const sigCanvas = useRef<SignatureCanvas>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/sign/${params.token}`);
        if (res.ok) {
          const json = await res.json();
          setContract(json);
        } else {
          toast.error("ไม่พบข้อมูลสัญญา หรือลิงก์หมดอายุ");
        }
      } catch (e) {
        toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [params.token]);

  const handleClearSignature = () => {
    sigCanvas.current?.clear();
  };

  const handleSign = async () => {
    if (sigCanvas.current?.isEmpty()) {
      toast.error("กรุณาวาดลายเซ็นของคุณ");
      return;
    }

    setIsSigning(true);
    const signatureBase64 = sigCanvas.current?.getTrimmedCanvas().toDataURL("image/png");

    try {
      const res = await fetch(`/api/sign/${params.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantSignature: signatureBase64 })
      });
      
      if (res.ok) {
        toast.success("บันทึกลายเซ็นสำเร็จ! สัญญาเสร็จสมบูรณ์");
        const updated = { ...contract, status: "SIGNED" };
        setContract(updated);
      } else {
        toast.error("ไม่สามารถบันทึกลายเซ็นได้");
      }
    } catch (e) {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setIsSigning(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">กำลังโหลด...</div>;
  }

  if (!contract || !contract.data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow text-center">
          <h1 className="text-xl font-bold text-red-600 mb-2">ไม่พบเอกสาร</h1>
          <p className="text-gray-500">ลิงก์นี้อาจไม่ถูกต้อง หรือถูกยกเลิกไปแล้ว</p>
        </div>
      </div>
    );
  }

  const formData = contract.data;
  const isSigned = contract.status === "SIGNED";

  // Helper for formatting date
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "................................";
    return new Date(dateStr).toLocaleDateString("th-TH", { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 font-sarabun text-[15px] leading-relaxed">
      <div className="max-w-[794px] mx-auto space-y-6">
        
        {/* Status Header */}
        <div className={`p-4 rounded-xl border flex items-center gap-4 ${isSigned ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200'}`}>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isSigned ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
            {isSigned ? '✓' : '✍️'}
          </div>
          <div>
            <h2 className={`font-bold text-lg ${isSigned ? 'text-emerald-800' : 'text-blue-800'}`}>
              {isSigned ? 'สัญญาฉบับนี้ถูกลงนามเรียบร้อยแล้ว' : 'กรุณาตรวจสอบและลงนามในสัญญา'}
            </h2>
            <p className={`${isSigned ? 'text-emerald-600' : 'text-blue-600'} text-sm`}>
              {isSigned ? 'คุณสามารถบันทึกหน้าจอนี้ไว้เป็นหลักฐาน' : `ผู้ให้เช่าส่งสัญญาให้คุณ (ห้อง ${formData.roomNumber})`}
            </p>
          </div>
        </div>

        {/* Contract Paper */}
        <div className="bg-white shadow-lg p-8 sm:p-14 min-h-[1123px]">
          <div className="text-center font-bold text-xl mb-6">สัญญาเช่าที่อยู่อาศัย</div>
          
          <div className="text-right mb-6">
            ทำที่ {formData.propertyName || "................................"}
            <br />
            วันที่ {new Date().toLocaleDateString("th-TH", { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>

          <p className="mb-4 indent-8 text-justify">
            สัญญาฉบับนี้ทำขึ้นระหว่าง <strong>{formData.landlordName || "................................"}</strong> 
            {" "}ถือ{formData.landlordIdType || "บัตรประจำตัวประชาชน"}เลขที่ <strong>{formData.landlordIdNumber || "................................"}</strong> 
            {" "}อยู่บ้านเลขที่ <strong>{formData.landlordAddress || "................................"}</strong> 
            {" "}ซึ่งต่อไปในสัญญานี้เรียกว่า <strong>"ผู้ให้เช่า"</strong> ฝ่ายหนึ่ง
          </p>

          <p className="mb-4 indent-8 text-justify">
            กับ <strong>{formData.tenantName || "................................"}</strong> 
            {" "}ถือ{formData.tenantIdType || "บัตรประจำตัวประชาชน"}เลขที่ <strong>{formData.tenantIdNumber || "................................"}</strong> 
            {" "}อยู่บ้านเลขที่ <strong>{formData.tenantAddress || "................................"}</strong> 
            {" "}ซึ่งต่อไปในสัญญานี้เรียกว่า <strong>"ผู้เช่า"</strong> อีกฝ่ายหนึ่ง
          </p>

          <p className="mb-4 font-bold">คู่สัญญาทั้งสองฝ่ายได้ตกลงทำสัญญาเช่าทรัพย์สินโดยมีข้อความดังต่อไปนี้</p>

          <div className="space-y-4 text-justify sm:pl-4">
            <p>
              <strong>ข้อ 1.</strong> ผู้ให้เช่าตกลงให้เช่าและผู้เช่าตกลงเช่าทรัพย์สินประเภท {formData.propertyType || "................................"} 
              {" "}ตั้งอยู่ที่ {formData.propertyName || "................................"} ห้องหมายเลข <strong>{formData.roomNumber || "................"}</strong> 
              {" "}เพื่อใช้เป็นที่อยู่อาศัย
            </p>
            <p>
              <strong>ข้อ 2.</strong> กำหนดระยะเวลาเช่านับตั้งแต่วันที่ <strong>{formatDate(formData.leaseStart)}</strong> 
              {" "}ถึงวันที่ <strong>{formatDate(formData.leaseEnd)}</strong>
            </p>
            <p>
              <strong>ข้อ 3.</strong> ค่าเช่าเดือนละ <strong>{formData.rentPrice ? Number(formData.rentPrice).toLocaleString() : "................"}</strong> บาท 
              {" "}ผู้เช่าตกลงชำระภายในวันที่ <strong>{formData.rentDueDate || "5"}</strong> ของทุกเดือน หากชำระล่าช้ากว่ากำหนด ผู้ให้เช่ามีสิทธิคิดค่าปรับตามที่กฎหมายกำหนด
            </p>
            <p>
              <strong>ข้อ 4.</strong> ในวันทำสัญญานี้ ผู้เช่าได้วางเงินประกันการเช่าไว้แก่ผู้ให้เช่าเป็นจำนวนเงิน 
              {" "}<strong>{formData.depositAmount ? Number(formData.depositAmount).toLocaleString() : "................"}</strong> บาท 
              {" "}เพื่อเป็นหลักประกันการปฏิบัติตามสัญญา ผู้ให้เช่าจะคืนเงินประกันให้แก่ผู้เช่าภายใน 30 วันนับแต่วันที่สัญญาสิ้นสุดและผู้เช่าได้ส่งมอบทรัพย์สินที่เช่าคืนในสภาพเรียบร้อย
            </p>
            <p>
              <strong>ข้อ 5.</strong> ผู้เช่าสัญญาว่าจะดูแลรักษาทรัพย์สินที่เช่าให้อยู่ในสภาพเรียบร้อย และจะไม่ทำการดัดแปลง ต่อเติม หรือเปลี่ยนแปลงทรัพย์สินที่เช่าเว้นแต่จะได้รับความยินยอมเป็นลายลักษณ์อักษรจากผู้ให้เช่า
            </p>
            <p>
              <strong>ข้อ 6.</strong> หากผู้เช่าผิดนัดชำระค่าเช่า หรือผิดสัญญาข้อใดข้อหนึ่ง ผู้ให้เช่ามีสิทธิบอกเลิกสัญญาและริบเงินประกันได้ทันที
            </p>
          </div>

          <p className="mt-8 text-justify indent-8">
            สัญญานี้ทำขึ้นเป็นสองฉบับมีข้อความถูกต้องตรงกัน คู่สัญญาได้อ่านและเข้าใจข้อความในสัญญาโดยตลอดแล้ว จึงได้ลงลายมือชื่อไว้เป็นสำคัญ
          </p>

          <div className="mt-20 flex justify-between px-2 sm:px-10">
            <div className="text-center w-1/2">
              <div className="w-32 h-20 mx-auto flex items-end justify-center mb-1">
                {formData.landlordSignature ? (
                  <img src={formData.landlordSignature} alt="Landlord Signature" className="max-h-full max-w-full" />
                ) : null}
              </div>
              <div className="w-32 sm:w-40 border-b border-dashed border-gray-400 mx-auto mb-2"></div>
              <p>({formData.landlordName || "................................"})</p>
              <p className="text-sm mt-1">ผู้ให้เช่า</p>
            </div>
            
            <div className="text-center w-1/2">
              {!isSigned ? (
                <div className="mb-4">
                  <div className="border-2 border-dashed border-blue-300 rounded bg-blue-50 flex flex-col items-center justify-center relative mx-auto" style={{ width: '100%', maxWidth: '200px' }}>
                    <SignatureCanvas 
                      ref={sigCanvas}
                      canvasProps={{
                        className: "w-full h-24 cursor-crosshair rounded",
                      }}
                    />
                    <button 
                      onClick={handleClearSignature}
                      className="absolute top-1 right-1 text-[10px] text-gray-500 hover:text-red-500 bg-white px-1 rounded shadow-sm"
                    >
                      ล้าง
                    </button>
                  </div>
                  <Button 
                    className="mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs px-4"
                    onClick={handleSign}
                    disabled={isSigning}
                  >
                    {isSigning ? "กำลังบันทึก..." : "ยืนยันลายเซ็น"}
                  </Button>
                </div>
              ) : (
                <div className="w-32 h-20 mx-auto flex items-end justify-center mb-1">
                  <img src={contract.signatureUrl || formData.tenantSignature} alt="Tenant Signature" className="max-h-full max-w-full" />
                </div>
              )}
              
              <div className="w-32 sm:w-40 border-b border-dashed border-gray-400 mx-auto mb-2"></div>
              <p>({formData.tenantName || "................................"})</p>
              <p className="text-sm mt-1">ผู้เช่า</p>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
