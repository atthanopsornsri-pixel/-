"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setMessage(data.message || "ส่งคำขอเรียบร้อยแล้ว");
      setSent(true);
    } catch {
      setMessage("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f7f4ed] relative">
      <div className="w-full max-w-[480px] bg-white rounded-[32px] p-10 md:p-14 shadow-[0_8px_40px_rgb(0,0,0,0.08)] animate-in fade-in zoom-in-95 duration-500 m-4 relative z-10">
        <div className="w-full flex flex-col items-center">
          {/* Logo */}
          <div className="mb-8 relative flex items-center justify-center">
            <div className="relative h-20 w-auto flex items-center justify-center">
              <Image src="/images/logo.png" alt="JadHor OS Logo" width={280} height={80} className="object-contain h-20 w-auto" priority />
            </div>
          </div>

          <div className="space-y-2 text-center mb-8 w-full">
            <h2 className="text-[28px] font-semibold text-slate-900 tracking-tight">
              ลืมรหัสผ่าน?
            </h2>
            <p className="text-[15px] text-slate-500">
              กรอกอีเมลที่ใช้สมัคร เราจะส่งลิงก์ตั้งรหัสผ่านใหม่ไปทาง LINE และอีเมลของคุณ
            </p>
          </div>

          <div className="w-full max-w-[340px] space-y-4">
            {sent ? (
              <div className="space-y-5 text-center">
                <div className="mx-auto w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
                  <svg className="w-7 h-7 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>
                <p className="text-[15px] text-slate-600 leading-relaxed">{message}</p>
                <Link
                  href="/login"
                  className="inline-block w-full h-[50px] leading-[50px] rounded-xl bg-black hover:bg-slate-800 text-white font-medium text-base transition-colors"
                >
                  กลับไปหน้าเข้าสู่ระบบ
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {message && (
                  <div className="text-sm text-red-500 text-center font-medium">{message}</div>
                )}
                <Input
                  id="email"
                  type="email"
                  placeholder="อีเมลของคุณ"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-[52px] rounded-xl bg-white border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-base px-4 transition-all"
                />
                <Button
                  className="w-full h-[50px] rounded-xl bg-black hover:bg-slate-800 text-white font-medium text-base transition-colors"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "กำลังส่ง..." : "ส่งลิงก์ตั้งรหัสผ่านใหม่"}
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
      </div>
    </div>
  );
}
