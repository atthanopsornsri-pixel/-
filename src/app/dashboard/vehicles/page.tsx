"use client";

import useSWR from "swr";
import { jsonFetcher } from "@/lib/fetcher";
import { useState } from "react";
import { Car, Bike, Search, Building } from "lucide-react";

interface VehicleRow {
  id: string;
  licensePlate: string;
  brand: string | null;
  color: string | null;
  type: "CAR" | "MOTORCYCLE" | "OTHER";
  tenantName: string;
  roomNumber: string;
  propertyName: string;
  createdAt: string;
}

export default function VehiclesPage() {
  const { data: properties = [] } = useSWR<any[]>("/api/properties", jsonFetcher);
  const [propertyId, setPropertyId] = useState("");
  const [search, setSearch] = useState("");

  const apiUrl = propertyId
    ? `/api/owner/vehicles?propertyId=${propertyId}`
    : "/api/owner/vehicles";

  const { data: vehicles = [], isLoading } = useSWR<VehicleRow[]>(apiUrl, jsonFetcher);

  const filtered = vehicles.filter((v) => {
    const q = search.toLowerCase();
    return (
      v.licensePlate.toLowerCase().includes(q) ||
      (v.brand ?? "").toLowerCase().includes(q) ||
      (v.tenantName ?? "").toLowerCase().includes(q) ||
      v.roomNumber.toLowerCase().includes(q)
    );
  });

  const carCount = filtered.filter((v) => v.type === "CAR").length;
  const motoCount = filtered.filter((v) => v.type === "MOTORCYCLE").length;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--jh-radius-md)]"
          style={{ background: "#d4a548", color: "#fff", boxShadow: "0 10px 22px -8px #d4a548" }}
        >
          <Car className="h-[22px] w-[22px]" strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-[var(--jh-ink)]">ยานพาหนะ / ที่จอดรถ</h1>
          <p className="text-[15px] text-[var(--jh-ink-secondary)] mt-0.5">รายการยานพาหนะที่ผู้เช่าลงทะเบียนไว้ในระบบ</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "ทั้งหมด", value: filtered.length, color: "#34508c", grad: ["#f3f5fa", "#e4eaf5"] },
          { label: "รถยนต์", value: carCount, color: "#5856d6", grad: ["#f6f6ff", "#e8e7fb"] },
          { label: "มอเตอร์ไซค์", value: motoCount, color: "#d4a548", grad: ["#fdf8ee", "#f6ecd6"] },
          { label: "อื่นๆ", value: filtered.filter(v => v.type === "OTHER").length, color: "#34c759", grad: ["#f3fcf6", "#e0f7e9"] },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-[var(--jh-radius-2xl)] border border-white/60 p-5 shadow-[var(--jh-shadow-card)]"
            style={{ background: `linear-gradient(150deg, ${s.grad[0]} 0%, ${s.grad[1]} 100%)` }}
          >
            <div className="text-xs font-medium text-[var(--jh-ink-secondary)]">{s.label}</div>
            <div className="mt-1.5 text-3xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Property selector */}
        <div className="relative sm:w-56">
          <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            className="w-full h-10 pl-9 pr-4 rounded-full border border-slate-200 bg-white text-sm text-[var(--jh-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--jh-blue)]/30 appearance-none"
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
          >
            <option value="">ทุกหอพัก</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            className="w-full h-10 pl-9 pr-4 rounded-full border border-slate-200 bg-white text-sm text-[var(--jh-ink)] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--jh-blue)]/30"
            placeholder="ค้นหาทะเบียน, ยี่ห้อ, ชื่อผู้เช่า..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-[var(--jh-radius-2xl)] border border-black/[0.06] bg-white shadow-[var(--jh-shadow-card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-black/[0.06]">
                {["ประเภท", "ทะเบียน", "ยี่ห้อ / สี", "ผู้เช่า", "ห้อง", "หอพัก"].map((h) => (
                  <th key={h} className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--jh-ink-tertiary)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-black/[0.04] animate-pulse">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-5 py-3.5">
                        <div className="h-4 bg-slate-100 rounded w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-[var(--jh-ink-tertiary)] text-sm">
                    {vehicles.length === 0 ? "ยังไม่มีผู้เช่าลงทะเบียนยานพาหนะ" : "ไม่พบยานพาหนะที่ตรงกับการค้นหา"}
                  </td>
                </tr>
              ) : (
                filtered.map((v) => (
                  <tr key={v.id} className="border-b border-black/[0.04] hover:bg-slate-50/50 transition-colors">
                    {/* Type icon */}
                    <td className="px-5 py-3.5">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-xl"
                        style={{
                          background: v.type === "CAR" ? "#5856d6" : "#34508c",
                          color: "#fff",
                        }}
                      >
                        {v.type === "CAR"
                          ? <Car className="w-4 h-4" strokeWidth={2} />
                          : <Bike className="w-4 h-4" strokeWidth={2} />}
                      </div>
                    </td>

                    {/* License */}
                    <td className="px-5 py-3.5">
                      <span className="font-bold font-mono text-[var(--jh-ink)] bg-slate-100 px-2 py-0.5 rounded-md text-xs">
                        {v.licensePlate}
                      </span>
                    </td>

                    {/* Brand / Color */}
                    <td className="px-5 py-3.5 text-[var(--jh-ink-secondary)] text-xs">
                      {v.brand ?? <span className="text-slate-300">—</span>}
                      {v.color && <span className="ml-1 text-slate-400">· {v.color}</span>}
                    </td>

                    {/* Tenant */}
                    <td className="px-5 py-3.5 font-medium text-[var(--jh-ink)]">
                      {v.tenantName}
                    </td>

                    {/* Room */}
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-bold text-[var(--jh-blue)] bg-blue-50 px-2 py-0.5 rounded-full">
                        {v.roomNumber}
                      </span>
                    </td>

                    {/* Property */}
                    <td className="px-5 py-3.5 text-xs text-[var(--jh-ink-secondary)]">
                      {v.propertyName}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="px-5 py-3 text-xs text-[var(--jh-ink-tertiary)] border-t border-black/[0.04]">
            แสดง {filtered.length} คัน จากทั้งหมด {vehicles.length} คัน
          </div>
        )}
      </div>
    </div>
  );
}
