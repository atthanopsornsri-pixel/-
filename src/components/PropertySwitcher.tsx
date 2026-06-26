"use client";

import { useRouter } from "next/navigation";

export function PropertySwitcher({
  properties,
  currentValue,
}: {
  properties: { id: string; name: string }[];
  currentValue: string;
}) {
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const params = new URLSearchParams(window.location.search);
    if (val) {
      params.set("propertyId", val);
    } else {
      params.delete("propertyId");
    }
    router.push(`/dashboard?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">เลือกหอพัก:</label>
      <select
        value={currentValue}
        onChange={handleChange}
        className="bg-white/90 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#34508c]/30 cursor-pointer shadow-sm transition-all hover:bg-white"
      >
        <option value="">ทุกตึก</option>
        {properties.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}
