"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Building, Zap, Droplet, Save, Loader2, Calendar, AlertCircle, RefreshCw } from "lucide-react";
import { getRoomsForMeterEntry, saveBulkMeters } from "@/app/actions/meters";

interface RoomMeterRow {
  roomId: string;
  roomNumber: string;
  previousReading: number;
  currentReadingInput: string;
  hasBill: boolean;
}

export default function MeterEntryPage() {
  const [properties, setProperties] = useState<any[]>([]);
  const [propertyId, setPropertyId] = useState("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [meterType, setMeterType] = useState<"WATER" | "ELECTRIC">("ELECTRIC");
  
  const [ratePerUnit, setRatePerUnit] = useState(0);
  const [meterRows, setMeterRows] = useState<RoomMeterRow[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load properties on mount
  useEffect(() => {
    async function loadProperties() {
      try {
        const res = await fetch("/api/properties");
        if (res.ok) {
          const data = await res.json();
          setProperties(data);
          if (data.length > 0) {
            setPropertyId(data[0].id);
          }
        }
      } catch (e) {
        console.error(e);
        toast.error("ไม่สามารถโหลดข้อมูลหอพักได้");
      }
    }
    loadProperties();
  }, []);

  // Fetch meter rows when property, date, or type changes
  useEffect(() => {
    if (propertyId) {
      fetchMeterRows();
    } else {
      setMeterRows([]);
    }
  }, [propertyId, month, year, meterType]);

  async function fetchMeterRows() {
    setIsLoading(true);
    try {
      const res = await getRoomsForMeterEntry(propertyId, month, year, meterType);
      if (res.success) {
        setRatePerUnit(res.ratePerUnit || 0);
        setMeterRows(res.rows || []);
      } else {
        toast.error(res.error || "เกิดข้อผิดพลาดในการดึงข้อมูล");
      }
    } catch (e) {
      console.error(e);
      toast.error("ระบบดึงข้อมูลขัดข้อง");
    } finally {
      setIsLoading(false);
    }
  }

  const handleInputChange = (roomId: string, value: string) => {
    setMeterRows((prevRows) =>
      prevRows.map((row) =>
        row.roomId === roomId ? { ...row, currentReadingInput: value } : row
      )
    );
  };

  const handleSubmitMeters = async () => {
    if (!propertyId) {
      toast.error("กรุณาเลือกหอพัก");
      return;
    }

    // Only allow updating rooms that have base bills
    const filledRows = meterRows.filter((row) => row.currentReadingInput.trim() !== "" && row.hasBill);
    if (filledRows.length === 0) {
      toast.error("กรุณากรอกเลขมิเตอร์ห้องที่เปิดบิลแล้วอย่างน้อย 1 ห้อง");
      return;
    }

    const updates: { roomId: string; currentReading: number }[] = [];
    for (const row of filledRows) {
      const current = parseFloat(row.currentReadingInput);
      if (isNaN(current) || current < 0) {
        toast.error(`ห้อง ${row.roomNumber}: เลขมิเตอร์ห้ามเป็นค่าว่างหรือติดลบ`);
        return;
      }
      if (current < row.previousReading) {
        toast.error(`ห้อง ${row.roomNumber}: เลขมิเตอร์ห้ามมีค่าน้อยกว่าเดือนก่อนหน้า (${row.previousReading})`);
        return;
      }
      updates.push({
        roomId: row.roomId,
        currentReading: current,
      });
    }

    setIsSaving(true);
    try {
      const res = await saveBulkMeters(propertyId, month, year, meterType, updates);
      if (res.success) {
        toast.success(res.message || "บันทึกมิเตอร์สำเร็จเรียบร้อยแล้ว!");
        fetchMeterRows();
      } else {
        toast.error(res.error || "บันทึกข้อมูลล้มเหลว");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setIsSaving(false);
    }
  };

  const thaiMonths = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  const roomsWithoutBills = meterRows.filter((r) => !r.hasBill);
  const hasMissingBills = roomsWithoutBills.length > 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-[28px] font-bold text-[var(--jh-ink)] tracking-[-0.02em] flex items-center gap-3">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-[var(--jh-radius-md)] text-lg"
              style={{ background: "#007aff", color: "#fff", boxShadow: "0 10px 22px -8px #007aff" }}
            >⚡</span>
            จดบันทึกมิเตอร์ด่วน
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-2">
            บันทึกและตรวจสอบเลขมิเตอร์สาธารณูปโภคของห้องพักแบบ Bulk ในชีตเดียวอย่างรวดเร็ว
          </p>
        </div>

        {/* Meter Type Switch Tabs (Apple Style) */}
        <div className="inline-flex rounded-2xl bg-slate-100 p-1 border border-slate-200/50 self-start shadow-inner">
          <button
            onClick={() => setMeterType("ELECTRIC")}
            className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              meterType === "ELECTRIC"
                ? "bg-white text-blue-600 shadow-[0_2px_8px_rgba(0,0,0,0.05)] border border-slate-200/20"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${meterType === "ELECTRIC" ? "text-blue-500 fill-blue-100" : ""}`} />
            ไฟฟ้า (฿{meterType === "ELECTRIC" ? ratePerUnit : "—"} / หน่วย)
          </button>
          <button
            onClick={() => setMeterType("WATER")}
            className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              meterType === "WATER"
                ? "bg-white text-emerald-600 shadow-[0_2px_8px_rgba(0,0,0,0.05)] border border-slate-200/20"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Droplet className={`w-3.5 h-3.5 ${meterType === "WATER" ? "text-emerald-500 fill-emerald-100" : ""}`} />
            ประปา (฿{meterType === "WATER" ? ratePerUnit : "—"} / หน่วย)
          </button>
        </div>
      </div>

      {/* Warning Card for Missing Base Bills */}
      {hasMissingBills && (
        <div className="bg-amber-50 border border-amber-200/55 rounded-3xl p-5 flex items-start gap-4 text-amber-800 animate-in fade-in slide-in-from-top-4 duration-300">
          <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-bold text-sm">ตรวจพบห้องพักบางห้องยังไม่ได้เปิดรอบบิลตั้งต้นในรอบเดือนนี้</h4>
            <p className="text-xs text-amber-700/90 mt-1.5 leading-relaxed">
              มีจำนวน {roomsWithoutBills.length} ห้องที่ยังไม่มีบิลตั้งต้นในระบบดึงข้อมูลมาจดมิเตอร์ ระบบได้ทำการบล็อกช่องกรอกข้อมูลไว้เพื่อความถูกต้องของข้อมูลตามหลักบัญชีหอพักและป้องกันปัญหาระบบออกใบแจ้งหนี้ผี (Ghost Invoices) <br />
              <span className="inline-block mt-1">กรุณาไปที่เมนู <a href="/dashboard/billing" className="font-bold underline hover:text-amber-950">ออกบิล & ค่าน้ำไฟ</a> เพื่อทำรายการ <strong>&quot;สร้างบิลตั้งต้น&quot;</strong> สำหรับหอพักและรอบเดือนนี้ก่อนดำเนินการจดบันทึก</span>
            </p>
          </div>
        </div>
      )}

      {/* Settings Grid Filter */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Select Property */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              เลือกหอพัก / อาคาร
            </label>
            <select
              className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
            >
              <option value="" disabled>
                เลือกหอพัก
              </option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Select Month */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              รอบเดือน
            </label>
            <select
              className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {thaiMonths.map((name, i) => (
                <option key={i} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Select Year */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              ปี พ.ศ.
            </label>
            <select
              className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {Array.from({ length: 5 }, (_, i) => {
                const y = new Date().getFullYear() - 2 + i;
                return (
                  <option key={y} value={y}>
                    {y + 543}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Spreadsheet Grid */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.02)] overflow-hidden">
        {isLoading ? (
          <div className="p-4">
            <div className="animate-pulse space-y-3">
              {/* Table header mock */}
              <div className="grid grid-cols-6 gap-3 px-2 pb-2 border-b border-slate-100">
                {[1,2,3,4,5,6].map(i => <div key={i} className="h-3 bg-slate-100 rounded w-full" />)}
              </div>
              {/* Table rows */}
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="grid grid-cols-6 gap-3 px-2 py-2">
                  {[1,2,3,4,5,6].map(j => <div key={j} className="h-9 bg-slate-100 rounded-lg w-full" />)}
                </div>
              ))}
            </div>
          </div>
        ) : meterRows.length === 0 ? (
          <div className="py-24 text-center">
            <div className="w-16 h-16 mx-auto bg-slate-50 rounded-2xl flex items-center justify-center text-2xl border border-slate-100 mb-4">
              🛏️
            </div>
            <p className="text-slate-500 font-bold">ไม่พบห้องพักที่มีผู้เช่า (OCCUPIED)</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
              ระบบ Bulk Meter Entry จะรองรับเฉพาะห้องพักที่มีสถานะย้ายเข้าและมีผู้เช่าพักอาศัยจริงในหอพักนี้เท่านั้น
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-bold text-xs uppercase tracking-wider">
                  <th className="px-8 py-4 w-32">ห้องพัก</th>
                  <th className="px-8 py-4 w-48">มิเตอร์เดือนก่อนหน้า</th>
                  <th className="px-8 py-4 w-72">มิเตอร์อ่านได้ล่าสุด (กรอกที่นี่)</th>
                  <th className="px-8 py-4 text-center w-36">หน่วยที่ใช้</th>
                  <th className="px-8 py-4 text-right pr-8">คำนวณยอดเงิน (บาท)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {meterRows.map((row) => {
                  const currentVal = parseFloat(row.currentReadingInput) || 0;
                  const hasInput = row.currentReadingInput.trim() !== "" && row.hasBill;
                  const unitsUsed = hasInput ? currentVal - row.previousReading : 0;
                  const isInvalid = hasInput && unitsUsed < 0;

                  return (
                    <tr key={row.roomId} className="hover:bg-slate-50/30 transition-colors group">
                      {/* Room Number */}
                      <td className="px-8 py-4 font-mono font-bold text-slate-800 text-lg">
                        {row.roomNumber}
                      </td>

                      {/* Previous Meter Value */}
                      <td className="px-8 py-4 font-mono text-slate-400 font-bold text-base">
                        {row.previousReading.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </td>

                      {/* Meter Input Field */}
                      <td className="px-8 py-4">
                        {row.hasBill ? (
                          <div className="relative max-w-[220px]">
                            <input
                              type="number"
                              step="any"
                              placeholder="กรอกเลขมิเตอร์..."
                              value={row.currentReadingInput}
                              onChange={(e) => handleInputChange(row.roomId, e.target.value)}
                              className={`w-full font-mono text-base px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                                isInvalid
                                  ? "border-rose-300 bg-rose-50/50 text-rose-900 focus:ring-rose-500/20"
                                  : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/10 hover:border-slate-350"
                              }`}
                            />
                            {isInvalid && (
                              <span className="absolute left-1 -bottom-5 text-[10px] text-rose-500 font-bold flex items-center gap-1 animate-in fade-in duration-200">
                                <AlertCircle className="w-3.5 h-3.5" /> ห้ามกรอกน้อยกว่าเดือนก่อนหน้า
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/50 shadow-sm">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> ยังไม่สร้างรอบบิลตั้งต้น
                          </span>
                        )}
                      </td>

                      {/* Units Used Column */}
                      <td className="px-8 py-4 text-center">
                        {row.hasBill && hasInput && !isInvalid ? (
                          <span
                            className={`inline-flex items-center font-mono font-black px-3 py-1 rounded-full text-xs border ${
                              meterType === "ELECTRIC"
                                ? "bg-blue-50 text-blue-700 border-blue-100"
                                : "bg-emerald-50 text-emerald-700 border-emerald-100"
                            }`}
                          >
                            {unitsUsed.toLocaleString(undefined, { maximumFractionDigits: 2 })} หน่วย
                          </span>
                        ) : (
                          <span className="text-slate-300 font-mono font-bold">—</span>
                        )}
                      </td>

                      {/* Cost Column */}
                      <td className="px-8 py-4 text-right pr-8 font-mono font-extrabold text-lg text-slate-800">
                        {row.hasBill && hasInput && !isInvalid ? (
                          <span className={meterType === "ELECTRIC" ? "text-blue-600" : "text-emerald-600"}>
                            ฿{(unitsUsed * ratePerUnit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-slate-300">฿0.00</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 border border-slate-200/60 p-6 rounded-3xl">
        <div className="text-center sm:text-left">
          <p className="text-sm font-bold text-slate-800">
            คำนวณและสรุปบิลอัตโนมัติ
          </p>
          <p className="text-xs text-slate-500 mt-1">
            เมื่อกดบันทึก ข้อมูลยูนิตจะอัปเดตเข้าไปในใบแจ้งหนี้เดือนนี้ของลูกบ้านโดยทันที
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={fetchMeterRows}
            disabled={isLoading || isSaving}
            className="flex items-center justify-center gap-1.5 px-5 py-3 text-sm font-bold rounded-xl border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            รีเฟรช
          </button>
          <button
            onClick={handleSubmitMeters}
            disabled={isLoading || isSaving || meterRows.length === 0}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-6 py-3 text-sm font-black text-white bg-slate-800 hover:bg-slate-700 transition-all rounded-xl shadow-lg hover:shadow-xl active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSaving ? "กำลังบันทึก..." : "บันทึกและคำนวณยอดบิล"}
          </button>
        </div>
      </div>
    </div>
  );
}
