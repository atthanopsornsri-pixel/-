"use client";
import { toast } from "sonner";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";

// Utility to compress image natively
const compressImage = (file: File, maxWidth = 1000): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Compress to JPEG with 0.7 quality
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export default function PropertiesPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Billing Settings Modal State
  const [selectedProp, setSelectedProp] = useState<any>(null);
  const [taxId, setTaxId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [promptPayNo, setPromptPayNo] = useState("");
  const [promptPayName, setPromptPayName] = useState("");
  const [signatureUrl, setSignatureUrl] = useState("");
  
  // Rate Settings
  const [electricRate, setElectricRate] = useState("");
  const [waterRate, setWaterRate] = useState("");
  const [defaultCommonFee, setDefaultCommonFee] = useState("");
  const [defaultParkingFee, setDefaultParkingFee] = useState("");
  const [defaultInternetFee, setDefaultInternetFee] = useState("");

  // Check-in (บิลเข้าอยู่) defaults
  const [defaultSecurityDeposit, setDefaultSecurityDeposit] = useState("");
  const [defaultAdvanceRent, setDefaultAdvanceRent] = useState("");
  const [defaultKeyDeposit, setDefaultKeyDeposit] = useState("");
  const [defaultCarFee, setDefaultCarFee] = useState("");
  const [defaultMotorcycleFee, setDefaultMotorcycleFee] = useState("");

  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchProperties();
      setIsLoading(false);
    };
    loadData();
  }, []);

  async function fetchProperties() {
    const res = await fetch("/api/properties");
    if (res.ok) {
      const data = await res.json();
      setProperties(data);
    }
  };

  const handleSignatureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 400); // Smaller width for signature
        setSignatureUrl(compressed);
      } catch (err) {
        console.error("Failed to compress signature", err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      let imageUrl = "";
      if (imageFile) {
        imageUrl = await compressImage(imageFile);
      }

      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address, imageUrl }),
      });

      if (res.ok) {
        setName("");
        setAddress("");
        setImageFile(null);
        (document.getElementById("image") as HTMLInputElement).value = "";
        fetchProperties();
        router.refresh();
      } else {
        toast.error("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      }
    } catch (err) {
      console.error(err);
      toast.error("เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ");
    }
    setIsUploading(false);
  };

  const openSettingsModal = (prop: any) => {
    setSelectedProp(prop);
    setTaxId(prop.taxId || "");
    setCompanyName(prop.companyName || "");
    setPromptPayNo(prop.promptPayNo || "");
    setPromptPayName(prop.promptPayName || "");
    setSignatureUrl(prop.signatureUrl || "");
    
    setElectricRate(prop.electricRate?.toString() || "");
    setWaterRate(prop.waterRate?.toString() || "");
    setDefaultCommonFee(prop.defaultCommonFee?.toString() || "");
    setDefaultParkingFee(prop.defaultParkingFee?.toString() || "");
    setDefaultInternetFee(prop.defaultInternetFee?.toString() || "");
    setDefaultSecurityDeposit(prop.defaultSecurityDeposit?.toString() || "");
    setDefaultAdvanceRent(prop.defaultAdvanceRent?.toString() || "");
    setDefaultKeyDeposit(prop.defaultKeyDeposit?.toString() || "");
    setDefaultCarFee(prop.defaultCarFee?.toString() || "");
    setDefaultMotorcycleFee(prop.defaultMotorcycleFee?.toString() || "");
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProp) return;
    setIsSavingSettings(true);

    try {
      const res = await fetch(`/api/properties/${selectedProp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          taxId, companyName, promptPayNo, promptPayName, signatureUrl,
          electricRate: electricRate ? parseFloat(electricRate) : null,
          waterRate: waterRate ? parseFloat(waterRate) : null,
          defaultCommonFee: defaultCommonFee ? parseFloat(defaultCommonFee) : null,
          defaultParkingFee: defaultParkingFee ? parseFloat(defaultParkingFee) : null,
          defaultInternetFee: defaultInternetFee ? parseFloat(defaultInternetFee) : null,
          defaultSecurityDeposit: defaultSecurityDeposit ? parseFloat(defaultSecurityDeposit) : null,
          defaultAdvanceRent: defaultAdvanceRent ? parseFloat(defaultAdvanceRent) : null,
          defaultKeyDeposit: defaultKeyDeposit ? parseFloat(defaultKeyDeposit) : null,
          defaultCarFee: defaultCarFee ? parseFloat(defaultCarFee) : null,
          defaultMotorcycleFee: defaultMotorcycleFee ? parseFloat(defaultMotorcycleFee) : null,
        }),
      });

      if (res.ok) {
        toast.success("บันทึกการตั้งค่าบิลสำเร็จ!");
        setSelectedProp(null);
        fetchProperties();
      } else {
        toast.error("เกิดข้อผิดพลาดในการบันทึก");
      }
    } catch (err) {
      console.error(err);
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    }
    setIsSavingSettings(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out relative">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--jh-radius-md)]"
            style={{ background: "#af52de", color: "#fff", boxShadow: "0 10px 22px -8px #af52de" }}
          >
            <Building2 className="h-[22px] w-[22px]" strokeWidth={2} />
          </div>
          <h1 className="text-2xl md:text-[28px] font-bold text-[var(--jh-ink)] tracking-[-0.02em]">
            จัดการหอพักและอพาร์ตเม้นท์
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add Property Form */}
        <div className="lg:col-span-1">
          <div className="bg-white p-8 rounded-[32px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 sticky top-28">
            <div className="w-12 h-12 bg-[#E8F2FF] text-[#007AFF] rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </div>
            <h2 className="text-xl font-bold text-[#1D1D1F] mb-6">เพิ่มหอพักใหม่</h2>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-600 font-medium ml-1">ชื่อหอพัก</Label>
                <Input 
                  id="name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                  className="rounded-2xl h-12 bg-slate-50 border-slate-200 focus:bg-white px-4"
                  placeholder="เช่น อพาร์ตเม้นท์สุขสันต์"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address" className="text-slate-600 font-medium ml-1">ที่อยู่/รายละเอียด</Label>
                <Input 
                  id="address" 
                  value={address} 
                  onChange={(e) => setAddress(e.target.value)} 
                  required 
                  className="rounded-2xl h-12 bg-slate-50 border-slate-200 focus:bg-white px-4"
                  placeholder="เขต/อำเภอ หรือจุดสังเกต"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="image" className="text-slate-600 font-medium ml-1">ภาพปกหอพัก</Label>
                <div className="relative">
                  <Input 
                    id="image" 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)} 
                    className="rounded-2xl h-12 bg-slate-50 border-slate-200 focus:bg-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full rounded-full h-12 bg-[#007AFF] hover:bg-[#0066CC] text-white font-semibold shadow-md mt-4 transition-all hover:-translate-y-0.5" 
                disabled={isUploading}
              >
                {isUploading ? "กำลังบันทึก..." : "เพิ่มหอพัก"}
              </Button>
            </form>
          </div>
        </div>

        {/* Property List */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {isLoading ? (
              <div className="col-span-1 md:col-span-2 py-20 flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-slate-500">กำลังโหลดข้อมูลหอพัก...</p>
              </div>
            ) : properties.length === 0 ? (
              <div className="col-span-1 md:col-span-2 text-center py-16 bg-white rounded-[32px] border border-dashed border-slate-300">
                <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </div>
                <h3 className="text-lg font-bold text-[#1D1D1F] mb-1">ยังไม่มีข้อมูลหอพัก</h3>
                <p className="text-slate-500">เริ่มเพิ่มหอพักแรกของคุณทางด้านซ้ายเพื่อเริ่มต้นใช้งานระบบ</p>
              </div>
            ) : properties.map((prop) => (
              <div key={prop.id} className="bg-white rounded-[32px] overflow-hidden shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 group transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 flex flex-col">
                {prop.imageUrl ? (
                  <div className="h-48 w-full bg-slate-200 relative overflow-hidden shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={prop.imageUrl} alt={prop.name} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" />
                  </div>
                ) : (
                  <div className="h-48 w-full bg-slate-50 flex flex-col items-center justify-center text-slate-400 group-hover:bg-blue-50/50 transition-colors shrink-0">
                    <svg className="w-12 h-12 mb-2 text-slate-300 group-hover:text-blue-200 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    <span className="text-sm font-medium">ไม่มีรูปภาพ</span>
                  </div>
                )}
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="font-extrabold text-xl mb-1 text-[#1D1D1F] group-hover:text-[#007AFF] transition-colors">{prop.name}</h3>
                  <p className="text-slate-500 text-sm mb-4 line-clamp-2">{prop.address}</p>
                  
                  <div className="inline-flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full mb-6 border border-slate-100 w-fit">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-sm font-semibold text-slate-600">
                      {prop._count?.rooms || 0} ห้องพักในระบบ
                    </span>
                  </div>

                  <div className="flex flex-col gap-3 mt-auto">
                    <Button 
                      onClick={() => router.push(`/dashboard/rooms?propertyId=${prop.id}`)}
                      className="w-full rounded-full bg-[#1D1D1F] hover:bg-[#333336] text-white font-semibold shadow-sm h-11"
                    >
                      จัดการห้องพัก
                    </Button>
                    <div className="grid grid-cols-2 gap-3">
                      <Button variant="outline" className="rounded-full border-slate-200 text-slate-600 hover:bg-slate-50 h-11" onClick={() => openSettingsModal(prop)}>
                        ตั้งค่าบิล/ภาษี
                      </Button>
                      <Button variant="outline" className="rounded-full border-slate-200 text-slate-600 hover:bg-slate-50 h-11" onClick={() => router.push(`/dashboard/properties/${prop.id}/lease-settings`)}>
                        สัญญาเช่า
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {selectedProp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
              <h3 className="text-xl font-bold text-[#1D1D1F]">ตั้งค่าข้อมูลใบแจ้งหนี้ / ภาษี</h3>
              <button onClick={() => setSelectedProp(null)} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shadow-sm border border-slate-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleSaveSettings} className="p-6 overflow-y-auto space-y-6">
              
              {/* Section 1: Legal */}
              <div>
                <h4 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">ข้อมูลผู้ประกอบการ</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-medium ml-1">ชื่อบริษัท / ชื่อจดทะเบียน</Label>
                    <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="rounded-2xl h-12 bg-slate-50 border-slate-200" placeholder="ปล่อยว่างเพื่อใช้ชื่อหอพัก" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-medium ml-1">เลขประจำตัวผู้เสียภาษี (Tax ID)</Label>
                    <Input value={taxId} onChange={(e) => setTaxId(e.target.value)} className="rounded-2xl h-12 bg-slate-50 border-slate-200" placeholder="เลขประจำตัว 13 หลัก" />
                  </div>
                </div>
              </div>

              {/* Section 2: Payment */}
              <div>
                <h4 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">บัญชีรับชำระเงิน (PromptPay QR Code)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-medium ml-1">เบอร์พร้อมเพย์</Label>
                    <Input value={promptPayNo} onChange={(e) => setPromptPayNo(e.target.value)} className="rounded-2xl h-12 bg-slate-50 border-slate-200" placeholder="เบอร์มือถือ หรือ บัตรประชาชน" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-medium ml-1">ชื่อบัญชีรับเงิน</Label>
                    <Input value={promptPayName} onChange={(e) => setPromptPayName(e.target.value)} className="rounded-2xl h-12 bg-slate-50 border-slate-200" placeholder="เช่น นาย สมชาย รักดี" />
                  </div>
                </div>
              </div>

              {/* Section 2.5: Signature */}
              <div>
                <h4 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">ลายเซ็นบนใบแจ้งหนี้ (ผู้ออกบิล)</h4>
                <div className="flex gap-4 items-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  {signatureUrl ? (
                    <div className="flex flex-col items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={signatureUrl} alt="Signature Preview" className="h-16 object-contain mix-blend-multiply" />
                      <Button type="button" variant="ghost" size="sm" onClick={() => setSignatureUrl("")} className="text-red-500 h-8">ลบลายเซ็น</Button>
                    </div>
                  ) : (
                    <div className="text-center w-32 h-16 border-2 border-dashed border-slate-300 rounded flex items-center justify-center text-xs text-slate-400 shrink-0">
                      ไม่มีลายเซ็น
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <Label className="text-slate-600 font-medium text-sm">อัปโหลดรูปลายเซ็น (พื้นหลังใส หรือขาว)</Label>
                    <Input type="file" accept="image/*" onChange={handleSignatureChange} className="rounded-xl h-10 bg-white border-slate-200 text-sm" />
                  </div>
                </div>
              </div>

              {/* Section 3: Utility Rates */}
              <div>
                <h4 className="font-bold text-[#007AFF] mb-4 border-b border-slate-100 pb-2">เรทค่าน้ำ ค่าไฟ และค่าบริการ (คำนวณอัตโนมัติ)</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-medium ml-1">ค่าไฟ (บาท/หน่วย)</Label>
                    <Input type="number" step="0.1" value={electricRate} onChange={(e) => setElectricRate(e.target.value)} className="rounded-2xl h-12 border-blue-200 bg-blue-50/30 focus:bg-white" placeholder="เช่น 8" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-medium ml-1">ค่าน้ำ (บาท/หน่วย)</Label>
                    <Input type="number" step="0.1" value={waterRate} onChange={(e) => setWaterRate(e.target.value)} className="rounded-2xl h-12 border-blue-200 bg-blue-50/30 focus:bg-white" placeholder="เช่น 18" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-medium ml-1">ค่าส่วนกลาง (บาท)</Label>
                    <Input type="number" value={defaultCommonFee} onChange={(e) => setDefaultCommonFee(e.target.value)} className="rounded-2xl h-12 bg-slate-50 border-slate-200" placeholder="เช่น 500" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-medium ml-1">ค่าที่จอดรถ (บาท)</Label>
                    <Input type="number" value={defaultParkingFee} onChange={(e) => setDefaultParkingFee(e.target.value)} className="rounded-2xl h-12 bg-slate-50 border-slate-200" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-medium ml-1">ค่าอินเทอร์เน็ต (บาท)</Label>
                    <Input type="number" value={defaultInternetFee} onChange={(e) => setDefaultInternetFee(e.target.value)} className="rounded-2xl h-12 bg-slate-50 border-slate-200" />
                  </div>
                </div>
              </div>

              {/* ── ค่าเริ่มต้นบิลเข้าอยู่ (Check-in) ── */}
              <div className="bg-blue-50/40 rounded-3xl p-6 border border-blue-100">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🔑</span>
                  <h3 className="font-bold text-slate-800">ค่าเริ่มต้นบิลเข้าอยู่</h3>
                </div>
                <p className="text-xs text-slate-500 mb-4">ค่าที่ตั้งไว้นี้จะถูกเติมให้อัตโนมัติเมื่อออกบิลเข้าอยู่ • เว้นว่าง = ใช้ค่าเช่า 1 เดือน (ประกัน/ล่วงหน้า) หรือ 0</p>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-medium ml-1">เงินประกันห้อง (บาท)</Label>
                    <Input type="number" value={defaultSecurityDeposit} onChange={(e) => setDefaultSecurityDeposit(e.target.value)} className="rounded-2xl h-12 bg-white border-slate-200" placeholder="เว้นว่าง = ค่าเช่า 1 เดือน" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-medium ml-1">ค่าเช่าล่วงหน้า (บาท)</Label>
                    <Input type="number" value={defaultAdvanceRent} onChange={(e) => setDefaultAdvanceRent(e.target.value)} className="rounded-2xl h-12 bg-white border-slate-200" placeholder="เว้นว่าง = ค่าเช่า 1 เดือน" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-medium ml-1">มัดจำกุญแจ/คีย์การ์ด</Label>
                    <Input type="number" value={defaultKeyDeposit} onChange={(e) => setDefaultKeyDeposit(e.target.value)} className="rounded-2xl h-12 bg-white border-slate-200" placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-medium ml-1">🚗 ค่ารถยนต์ (บาท)</Label>
                    <Input type="number" value={defaultCarFee} onChange={(e) => setDefaultCarFee(e.target.value)} className="rounded-2xl h-12 bg-white border-slate-200" placeholder="0 = ฟรี" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-medium ml-1">🏍️ ค่ามอเตอร์ไซค์ (บาท)</Label>
                    <Input type="number" value={defaultMotorcycleFee} onChange={(e) => setDefaultMotorcycleFee(e.target.value)} className="rounded-2xl h-12 bg-white border-slate-200" placeholder="0 = ฟรี" />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <Button type="button" variant="outline" onClick={() => setSelectedProp(null)} className="flex-1 rounded-full h-12 border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold">
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={isSavingSettings} className="flex-1 rounded-full h-12 bg-[#007AFF] hover:bg-[#0066CC] text-white font-semibold shadow-sm">
                  {isSavingSettings ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
