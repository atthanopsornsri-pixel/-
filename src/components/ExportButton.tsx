"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { exportBillingData } from "@/app/actions/export-data";

export function ExportButton({ propertyId }: { propertyId: string }) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const now = new Date();
      const month = now.getMonth() + 1; // current month
      const year = now.getFullYear();

      const result = await exportBillingData(propertyId, month, year);

      if (result.success && result.data) {
        // Create Blob from CSV string
        const blob = new Blob([result.data], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        
        // Trigger download
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `bills_${String(month).padStart(2, '0')}_${year}.csv`);
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        alert(result.error || "เกิดข้อผิดพลาดในการดาวน์โหลดข้อมูล");
      }
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการดาวน์โหลดข้อมูล");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button 
      onClick={handleExport} 
      disabled={isExporting}
      className="bg-slate-900 hover:bg-black text-white rounded-full shadow-md"
    >
      {isExporting ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Download className="w-4 h-4 mr-2" />
      )}
      Export CSV (เดือนนี้)
    </Button>
  );
}
