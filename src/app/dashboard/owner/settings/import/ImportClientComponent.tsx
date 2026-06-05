"use client";

import { useState, useRef } from "react";
import { importRoomsAndTenants } from "@/app/actions/import-data";
import { Button } from "@/components/ui/button";
import { Loader2, UploadCloud, Download, FileText, CheckCircle2, AlertCircle } from "lucide-react";

export function ImportClientComponent({ propertyId }: { propertyId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const downloadTemplate = () => {
    const csvContent = "RoomNumber,RentPrice,TenantName,TenantPhone\n101,4500,สมชาย ใจดี,0812345678\n102,4500,,";
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" }); // utf-8 bom for excel
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "apartment_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await importRoomsAndTenants(propertyId, formData);
      setResult(response);
      if (response.success) {
        setFile(null); // clear file on success
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } catch (error) {
      setResult({ success: false, error: "ระบบขัดข้อง ไม่สามารถอัปโหลดไฟล์ได้" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column: Instructions & Template */}
      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 lg:col-span-1 h-fit">
        <h3 className="text-lg font-bold text-slate-800 mb-4">คำแนะนำการเตรียมไฟล์</h3>
        <ul className="text-sm text-slate-600 space-y-3 mb-6">
          <li className="flex gap-2"><span className="text-emerald-500 font-bold">1.</span> ดาวน์โหลดไฟล์ Template (.csv) ด้านล่าง</li>
          <li className="flex gap-2"><span className="text-emerald-500 font-bold">2.</span> เปิดใน Excel หรือ Google Sheets</li>
          <li className="flex gap-2"><span className="text-emerald-500 font-bold">3.</span> ห้ามเปลี่ยนชื่อหัวคอลัมน์ (Row 1)</li>
          <li className="flex gap-2"><span className="text-emerald-500 font-bold">4.</span> บันทึกไฟล์เป็นนามสกุล .csv เท่านั้น</li>
        </ul>
        <Button onClick={downloadTemplate} variant="outline" className="w-full bg-white border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold shadow-sm">
          <Download className="w-4 h-4 mr-2" /> โหลดไฟล์ Template
        </Button>
      </div>

      {/* Right Column: Upload Zone */}
      <div className="lg:col-span-2">
        {result && (
          <div className={`mb-6 p-4 rounded-2xl flex items-start gap-3 text-sm border ${result.success ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700"}`}>
            {result.success ? <CheckCircle2 className="w-5 h-5 mt-0.5" /> : <AlertCircle className="w-5 h-5 mt-0.5" />}
            <p className="font-medium">{result.success ? result.message : result.error}</p>
          </div>
        )}

        <div 
          onClick={() => !isLoading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[300px] ${
            file ? "border-indigo-400 bg-indigo-50/50" : "border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400"
          } ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".csv" 
            className="hidden" 
          />

          {file ? (
            <>
              <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">{file.name}</h3>
              <p className="text-slate-500 text-sm mt-2">ขนาดไฟล์: {(file.size / 1024).toFixed(1)} KB</p>
              <p className="text-indigo-600 text-sm font-semibold mt-4 underline">คลิกเพื่อเปลี่ยนไฟล์</p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
                <UploadCloud className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">ลากไฟล์มาวาง หรือ คลิกเพื่อเลือกไฟล์</h3>
              <p className="text-slate-500 text-sm mt-2">รองรับไฟล์นามสกุล .csv เท่านั้น</p>
            </>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button 
            onClick={handleUpload} 
            disabled={!file || isLoading}
            className="h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-lg shadow-lg shadow-indigo-600/20 transition-all"
          >
            {isLoading ? (
              <span className="flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> กำลังนำเข้าข้อมูล...</span>
            ) : (
              "เริ่มการนำเข้าข้อมูล"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
