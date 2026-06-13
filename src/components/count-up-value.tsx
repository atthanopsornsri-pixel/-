"use client";

import { useEffect, useRef, useState } from "react";

/** Count-up animation ตัวเลขจาก 0 → target เมื่อ mount */
export function CountUpValue({
  target,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 900,
}: {
  target: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
}) {
  const [val, setVal] = useState(0);
  const raf = useRef<number>(0);
  const start = useRef<number>(0);

  useEffect(() => {
    start.current = 0;
    const animate = (ts: number) => {
      if (!start.current) start.current = ts;
      const progress = Math.min((ts - start.current) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(eased * target);
      if (progress < 1) raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return (
    <>
      {prefix}
      {val.toFixed(decimals)}
      {suffix}
    </>
  );
}
