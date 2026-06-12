"use client";

import { SessionProvider } from "next-auth/react";
import { SWRConfig } from "swr";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SWRConfig
        value={{
          // ข้อมูล API ที่ fetch แล้วใช้ได้เลย 30 วินาที ไม่ต้อง fetch ซ้ำ
          dedupingInterval: 30_000,
          // ไม่ re-fetch เมื่อสลับกลับมาที่หน้าต่าง — สาเหตุหลักที่ช้า
          revalidateOnFocus: false,
          // ไม่ re-fetch เมื่อต่อเน็ตใหม่
          revalidateOnReconnect: false,
          // fetcher default สำหรับทุก useSWR() ในระบบ
          fetcher: (url: string) =>
            fetch(url).then((r) => {
              if (!r.ok) throw new Error(`Fetch ${r.status}: ${url}`);
              return r.json();
            }),
        }}
      >
        {children}
      </SWRConfig>
    </SessionProvider>
  );
}
