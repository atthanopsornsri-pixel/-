"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function EContractDraftPage() {
  const params = useParams();
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    landlordName: "",
    landlordIdType: "บัตรประจำตัวประชาชน",
    landlordIdNumber: "",
    landlordAddress: "",
    tenantName: "",
    tenantIdType: "บัตรประจำตัวประชาชน",
    tenantIdNumber: "",
    tenantAddress: "",
    roomNumber: "",
    propertyType: "อพาร์ทเมนต์/หอพัก",
    propertyName: "",
    rentPrice: 0,
    depositAmount: 0,
    leaseStart: "",
    leaseEnd: "",
    rentDueDate: "5"
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/tenants/${params.id}/e-contract`);
        if (res.ok) {
          const json = await res.json();
          setFormData(json.data);
        } else {
          toast.error("ไม่สามารถโหลดข้อมูลได้");
        }
      } catch (e) {
        toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [params.id]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/tenants/${params.id}/e-contract`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eContractData: formData, eContractStatus: "DRAFT" })
      });
      if (res.ok) {
        toast.success("บันทึกร่างสัญญาเรียบร้อย");
      } else {
        toast.error("บันทึกไม่สำเร็จ");
      }
    } catch (e) {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setIsSaving(false);
    }
  };

  const handleProceed = async () => {
    await handleSaveDraft();
    router.push(`/dashboard/tenants/${params.id}/e-contract/send`);
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">กำลังโหลด...</div>;
  }

  // Helper for formatting date
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "................................";
    return new Date(dateStr).toLocaleDateString("th-TH", { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden text-sm">
      
      {/* Left Sidebar Form */}
      <div className="w-[400px] bg-white border-r flex flex-col h-full shadow-sm z-10">
        <div className="p-4 border-b flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">← กลับ</button>
            <h2 className="font-bold text-gray-800">ข้อมูลสัญญา</h2>
          </div>
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">แบบร่าง</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <div className="space-y-4">
            <h3 className="font-bold text-blue-600 border-b pb-2">ข้อมูลผู้ให้เช่า (ฝ่ายที่ 1)</h3>
            <div className="space-y-1">
              <Label>ชื่อผู้ให้เช่า *</Label>
              <Input value={formData.landlordName} onChange={(e) => handleInputChange("landlordName", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>ประเภทเอกสาร</Label>
              <select className="w-full h-10 border rounded-md px-3" value={formData.landlordIdType} onChange={(e) => handleInputChange("landlordIdType", e.target.value)}>
                <option value="บัตรประจำตัวประชาชน">บัตรประจำตัวประชาชน</option>
                <option value="หนังสือเดินทาง">หนังสือเดินทาง</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>เลขที่เอกสาร</Label>
              <Input value={formData.landlordIdNumber} onChange={(e) => handleInputChange("landlordIdNumber", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>ที่อยู่</Label>
              <Input value={formData.landlordAddress} onChange={(e) => handleInputChange("landlordAddress", e.target.value)} />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-green-600 border-b pb-2">ข้อมูลผู้เช่า (ฝ่ายที่ 2)</h3>
            <div className="space-y-1">
              <Label>ชื่อผู้เช่า *</Label>
              <Input value={formData.tenantName} onChange={(e) => handleInputChange("tenantName", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>ประเภทเอกสาร</Label>
              <select className="w-full h-10 border rounded-md px-3" value={formData.tenantIdType} onChange={(e) => handleInputChange("tenantIdType", e.target.value)}>
                <option value="บัตรประจำตัวประชาชน">บัตรประจำตัวประชาชน</option>
                <option value="หนังสือเดินทาง">หนังสือเดินทาง</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>เลขที่เอกสาร</Label>
              <Input value={formData.tenantIdNumber} onChange={(e) => handleInputChange("tenantIdNumber", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>ที่อยู่ผู้เช่า</Label>
              <Input value={formData.tenantAddress} onChange={(e) => handleInputChange("tenantAddress", e.target.value)} />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 border-b pb-2">ข้อตกลงการเช่า</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>ชื่อสถานที่เช่า</Label>
                <Input value={formData.propertyName} onChange={(e) => handleInputChange("propertyName", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>หมายเลขห้อง</Label>
                <Input value={formData.roomNumber} onChange={(e) => handleInputChange("roomNumber", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>ค่าเช่า (บาท/เดือน)</Label>
                <Input type="number" value={formData.rentPrice} onChange={(e) => handleInputChange("rentPrice", Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label>เงินประกัน (บาท)</Label>
                <Input type="number" value={formData.depositAmount} onChange={(e) => handleInputChange("depositAmount", Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label>วันที่เริ่มสัญญา</Label>
                <Input type="date" value={formData.leaseStart} onChange={(e) => handleInputChange("leaseStart", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>วันที่สิ้นสุดสัญญา</Label>
                <Input type="date" value={formData.leaseEnd} onChange={(e) => handleInputChange("leaseEnd", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>กำหนดชำระค่าเช่า (วันที่ของทุกเดือน)</Label>
              <Input type="number" value={formData.rentDueDate} onChange={(e) => handleInputChange("rentDueDate", e.target.value)} />
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t bg-white flex justify-between gap-2">
          <Button variant="outline" className="flex-1" onClick={handleSaveDraft} disabled={isSaving}>
            บันทึกร่าง
          </Button>
          <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={handleProceed} disabled={isSaving}>
            ไปต่อ →
          </Button>
        </div>
      </div>

      {/* Right Side Live Preview */}
      <div className="flex-1 overflow-y-auto bg-gray-200 p-8 flex justify-center">
        <div className="bg-white w-full max-w-[794px] min-h-[1123px] shadow-lg p-14 font-sarabun text-[15px] leading-relaxed">
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

          <div className="space-y-4 text-justify pl-4">
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

          <div className="mt-20 flex justify-between px-10">
            <div className="text-center">
              <div className="w-40 border-b border-dashed border-gray-400 mx-auto mb-2"></div>
              <p>({formData.landlordName || "................................"})</p>
              <p className="text-sm mt-1">ผู้ให้เช่า</p>
            </div>
            <div className="text-center">
              <div className="w-40 border-b border-dashed border-gray-400 mx-auto mb-2"></div>
              <p>({formData.tenantName || "................................"})</p>
              <p className="text-sm mt-1">ผู้เช่า</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
