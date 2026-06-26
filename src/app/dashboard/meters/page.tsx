"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import {
  Building,
  Zap,
  Droplet,
  Save,
  Loader2,
  Calendar,
  AlertCircle,
  RefreshCw,
  History,
  Search,
} from "lucide-react";
import { getRoomsBothMeters, saveBothMeters, getMeterHistory } from "@/app/actions/meters";

interface RoomMeterRowBoth {
  roomId: string;
  roomNumber: string;
  hasBill: boolean;
  prevElectric: number;
  electricInput: string;
  prevWater: number;
  waterInput: string;
}

const thaiMonths = [
  "มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
  "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม",
];

export default function MeterEntryPage() {
  const [propertyId, setPropertyId] = useState("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const [electricRate, setElectricRate] = useState(0);
  const [waterRate, setWaterRate] = useState(0);
  const [rows, setRows] = useState<RoomMeterRowBoth[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Tab & History States
  const [activeTab, setActiveTab] = useState<"entry" | "history">("entry");
  const [historyBills, setHistoryBills] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchRoom, setSearchRoom] = useState("");

  // Fetch history when tab changes
  useEffect(() => {
    if (propertyId && activeTab === "history") {
      fetchHistory();
    }
  }, [propertyId, activeTab]);

  async function fetchHistory() {
    setHistoryLoading(true);
    try {
      const res = await getMeterHistory(propertyId);
      if (res.success && res.bills) {
        setHistoryBills(res.bills);
      } else {
        toast.error((res as any).error || "เกิดข้อผิดพลาดในการดึงประวัติมิเตอร์");
      }
    } catch {
      toast.error("ระบบดึงข้อมูลประวัติขัดข้อง");
    } finally {
      setHistoryLoading(false);
    }
  }

  // ─── Load properties via SWR (shared cache กับหน้า rooms/billing) ──
  const { data: properties = [] } = useSWR<any[]>("/api/properties");

  // Auto-select first property when data arrives
  useEffect(() => {
    if (properties.length > 0 && !propertyId) {
      setPropertyId(properties[0].id);
    }
  }, [properties, propertyId]);

  // ─── Reload rows when filters change ────────────────────────────
  useEffect(() => {
    if (propertyId) fetchRows();
    else setRows([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, month, year]);

  async function fetchRows() {
    setIsLoading(true);
    try {
      const res = await getRoomsBothMeters(propertyId, month, year);
      if (res.success && res.rows) {
        setElectricRate(res.electricRate ?? 0);
        setWaterRate(res.waterRate ?? 0);
        setRows(res.rows as RoomMeterRowBoth[]);
      } else {
        toast.error((res as any).error || "เกิดข้อผิดพลาดในการดึงข้อมูล");
      }
    } catch {
      toast.error("ระบบดึงข้อมูลขัดข้อง");
    } finally {
      setIsLoading(false);
    }
  }

  // ─── Input helpers ───────────────────────────────────────────────
  const updateElectric = (roomId: string, value: string) =>
    setRows((prev) => prev.map((r) => r.roomId === roomId ? { ...r, electricInput: value } : r));

  const updateWater = (roomId: string, value: string) =>
    setRows((prev) => prev.map((r) => r.roomId === roomId ? { ...r, waterInput: value } : r));

  // ─── Save ────────────────────────────────────────────────────────
  async function handleSave() {
    if (!propertyId) { toast.error("กรุณาเลือกหอพัก"); return; }

    const updates: { roomId: string; electricReading?: number; waterReading?: number }[] = [];

    for (const row of rows) {
      if (!row.hasBill) continue;

      const eVal = row.electricInput.trim();
      const wVal = row.waterInput.trim();

      const entry: { roomId: string; electricReading?: number; waterReading?: number } = { roomId: row.roomId };

      if (eVal !== "") {
        const n = parseFloat(eVal);
        if (isNaN(n) || n < 0) { toast.error(`ห้อง ${row.roomNumber}: เลขไฟฟ้าไม่ถูกต้อง`); return; }
        if (n < row.prevElectric) { toast.error(`ห้อง ${row.roomNumber}: เลขไฟฟ้าห้ามน้อยกว่าเดือนก่อน (${row.prevElectric})`); return; }
        entry.electricReading = n;
      }

      if (wVal !== "") {
        const n = parseFloat(wVal);
        if (isNaN(n) || n < 0) { toast.error(`ห้อง ${row.roomNumber}: เลขน้ำไม่ถูกต้อง`); return; }
        if (n < row.prevWater) { toast.error(`ห้อง ${row.roomNumber}: เลขน้ำห้ามน้อยกว่าเดือนก่อน (${row.prevWater})`); return; }
        entry.waterReading = n;
      }

      if (entry.electricReading !== undefined || entry.waterReading !== undefined) {
        updates.push(entry);
      }
    }

    if (updates.length === 0) {
      toast.error("กรุณากรอกเลขมิเตอร์อย่างน้อย 1 ช่อง");
      return;
    }

    setIsSaving(true);
    try {
      const res = await saveBothMeters(propertyId, month, year, updates);
      if (res.success) {
        toast.success(res.message || "บันทึกมิเตอร์สำเร็จ!");
        fetchRows();
      } else {
        toast.error(res.error || "บันทึกล้มเหลว");
      }
    } catch (e: any) {
      toast.error(e.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsSaving(false);
    }
  }

  // ─── Computed helpers ────────────────────────────────────────────
  function calcElectric(row: RoomMeterRowBoth) {
    const n = parseFloat(row.electricInput);
    if (isNaN(n)) return null;
    const units = n - row.prevElectric;
    return { units, amount: units * electricRate, invalid: units < 0 };
  }
  function calcWater(row: RoomMeterRowBoth) {
    const n = parseFloat(row.waterInput);
    if (isNaN(n)) return null;
    const units = n - row.prevWater;
    return { units, amount: units * waterRate, invalid: units < 0 };
  }

  const roomsWithoutBills = rows.filter((r) => !r.hasBill);

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-[28px] font-bold text-[var(--jh-ink)] tracking-[-0.02em] flex items-center gap-3">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-[var(--jh-radius-md)]"
              style={{ background: "#34508c", color: "#fff", boxShadow: "0 10px 22px -8px #34508c" }}
            >
              <Zap className="w-6 h-6" strokeWidth={2} />
            </span>
            จดบันทึกมิเตอร์ด่วน
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-2">
            บันทึกมิเตอร์ไฟฟ้า + ประปาพร้อมกันทุกห้องในชีตเดียว — คำนวณยอดบิลอัตโนมัติ
          </p>
        </div>

        {/* Rate chips */}
        <div className="flex items-center gap-2 self-start">
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border border-blue-100 bg-blue-50 text-blue-700">
            <Zap className="w-3.5 h-3.5 fill-blue-200 text-blue-500" strokeWidth={2} />
            ไฟฟ้า ฿{electricRate} / หน่วย
          </span>
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border border-emerald-100 bg-emerald-50 text-emerald-700">
            <Droplet className="w-3.5 h-3.5 fill-emerald-200 text-emerald-500" strokeWidth={2} />
            ประปา ฿{waterRate} / หน่วย
          </span>
        </div>
      </div>

      {/* ── Tabs Segmented Control ── */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200/50">
        <button
          onClick={() => setActiveTab("entry")}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-extrabold rounded-xl transition-all cursor-pointer ${
            activeTab === "entry"
              ? "bg-white text-[#34508c] shadow-sm"
              : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
          }`}
        >
          <Zap className="w-4 h-4" />
          จดบันทึกมิเตอร์ด่วน
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-extrabold rounded-xl transition-all cursor-pointer ${
            activeTab === "history"
              ? "bg-white text-[#34508c] shadow-sm"
              : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
          }`}
        >
          <History className="w-4 h-4" />
          ประวัติการจดมิเตอร์ย้อนหลัง
        </button>
      </div>

      {/* ── Warning: rooms missing base bill ── */}
      {activeTab === "entry" && roomsWithoutBills.length > 0 && (
        <div className="bg-amber-50 border border-amber-200/55 rounded-3xl p-5 flex items-start gap-4 text-amber-800 animate-in fade-in duration-300">
          <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-bold text-sm">
              {roomsWithoutBills.length} ห้องยังไม่ได้เปิดรอบบิลตั้งต้นในรอบเดือนนี้
            </h4>
            <p className="text-xs text-amber-700/90 mt-1 leading-relaxed">
              ระบบบล็อกช่องกรอกไว้เพื่อป้องกัน Ghost Invoices — กรุณาไปที่{" "}
              <a href="/dashboard/billing" className="font-bold underline hover:text-amber-950">
                ออกบิล & ค่าน้ำไฟ
              </a>{" "}
              เพื่อสร้างบิลตั้งต้นก่อน
            </p>
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <option value="" disabled>เลือกหอพัก</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {activeTab === "entry" ? (
            <>
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
                    <option key={i} value={i + 1}>{name}</option>
                  ))}
                </select>
              </div>

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
                    return <option key={y} value={y}>{y + 543}</option>;
                  })}
                </select>
              </div>
            </>
          ) : (
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                ค้นหาหมายเลขห้อง
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="พิมพ์ค้นหาหมายเลขห้อง เช่น 101"
                  value={searchRoom}
                  onChange={(e) => setSearchRoom(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3.5 py-2 text-sm font-medium text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Spreadsheet Grid ── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.02)] overflow-hidden">
        {activeTab === "entry" ? (
          isLoading ? (
            /* ─ Skeleton ─ */
            <div className="p-4 animate-pulse">
              <div className="grid grid-cols-8 gap-2 px-2 pb-3 border-b border-slate-100 mb-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-3 bg-slate-100 rounded w-full" />
                ))}
              </div>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="grid grid-cols-8 gap-2 px-2 py-2">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <div key={j} className="h-9 bg-slate-100 rounded-lg w-full" />
                  ))}
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            /* ─ Empty state ─ */
            <div className="py-24 text-center">
              <div className="w-16 h-16 mx-auto bg-slate-50 rounded-2xl flex items-center justify-center text-2xl border border-slate-100 mb-4">
                🛏️
              </div>
              <p className="text-slate-500 font-bold">ไม่พบห้องพักที่มีผู้เช่า (OCCUPIED)</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                ระบบจะรองรับเฉพาะห้องพักที่มีสถานะย้ายเข้าและมีผู้เช่าพักอาศัยจริงเท่านั้น
              </p>
            </div>
          ) : (
            /* ─ Excel grid ─ */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                {/* Section header row */}
                <thead>
                  <tr className="border-b border-slate-100">
                    {/* Room column */}
                    <th
                      rowSpan={2}
                      className="px-5 py-3 w-24 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50/70 border-r border-slate-100 align-middle"
                    >
                      ห้องพัก
                    </th>
                    {/* Electric section header */}
                    <th
                      colSpan={3}
                      className="px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-center border-r border-slate-100"
                      style={{ background: "#f3f5fa", color: "#34508c" }}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 fill-blue-200" strokeWidth={2} />
                        ไฟฟ้า
                      </span>
                    </th>
                    {/* Water section header */}
                    <th
                      colSpan={3}
                      className="px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-center border-r border-slate-100"
                      style={{ background: "#f3fcf6", color: "#34c759" }}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Droplet className="w-3.5 h-3.5 fill-emerald-200" strokeWidth={2} />
                        ประปา
                      </span>
                    </th>
                    {/* Total */}
                    <th
                      rowSpan={2}
                      className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50/70 text-right align-middle"
                    >
                      ยอดรวม
                    </th>
                  </tr>

                  {/* Sub-header row */}
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    {/* Electric sub-headers */}
                    <th className="px-4 py-2.5 border-l border-slate-100" style={{ background: "#f3f5fa" }}>มิเตอร์ก่อนหน้า</th>
                    <th className="px-4 py-2.5 w-44" style={{ background: "#e4eaf5" }}>
                      <span className="text-blue-600">กรอกมิเตอร์ปัจจุบัน</span>
                    </th>
                    <th className="px-4 py-2.5 text-center border-r border-slate-100" style={{ background: "#f3f5fa" }}>หน่วย</th>
                    {/* Water sub-headers */}
                    <th className="px-4 py-2.5" style={{ background: "#f3fcf6" }}>มิเตอร์ก่อนหน้า</th>
                    <th className="px-4 py-2.5 w-44" style={{ background: "#e0f7e9" }}>
                      <span className="text-emerald-600">กรอกมิเตอร์ปัจจุบัน</span>
                    </th>
                    <th className="px-4 py-2.5 text-center border-r border-slate-100" style={{ background: "#f3fcf6" }}>หน่วย</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-50">
                  {rows.map((row) => {
                    const e = calcElectric(row);
                    const w = calcWater(row);
                    const totalAmount = (e && !e.invalid ? e.amount : 0) + (w && !w.invalid ? w.amount : 0);
                    const hasAnyValue = (e !== null && !e.invalid) || (w !== null && !w.invalid);

                    return (
                      <tr key={row.roomId} className="hover:bg-slate-50/30 transition-colors group">

                        {/* ── Room ── */}
                        <td className="px-5 py-3.5 font-mono font-bold text-slate-800 text-base border-r border-slate-100">
                          {row.roomNumber}
                        </td>

                        {/* ── Electric: prev ── */}
                        <td className="px-4 py-3.5 font-mono text-slate-400 font-semibold" style={{ background: "#fafcff" }}>
                          {row.prevElectric.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>

                        {/* ── Electric: input ── */}
                        <td className="px-3 py-3" style={{ background: "#f7f9ff" }}>
                          {row.hasBill ? (
                            <div className="relative">
                              <input
                                type="number"
                                step="any"
                                placeholder="เลขมิเตอร์ไฟ"
                                value={row.electricInput}
                                onChange={(ev) => updateElectric(row.roomId, ev.target.value)}
                                className={`w-full font-mono text-sm px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 transition-all min-w-[130px] ${
                                  e?.invalid
                                    ? "border-rose-300 bg-rose-50 text-rose-900 focus:ring-rose-400/20"
                                    : "border-blue-200/60 bg-white focus:border-blue-400 focus:ring-blue-400/15 hover:border-blue-300"
                                }`}
                              />
                              {e?.invalid && (
                                <span className="absolute left-1 -bottom-4 text-[9px] text-rose-500 font-bold flex items-center gap-1">
                                  <AlertCircle className="w-2.5 h-2.5" /> น้อยกว่าเดือนก่อน
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/50">
                              <AlertCircle className="w-3 h-3" /> ยังไม่มีรอบบิล
                            </span>
                          )}
                        </td>

                        {/* ── Electric: units ── */}
                        <td className="px-4 py-3.5 text-center border-r border-slate-100" style={{ background: "#fafcff" }}>
                          {e && !e.invalid ? (
                            <span className="inline-flex items-center font-mono font-black text-[11px] px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                              {e.units.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-mono font-bold text-xs">—</span>
                          )}
                        </td>

                        {/* ── Water: prev ── */}
                        <td className="px-4 py-3.5 font-mono text-slate-400 font-semibold" style={{ background: "#fafffe" }}>
                          {row.prevWater.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>

                        {/* ── Water: input ── */}
                        <td className="px-3 py-3" style={{ background: "#f5fef8" }}>
                          {row.hasBill ? (
                            <div className="relative">
                              <input
                                type="number"
                                step="any"
                                placeholder="เลขมิเตอร์น้ำ"
                                value={row.waterInput}
                                onChange={(ev) => updateWater(row.roomId, ev.target.value)}
                                className={`w-full font-mono text-sm px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 transition-all min-w-[130px] ${
                                  w?.invalid
                                    ? "border-rose-300 bg-rose-50 text-rose-900 focus:ring-rose-400/20"
                                    : "border-emerald-200/60 bg-white focus:border-emerald-400 focus:ring-emerald-400/15 hover:border-emerald-300"
                                }`}
                              />
                              {w?.invalid && (
                                <span className="absolute left-1 -bottom-4 text-[9px] text-rose-500 font-bold flex items-center gap-1">
                                  <AlertCircle className="w-2.5 h-2.5" /> น้อยกว่าเดือนก่อน
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/50">
                              <AlertCircle className="w-3 h-3" /> ยังไม่มีรอบบิล
                            </span>
                          )}
                        </td>

                        {/* ── Water: units ── */}
                        <td className="px-4 py-3.5 text-center border-r border-slate-100" style={{ background: "#fafffe" }}>
                          {w && !w.invalid ? (
                            <span className="inline-flex items-center font-mono font-black text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                              {w.units.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-mono font-bold text-xs">—</span>
                          )}
                        </td>

                        {/* ── Total (breakdown) ── */}
                        <td className="px-5 py-3.5 text-right">
                          {hasAnyValue ? (
                            <div className="flex flex-col items-end gap-0.5">
                              {e && !e.invalid && (
                                <div className="flex items-center gap-1 font-mono text-[11px] font-semibold text-blue-500">
                                  <Zap className="w-3 h-3 shrink-0" strokeWidth={2.5} />
                                  ฿{e.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                              )}
                              {w && !w.invalid && (
                                <div className="flex items-center gap-1 font-mono text-[11px] font-semibold text-emerald-500">
                                  <Droplet className="w-3 h-3 shrink-0" strokeWidth={2.5} />
                                  ฿{w.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                              )}
                              {/* แสดงยอดรวมเฉพาะเมื่อมีทั้งค่าไฟ + ค่าน้ำ */}
                              {e && !e.invalid && w && !w.invalid && (
                                <div className="w-full border-t border-slate-200 pt-1 mt-0.5">
                                  <span className="font-mono font-extrabold text-base text-slate-800">
                                    ฿{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300 font-mono font-bold text-base">฿0.00</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* ─── History View ─── */
          historyLoading ? (
            /* ─ Skeleton ─ */
            <div className="p-4 animate-pulse">
              <div className="grid grid-cols-8 gap-2 px-2 pb-3 border-b border-slate-100 mb-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-3 bg-slate-100 rounded w-full" />
                ))}
              </div>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="grid grid-cols-8 gap-2 px-2 py-2">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <div key={j} className="h-9 bg-slate-100 rounded-lg w-full" />
                  ))}
                </div>
              ))}
            </div>
          ) : historyBills.filter((bill) => {
            if (!searchRoom.trim()) return true;
            return bill.room?.number?.toLowerCase().includes(searchRoom.toLowerCase());
          }).length === 0 ? (
            /* ─ Empty state ─ */
            <div className="py-24 text-center">
              <div className="w-16 h-16 mx-auto bg-slate-50 rounded-2xl flex items-center justify-center text-2xl border border-slate-100 mb-4">
                🔎
              </div>
              <p className="text-slate-500 font-bold">ไม่พบประวัติการจดมิเตอร์ย้อนหลัง</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                ยังไม่มีการบันทึกมิเตอร์ในระบบ หรือไม่พบผลลัพธ์จากการค้นหาของคุณ
              </p>
            </div>
          ) : (
            /* ─ History Grid ─ */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th rowSpan={2} className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50/70 border-r border-slate-100 align-middle">
                      ห้องพัก
                    </th>
                    <th rowSpan={2} className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50/70 border-r border-slate-100 align-middle">
                      รอบบิล
                    </th>
                    <th colSpan={3} className="px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-center border-r border-slate-100" style={{ background: "#f3f5fa", color: "#34508c" }}>
                      <span className="inline-flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 fill-blue-200" strokeWidth={2} />
                        ไฟฟ้า
                      </span>
                    </th>
                    <th colSpan={3} className="px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-center border-r border-slate-100" style={{ background: "#f3fcf6", color: "#34c759" }}>
                      <span className="inline-flex items-center gap-1.5">
                        <Droplet className="w-3.5 h-3.5 fill-emerald-200" strokeWidth={2} />
                        ประปา
                      </span>
                    </th>
                    <th rowSpan={2} className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50/70 text-right align-middle">
                      ยอดรวม
                    </th>
                  </tr>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="px-4 py-2.5 border-l border-slate-100" style={{ background: "#f3f5fa" }}>เลขมิเตอร์</th>
                    <th className="px-4 py-2.5 text-center" style={{ background: "#e4eaf5" }}>หน่วย</th>
                    <th className="px-4 py-2.5 text-right border-r border-slate-100" style={{ background: "#f3f5fa" }}>จำนวนเงิน</th>
                    <th className="px-4 py-2.5" style={{ background: "#f3fcf6" }}>เลขมิเตอร์</th>
                    <th className="px-4 py-2.5 text-center" style={{ background: "#e0f7e9" }}>หน่วย</th>
                    <th className="px-4 py-2.5 text-right border-r border-slate-100" style={{ background: "#f3fcf6" }}>จำนวนเงิน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {historyBills
                    .filter((bill) => {
                      if (!searchRoom.trim()) return true;
                      return bill.room?.number?.toLowerCase().includes(searchRoom.toLowerCase());
                    })
                    .map((bill) => {
                      const totalAmount = (bill.electricAmount || 0) + (bill.waterAmount || 0);
                      return (
                        <tr key={bill.id} className="hover:bg-slate-50/30 transition-colors group">
                          <td className="px-5 py-3.5 font-mono font-bold text-slate-800 text-base border-r border-slate-100">
                            {bill.room?.number || "—"}
                          </td>
                          <td className="px-5 py-3.5 font-semibold text-slate-600 border-r border-slate-100">
                            {thaiMonths[bill.month - 1]} {bill.year + 543}
                          </td>
                          {/* Electric */}
                          <td className="px-4 py-3.5 font-mono text-slate-500 font-semibold" style={{ background: "#fafcff" }}>
                            {bill.electricReading !== null ? bill.electricReading.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
                          </td>
                          <td className="px-4 py-3.5 text-center border-l border-slate-100/50" style={{ background: "#fafcff" }}>
                            {bill.electricUnits !== null ? (
                              <span className="inline-flex items-center font-mono font-black text-[11px] px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                {bill.electricUnits.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono text-slate-600 font-semibold border-r border-slate-100" style={{ background: "#f7f9ff" }}>
                            {bill.electricAmount !== null ? `฿${bill.electricAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
                          </td>
                          {/* Water */}
                          <td className="px-4 py-3.5 font-mono text-slate-500 font-semibold" style={{ background: "#fafffe" }}>
                            {bill.waterReading !== null ? bill.waterReading.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
                          </td>
                          <td className="px-4 py-3.5 text-center border-l border-slate-100/50" style={{ background: "#fafffe" }}>
                            {bill.waterUnits !== null ? (
                              <span className="inline-flex items-center font-mono font-black text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                                {bill.waterUnits.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono text-slate-600 font-semibold border-r border-slate-100" style={{ background: "#f5fef8" }}>
                            {bill.waterAmount !== null ? `฿${bill.waterAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
                          </td>
                          {/* Total */}
                          <td className="px-5 py-3.5 text-right font-mono font-extrabold text-base text-slate-800">
                            ฿{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* ── Footer controls ── */}
      {activeTab === "entry" && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 border border-slate-200/60 p-6 rounded-3xl">
          <div className="text-center sm:text-left">
            <p className="text-sm font-bold text-slate-800">
              คำนวณและสรุปบิลอัตโนมัติ
            </p>
            <p className="text-xs text-slate-500 mt-1">
              กดบันทึก — ยูนิตน้ำและไฟจะอัปเดตเข้าใบแจ้งหนี้ของลูกบ้านทันที
            </p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={fetchRows}
              disabled={isLoading || isSaving}
              className="flex items-center justify-center gap-1.5 px-5 py-3 text-sm font-bold rounded-xl border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              รีเฟรช
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading || isSaving || rows.length === 0}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-6 py-3 text-sm font-black text-white rounded-xl shadow-lg hover:shadow-xl active:scale-[0.98] cursor-pointer disabled:opacity-50 transition-all hover:-translate-y-0.5"
              style={{ background: "#34508c", boxShadow: "0 8px 18px -6px #34508c" }}
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
      )}
    </div>
  );
}
