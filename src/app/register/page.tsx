"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [registrationCode, setRegistrationCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [acceptPdpa, setAcceptPdpa] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptPdpa) {
      setError("กรุณายอมรับเงื่อนไขการให้บริการและนโยบายความเป็นส่วนตัว");
      return;
    }
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
          registrationCode,
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
      <div className="hidden md:flex flex-1 flex-col justify-between bg-blue-50 text-slate-800 p-12 relative overflow-hidden">
        {/* Soft pastel blobs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-200/50 rounded-full blur-3xl z-0"></div>
        <div className="absolute bottom-[10%] left-[-10%] w-[400px] h-[400px] bg-indigo-200/50 rounded-full blur-[100px] z-0"></div>

        <div className="relative z-10 flex justify-end">
          <Link href="/" className="flex items-center gap-2 group w-fit cursor-pointer">
            <div className="relative h-16 w-auto flex items-center justify-start group-hover:scale-105 transition-transform">
              <Image src="/images/logo.png" alt="ApartmentOS Logo" width={240} height={64} className="object-contain h-16 w-auto" priority />
            </div>
          </Link>
        </div>

        <div className="relative z-10 mt-10 flex flex-col items-center justify-center flex-1">
          <div className="w-full max-w-md text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white text-blue-600 text-sm mb-6 border border-blue-100 shadow-sm font-semibold">
              ✨ ทดลองใช้ฟรี 14 วัน
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold mb-4 leading-tight text-slate-900">จัดการหอพักยุคใหม่ <br/><span className="text-blue-600">ง่าย ครบ จบในที่เดียว</span></h1>
            <p className="text-slate-600">
              ยกระดับอพาร์ตเมนต์ของคุณให้เป็นระบบดิจิทัล จัดการห้องพัก บิลค่าน้ำไฟ และผู้เช่าได้อย่างมืออาชีพ
            </p>
          </div>
          
          <div className="w-full max-w-lg relative">
            {/* Minimalist Apartment Illustration */}
            <div className="relative w-full aspect-square md:aspect-[4/3] rounded-3xl overflow-hidden mix-blend-multiply">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/apartment-illustration.png" alt="Apartment Illustration" className="w-full h-full object-contain opacity-90" />
            </div>
          </div>
        </div>
        
        <div className="relative z-10 flex items-center justify-center gap-4 text-sm text-slate-400 mt-10 font-medium">
          <span>© 2026 ApartmentOS.</span>
        </div>
      </div>

      {/* Right Panel: Form */}
      <div className="flex-1 flex items-center justify-center p-8 md:p-12 relative overflow-y-auto max-h-screen">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700 py-10">
          <div className="md:hidden flex items-center justify-center gap-2 mb-10">
            <div className="relative h-14 w-auto flex items-center justify-center">
              <Image src="/images/logo.png" alt="ApartmentOS Logo" width={220} height={56} className="object-contain h-14 w-auto" priority />
            </div>
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
                  <Label htmlFor="registrationCode" className="text-slate-700 font-medium">รหัสลงทะเบียน (Invite Code) <span className="text-red-500">*</span></Label>
                  <Input
                    id="registrationCode"
                    placeholder="กรอกรหัสที่ได้รับจากผู้ดูแลระบบ"
                    value={registrationCode}
                    onChange={(e) => setRegistrationCode(e.target.value)}
                    required
                    className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white"
                  />
                </div>
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
                <div className="flex items-start space-x-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <input
                    type="checkbox"
                    id="pdpa"
                    checked={acceptPdpa}
                    onChange={(e) => setAcceptPdpa(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <Label htmlFor="pdpa" className="text-sm text-slate-600 leading-relaxed cursor-pointer font-normal">
                    ฉันได้อ่านและยอมรับ <Link href="/terms" className="text-blue-600 hover:underline font-medium">เงื่อนไขการให้บริการ</Link> และ <Link href="/privacy" className="text-blue-600 hover:underline font-medium">นโยบายความเป็นส่วนตัว (PDPA)</Link>
                  </Label>
                </div>

                <Button className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base shadow-lg shadow-blue-600/20" type="submit" disabled={loading}>
                  {loading ? "กำลังสร้างบัญชี..." : "ลงทะเบียนเข้าใช้งาน"}
                </Button>
                
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
