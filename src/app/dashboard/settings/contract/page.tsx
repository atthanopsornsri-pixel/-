"use client";
import { toast } from "sonner";
import { useState, useEffect, useRef, ChangeEvent, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface Property {
  id: string;
  name: string;
  companyName: string | null;
  address: string | null;
  leaseTemplate: string | null;
}

const DEFAULT_TEMPLATE = `ข้อตกลงและเงื่อนไขการเช่าพักอาศัย:

1. สัญญานี้ทำขึ้นเพื่อห้องพักหมายเลข {{ROOM_NUMBER}} ผู้เช่าชื่อ: {{TENANT_NAME}} ค่าเช่ารายเดือน: {{RENT_PRICE}} บาท/เดือน
2. ผู้เช่าต้องชำระค่าเช่าภายในวันที่ 5 ของทุกเดือน หากล่าช้าจะมีค่าปรับวันละ 100 บาท
3. ห้ามส่งเสียงดังรบกวนห้องข้างเคียงหลังเวลา 22:00 น.
4. ห้ามเลี้ยงสัตว์ทุกชนิดภายในบริเวณอาคารและห้องพัก
5. ห้ามดัดแปลง ต่อเติม หรือเจาะผนังห้องโดยไม่ได้รับอนุญาตเป็นลายลักษณ์อักษร
6. ผู้เช่าต้องแจ้งย้ายออกล่วงหน้าอย่างน้อย 30 วัน หากอยู่ไม่ครบสัญญาเช่า ผู้ให้เช่าขอสงวนสิทธิ์ไม่คืนเงินมัดจำในทุกกรณี`;

export default function ContractSettingsPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    async function fetchProperties() {
      try {
        const res = await fetch("/api/properties");
        if (res.ok) {
          const data = await res.json();
          setProperties(data);
          if (data.length > 0) {
            setSelectedProperty(data[0]);
            setTemplate(data[0].leaseTemplate || DEFAULT_TEMPLATE);
          }
        }
      } catch (error) {
        console.error("Failed to fetch properties:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProperties();
  }, []);

  const handlePropertyChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const prop = properties.find((p) => p.id === id) || null;
    setSelectedProperty(prop);
    if (prop) {
      setTemplate(prop.leaseTemplate || DEFAULT_TEMPLATE);
    }
  };

  const variables = [
    { label: "ชื่อผู้เช่า", code: "{{TENANT_NAME}}" },
    { label: "เลขบัตรประชาชน", code: "{{ID_CARD}}" },
    { label: "ที่อยู่ผู้เช่า", code: "{{ADDRESS}}" },
    { label: "เบอร์โทรผู้เช่า", code: "{{PHONE}}" },
    { label: "เลขห้อง", code: "{{ROOM_NUMBER}}" },
    { label: "ค่าเช่าพื้นฐาน", code: "{{RENT_PRICE}}" },
    { label: "เงินประกัน", code: "{{DEPOSIT_AMOUNT}}" },
    { label: "วันที่เริ่มสัญญา", code: "{{START_DATE}}" },
    { label: "วันที่สิ้นสุดสัญญา", code: "{{END_DATE}}" },
    { label: "ยานพาหนะ (ทะเบียนรถ)", code: "{{VEHICLES}}" },
  ];

  const insertVariable = (variableCode: string) => {
    if (!textareaRef.current) return;
    
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const currentText = textareaRef.current.value;
    
    const before = currentText.substring(0, start);
    const after = currentText.substring(end, currentText.length);
    
    const newText = before + variableCode + after;
    setTemplate(newText);
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + variableCode.length;
      }
    }, 0);
  };

  const handleSave = async () => {
    if (!selectedProperty) return;
    
    setIsSaving(true);
    try {
      const res = await fetch(`/api/properties/${selectedProperty.id}/contract-template`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaseTemplate: template }),
      });

      if (res.ok) {
        toast.success("บันทึกแม่แบบสัญญาเช่าเรียบร้อยแล้ว");
        setProperties(properties.map(p => p.id === selectedProperty.id ? { ...p, leaseTemplate: template } : p));
      } else {
        toast.error("เกิดข้อผิดพลาดในการบันทึก");
      }
    } catch (error) {
      console.error(error);
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">กำลังโหลดข้อมูล...</div>;
  }

  // Generate preview text by replacing placeholders with dummy data
  const renderPreviewContent = () => {
    let preview = template;
    const replacements: Record<string, string> = {
      "{{TENANT_NAME}}": "สมชาย ใจดี",
      "{{ID_CARD}}": "1-2345-67890-12-3",
      "{{ADDRESS}}": "123 ถ.สุขุมวิท กรุงเทพฯ",
      "{{PHONE}}": "081-234-5678",
      "{{ROOM_NUMBER}}": "A101",
      "{{RENT_PRICE}}": "5,000",
      "{{DEPOSIT_AMOUNT}}": "10,000",
      "{{START_DATE}}": "1 สิงหาคม 2569",
      "{{END_DATE}}": "31 กรกฎาคม 2570",
      "{{VEHICLES}}": "กท 1234",
    };

    Object.keys(replacements).forEach((key) => {
      preview = preview.replaceAll(key, replacements[key]);
    });

    return preview.split('\n').map((line, i) => (
      <p key={i} className="min-h-[1.5rem]">{line}</p>
    ));
  };

  return (
    <div className="flex flex-col -m-4 md:-m-10 animate-in fade-in">
      
      {/* Header bar */}
      <div className="p-6 border-b bg-white flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">ตั้งค่าสัญญาเช่า (Template)</h2>
          <p className="text-sm text-gray-500 mt-1">
            ตั้งค่ารูปแบบสัญญาสำหรับ E-Contract และการพิมพ์ ระบบจะนำแม่แบบนี้ไปสร้างเป็นสัญญาฉบับสมบูรณ์
          </p>
        </div>
        <div className="flex gap-4 items-center">
          {properties.length > 0 && (
            <select
              value={selectedProperty?.id || ""}
              onChange={handlePropertyChange}
              className="h-10 rounded-lg border border-gray-300 px-3 bg-slate-50 text-sm font-semibold"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
          <Button 
            onClick={handleSave}
            disabled={isSaving || !selectedProperty}
            className="bg-blue-600 hover:bg-blue-700 font-bold px-6"
          >
            {isSaving ? "กำลังบันทึก..." : "บันทึกแม่แบบสัญญา"}
          </Button>
        </div>
      </div>

      {/* Split Screen Content */}
      <div className="flex flex-1 items-stretch">

        {/* Left Side: Editor */}
        <div className="w-[450px] bg-slate-50 border-r flex flex-col z-10 shrink-0 p-6 space-y-6 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
          <div>
            <h3 className="font-bold text-slate-800 mb-2">แทรกตัวแปรอัตโนมัติ</h3>
            <p className="text-xs text-slate-500 mb-3">คลิกเพื่อแทรกข้อมูลลงในตำแหน่งเคอร์เซอร์</p>
            <div className="flex flex-wrap gap-2">
              {variables.map((v) => (
                <button
                  key={v.code}
                  onClick={() => insertVariable(v.code)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-semibold text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-colors shadow-sm"
                >
                  + {v.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <Label className="font-bold text-slate-800 mb-2">ข้อตกลงและเงื่อนไข (สัญญาหลัก)</Label>
            <textarea
              ref={textareaRef}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="w-full flex-1 min-h-[300px] p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-[13px] text-gray-800 leading-relaxed shadow-inner font-mono"
              placeholder="พิมพ์กฎระเบียบและข้อตกลงของคุณที่นี่..."
            />
          </div>
        </div>

        {/* Right Side: Live Preview */}
        <div className="flex-1 bg-gray-200 p-8 flex justify-center">
          <div className="bg-white w-full max-w-[794px] min-h-[1123px] shadow-lg p-14 font-sarabun text-[15px] leading-relaxed">
            <div className="text-center font-bold text-xl mb-6">สัญญาเช่าที่อยู่อาศัย</div>
            
            <div className="text-right mb-6">
              ทำที่ {selectedProperty?.name || "................................"}
              <br />
              วันที่ {new Date().toLocaleDateString("th-TH", { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>

            <p className="mb-4 indent-8 text-justify">
              สัญญาฉบับนี้ทำขึ้นระหว่าง <strong>{selectedProperty?.companyName || "ชื่อผู้ให้เช่า / เจ้าของหอพัก"}</strong> 
              {" "}อยู่บ้านเลขที่ <strong>{selectedProperty?.address || "ที่อยู่ผู้ให้เช่า"}</strong> 
              {" "}ซึ่งต่อไปในสัญญานี้เรียกว่า <strong>"ผู้ให้เช่า"</strong> ฝ่ายหนึ่ง
            </p>

            <p className="mb-4 indent-8 text-justify">
              กับ <strong>สมชาย ใจดี</strong> 
              {" "}ถือบัตรประจำตัวประชาชนเลขที่ <strong>1-2345-67890-12-3</strong> 
              {" "}อยู่บ้านเลขที่ <strong>123 ถ.สุขุมวิท กรุงเทพฯ</strong> 
              {" "}ซึ่งต่อไปในสัญญานี้เรียกว่า <strong>"ผู้เช่า"</strong> อีกฝ่ายหนึ่ง
            </p>

            <p className="mb-4 font-bold">คู่สัญญาทั้งสองฝ่ายได้ตกลงทำสัญญาเช่าทรัพย์สินโดยมีข้อความดังต่อไปนี้</p>

            <div className="space-y-2 text-justify mb-8 pl-4">
              {renderPreviewContent()}
            </div>

            <p className="mt-8 text-justify indent-8">
              สัญญานี้ทำขึ้นเป็นสองฉบับมีข้อความถูกต้องตรงกัน คู่สัญญาได้อ่านและเข้าใจข้อความในสัญญาโดยตลอดแล้ว จึงได้ลงลายมือชื่อไว้เป็นสำคัญ
            </p>

            <div className="mt-20 flex justify-between px-10">
              <div className="text-center">
                <div className="w-40 border-b border-dashed border-gray-400 mx-auto mb-2"></div>
                <p>({selectedProperty?.companyName || "ชื่อผู้ให้เช่า"})</p>
                <p className="text-sm mt-1">ผู้ให้เช่า</p>
              </div>
              <div className="text-center">
                <div className="w-40 border-b border-dashed border-gray-400 mx-auto mb-2"></div>
                <p>(สมชาย ใจดี)</p>
                <p className="text-sm mt-1">ผู้เช่า</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
