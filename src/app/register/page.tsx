"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          role: "OWNER",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "เกิดข้อผิดพลาดในการลงทะเบียน");
      }

      router.push("/login");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row-reverse bg-white">
      {/* Left Panel: Branding / Image */}
      <div className="hidden md:flex flex-1 flex-col justify-between bg-slate-900 text-white p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/90 to-slate-900/95 z-0"></div>
        
        {/* Decorative blobs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl z-0"></div>
        <div className="absolute bottom-[20%] left-[-10%] w-[400px] h-[400px] bg-blue-500/20 rounded-full blur-[100px] z-0"></div>

        <div className="relative z-10 flex justify-end">
          <Link href="/" className="flex items-center gap-2 group w-fit cursor-pointer">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <span className="text-white font-extrabold text-xl">A</span>
            </div>
            <span className="text-2xl font-extrabold tracking-tight">
              Apartment<span className="text-blue-400">OS</span>
            </span>
          </Link>
        </div>

        <div className="relative z-10 max-w-lg mt-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-200 text-sm mb-4 md:mb-6 border border-indigo-400/30">
            ✨ ทดลองใช้ฟรี 14 วัน
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-4 md:mb-6 leading-tight">เริ่มเปลี่ยนหอพักของคุณ ให้เป็นระบบดิจิทัลวันนี้</h1>
          <ul className="space-y-3 md:space-y-4 text-sm md:text-base text-indigo-100">
            <li className="flex items-center">
              <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-indigo-500/30 flex items-center justify-center mr-3 text-xs md:text-sm">✓</div>
              จัดการห้องพักและผู้เช่าไม่จำกัด
            </li>
            <li className="flex items-center">
              <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-indigo-500/30 flex items-center justify-center mr-3 text-xs md:text-sm">✓</div>
              ออกบิลค่าน้ำค่าไฟอัตโนมัติ
            </li>
            <li className="flex items-center">
              <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-indigo-500/30 flex items-center justify-center mr-3 text-xs md:text-sm">✓</div>
              แจ้งเตือนบิลและพัสดุผ่าน LINE Notify
            </li>
          </ul>
        </div>
        
        <div className="relative z-10 flex items-center gap-4 text-sm text-slate-400 mt-10">
          <span>© 2026 ApartmentOS.</span>
        </div>
      </div>

      {/* Right Panel: Form */}
      <div className="flex-1 flex items-center justify-center p-8 md:p-12 relative overflow-y-auto max-h-screen">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700 py-10">
          <div className="md:hidden flex items-center justify-center gap-2 mb-10">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <span className="text-xl font-bold text-slate-800">
              Apartment<span className="text-blue-600">OS</span>
            </span>
          </div>

          <div className="w-full">
            <div className="space-y-2 text-left mb-8">
              <h2 className="text-3xl font-extrabold text-slate-900">สร้างบัญชีใหม่</h2>
              <p className="text-base text-slate-500">
                สมัครสมาชิกเพื่อเริ่มต้นใช้งานแพลตฟอร์ม
              </p>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="space-y-5">
                {error && (
                  <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-700 font-medium">ชื่อ-นามสกุล (ผู้ดูแล)</Label>
                  <Input
                    id="name"
                    placeholder="สมชาย ใจดี"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-700 font-medium">อีเมล</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-700 font-medium">รหัสผ่าน</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white"
                  />
                </div>
              </div>
              <div className="flex flex-col space-y-6 mt-8">
                <Button className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base shadow-lg shadow-blue-600/20" type="submit" disabled={loading}>
                  {loading ? "กำลังสร้างบัญชี..." : "ลงทะเบียนเข้าใช้งาน"}
                </Button>
                
                <p className="text-sm text-center text-slate-500">
                  เมื่อกดลงทะเบียน ถือว่าคุณยอมรับ
                  <Link href="#" className="text-blue-600 hover:underline mx-1">เงื่อนไขการให้บริการ</Link>
                  และ
                  <Link href="#" className="text-blue-600 hover:underline mx-1">นโยบายความเป็นส่วนตัว</Link>
                </p>
                
                <div className="text-center text-slate-600 pt-4 border-t border-slate-100 w-full">
                  มีบัญชีอยู่แล้ว?{" "}
                  <Link href="/login" className="text-blue-600 font-bold hover:underline">
                    เข้าสู่ระบบ
                  </Link>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
