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
  const [lineLoading, setLineLoading] = useState(false);

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

  const handleLineLogin = () => {
    setLineLoading(true);
    signIn("line", { callbackUrl: "/dashboard" });
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
        <h2 className="text-[28px] font-semibold text-slate-900 tracking-tight">
          ลงชื่อเข้าสู่ระบบ
        </h2>
        <p className="text-[15px] text-slate-500">
          {isTenant ? "ลูกบ้าน — ใช้ LINE ล็อกอินได้เลย" : "ด้วยบัญชี JadHor OS ของคุณ"}
        </p>
      </div>

      <div className="w-full max-w-[340px] space-y-4">

        {/* ── LINE Login (สำหรับลูกบ้าน) ── */}
        <Button
          type="button"
          onClick={handleLineLogin}
          disabled={lineLoading}
          className="w-full h-[52px] rounded-xl bg-[#00C300] hover:bg-[#00B000] text-white font-semibold text-base shadow-lg shadow-[#00C300]/20 flex items-center justify-center gap-3 transition-all"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M20 2H4C2.897 2 2 2.897 2 4v18l4-4h14c1.103 0 2-.897 2-2V4c0-1.103-.897-2-2-2z"/>
          </svg>
          {lineLoading ? "กำลังเชื่อมต่อ LINE..." : "ล็อกอินด้วย LINE"}
        </Button>

        {/* ── Divider ── */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400 font-medium">หรือล็อกอินด้วยอีเมล</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* ── Credentials form ── */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-red-500 text-center font-medium animate-in fade-in">
              {error}
            </div>
          )}

          <Input
            id="email"
            type="text"
            placeholder="อีเมล"
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

          <Button
            className="w-full h-[50px] rounded-xl bg-black hover:bg-slate-800 text-white font-medium text-base transition-colors"
            type="submit"
            disabled={loading}
          >
            {loading ? "กำลังดำเนินการ..." : "ดำเนินการต่อ"}
          </Button>
        </form>

        {/* Links */}
        <div className="flex flex-col items-center gap-3 text-[14px] pt-2">
          <Link href="/register" className="text-blue-600 hover:text-blue-700 hover:underline">
            สร้างบัญชี JadHor OS ของคุณ
          </Link>
          <a href="#" className="text-blue-600 hover:text-blue-700 hover:underline">
            ลืมรหัสผ่านใช่หรือไม่?
          </a>
        </div>

        {/* Footer */}
        <div className="pt-6 text-center text-[12px] text-slate-400 leading-relaxed px-4">
          การใช้บริการถือว่าคุณยอมรับเงื่อนไขและข้อตกลงของเรา <br/>
          <Link href="/" className="text-blue-600 hover:underline mt-2 inline-block">กลับหน้าเว็บไซต์หลัก</Link>
        </div>

      </div>
    </div>
  );
}
