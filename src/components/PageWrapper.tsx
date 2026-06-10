"use client";

/**
 * PageWrapper — ทำให้ทุกหน้ามี entrance animation อัตโนมัติ
 *
 * ใช้ key={pathname} เพื่อบังคับ React remount เมื่อเปลี่ยน route
 * ทำให้ animate-in ที่อยู่บน root div ของแต่ละหน้า trigger ใหม่ทุกครั้ง
 * ไม่ต้องแก้ไขหน้าแต่ละหน้าเลย
 */

import { usePathname } from "next/navigation";

export default function PageWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    // key เปลี่ยนตาม pathname → React unmount+remount → animations fire อีกครั้ง
    <div key={pathname} className="w-full">
      {children}
    </div>
  );
}
