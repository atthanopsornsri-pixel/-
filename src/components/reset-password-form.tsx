"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }
    if (password !== confirm) {
      setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "เกิดข้อผิดพลาด");
        setLoading(false);
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Logo */}
      <div className="mb-8 relative flex items-center justify-center">
        <div className="relative h-20 w-auto flex items-center justify-center">
          <Image src="/images/logo.png" alt="JadHor OS Logo" width={280} height={80} className="object-contain h-20 w-auto" priority />
        </div>
      </div>

      <div className="space-y-2 text-center mb-8 w-full">
        <h2 className="text-[28px] font-semibold text-slate-900 tracking-tight">ตั้งรหัสผ่านใหม่</h2>
        <p className="text-[15px] text-slate-500">กรอกรหัสผ่านใหม่ที่คุณต้องการใช้</p>
      </div>

      <div className="w-full max-w-[340px] space-y-4">
        {!token ? (
          <div className="text-center space-y-5">
            <p className="text-[15px] text-red-500">ลิงก์ไม่ถูกต้องหรือไม่สมบูรณ์ กรุณาขอลิงก์รีเซ็ตใหม่</p>
            <Link href="/forgot-password" className="inline-block w-full h-[50px] leading-[50px] rounded-xl bg-black hover:bg-slate-800 text-white font-medium text-base transition-colors">
              ขอลิงก์รีเซ็ตใหม่
            </Link>
          </div>
        ) : done ? (
          <div className="space-y-5 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
              <svg className="w-7 h-7 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <p className="text-[15px] text-slate-600">ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว กำลังพาไปหน้าเข้าสู่ระบบ...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-sm text-red-500 text-center font-medium animate-in fade-in">{error}</div>
            )}
            <Input
              id="password"
              type="password"
              placeholder="รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-[52px] rounded-xl bg-white border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-base px-4 transition-all"
            />
            <Input
              id="confirm"
              type="password"
              placeholder="ยืนยันรหัสผ่านใหม่"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="h-[52px] rounded-xl bg-white border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-base px-4 transition-all"
            />
            <Button
              className="w-full h-[50px] rounded-xl bg-black hover:bg-slate-800 text-white font-medium text-base transition-colors"
              type="submit"
              disabled={loading}
            >
              {loading ? "กำลังบันทึก..." : "บันทึกรหัสผ่านใหม่"}
            </Button>
            <div className="text-center pt-2">
              <Link href="/login" className="text-[14px] text-blue-600 hover:text-blue-700 hover:underline">
                กลับไปหน้าเข้าสู่ระบบ
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
