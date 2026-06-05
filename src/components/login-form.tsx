"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import Image from "next/image";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get("role");
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isTenant = role === "tenant";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (res?.error) {
      setError("ข้อมูลการเข้าสู่ระบบไม่ถูกต้อง");
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Logo */}
      <div className="mb-8 relative flex items-center justify-center">
        <div className="relative h-20 w-auto flex items-center justify-center">
          <Image src="/images/logo.png" alt="ApartmentOS Logo" width={280} height={80} className="object-contain h-20 w-auto mix-blend-multiply" priority />
        </div>
      </div>

      <div className="space-y-2 text-center mb-8 w-full">
        <h2 className="text-[28px] font-semibold text-slate-900 tracking-tight">
          ลงชื่อเข้าสู่ระบบ
        </h2>
        <p className="text-[15px] text-slate-500">
          {isTenant ? "ด้วยรหัสลูกบ้าน หรือ อีเมลของคุณ" : "ด้วยบัญชี ApartmentOS ของคุณ"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-[340px]">
        <div className="space-y-4">
          {error && (
            <div className="text-sm text-red-500 text-center font-medium animate-in fade-in">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <Input
              id="email"
              type="text"
              placeholder={isTenant ? "รหัสลูกบ้าน / อีเมล" : "อีเมล"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-[52px] rounded-xl bg-white border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-base px-4 transition-all"
            />
            
            <Input
              id="password"
              type="password"
              placeholder="รหัสผ่าน"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-[52px] rounded-xl bg-white border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-base px-4 transition-all"
            />
          </div>
        </div>

        <div className="flex flex-col items-center mt-6 gap-6">
          <Button 
            className="w-full h-[50px] rounded-xl bg-black hover:bg-slate-800 text-white font-medium text-base transition-colors" 
            type="submit" 
            disabled={loading}
          >
            {loading ? "กำลังดำเนินการ..." : "ดำเนินการต่อ"}
          </Button>

          {/* Links */}
          <div className="flex flex-col items-center gap-3 text-[14px]">
            <Link href="/register" className="text-blue-600 hover:text-blue-700 hover:underline">
              สร้างบัญชี ApartmentOS ของคุณ
            </Link>
            
            {!isTenant && (
              <a href="#" className="text-blue-600 hover:text-blue-700 hover:underline">
                ลืมรหัสผ่านใช่หรือไม่?
              </a>
            )}
          </div>
        </div>
        
        {/* Additional Info / Footer text */}
        <div className="mt-10 text-center text-[12px] text-slate-400 leading-relaxed px-4">
          ข้อมูลบัญชี ApartmentOS ของคุณได้รับการปกป้องเพื่อให้แน่ใจว่าข้อมูลของคุณปลอดภัย การใช้บริการถือว่าคุณยอมรับเงื่อนไขและข้อตกลงของเรา <br/>
          <Link href="/" className="text-blue-600 hover:underline mt-2 inline-block">กลับหน้าเว็บไซต์หลัก</Link>
        </div>
      </form>
    </div>
  );
}
