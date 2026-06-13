"use client";

import { useEffect, useState } from "react";

/** วงกลม progress ring — animate จาก 0 → value เมื่อ mount */
export function CircularProgress({
  value,
  color,
  size = 84,
}: {
  value: number;
  color: string;
  size?: number;
}) {
  const [progress, setProgress] = useState(0);
  const radius = size / 2 - 7;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    const t = setTimeout(() => setProgress(value), 120);
    return () => clearTimeout(t);
  }, [value]);

  const filled = (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        style={{ transform: "rotate(-90deg)" }}
      >
        {/* track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth="4.5"
          strokeOpacity="0.12"
          fill="none"
        />
        {/* arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth="4.5"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${filled} ${circumference}`}
          style={{ transition: "stroke-dasharray 1.1s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[11px] font-bold leading-none" style={{ color }}>
          {value}%
        </span>
      </div>
    </div>
  );
}
