"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession, signIn, signOut } from "next-auth/react";

function TenantRegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status, update } = useSession();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const code = searchParams.get("code") || searchParams.get("inviteCode") || "";
    if (code) {
      setInviteCode(code.toUpperCase());
    }
  }, [searchParams]);

  useEffect(() => {
    if (session?.user) {
      if (session.user.name && !name) {
        setName(session.user.name);
      }
      if (session.user.email && !email) {
        setEmail(session.user.email);
      }
    }
  }, [session, name, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      setError("กรุณากรอกช่องรหัสห้องพัก (Invite Code)");
      return;
    }
    if (!name.trim()) {
      setError("กรุณากรอกช่องชื่อ-นามสกุลผู้เช่า");
      return;
    }
    if (!email.trim()) {
      setError("กรุณากรอกช่องอีเมล");
      return;
    }
    if (!password) {
      setError("กรุณากรอกช่องรหัสผ่าน");
      return;
    }
    if (password.length < 6) {
      setError("กรุณากรอกรหัสผ่านอย่างน้อย 6 ตัวอักษร");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register-tenant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          inviteCode,
          userId: session?.user?.id,
          lineUserId: session?.user?.lineUserId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "เกิดข้อผิดพลาดในการลงทะเบียน");
      }

      // Refresh the session so the new tenant status is active
      await update();

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="text-slate-500 font-medium animate-pulse text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          กำลังโหลดข้อมูลเซสชัน...
        </div>
      </div>
    );
  }

  if (status === "unauthenticated" || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md mx-auto shadow-xl border-slate-200 rounded-3xl p-6 bg-white">
          <CardHeader className="space-y-3 text-center pb-6">
            <div className="w-16 h-16 bg-[#00C300] rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-lg shadow-[#00C300]/30">
              {/* ไอคอน chat bubble เรียบง่าย ไม่มี path ซับซ้อนที่อ่านผิดบน mobile */}
              <svg className="w-9 h-9 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20 2H4C2.897 2 2 2.897 2 4v18l4-4h14c1.103 0 2-.897 2-2V4c0-1.103-.897-2-2-2zm-7 11h-2v-2h2v2zm0-4h-2V5h2v4z"/>
              </svg>
            </div>
            <CardTitle className="text-[24px] font-bold text-slate-800 tracking-tight">ลงทะเบียนสำหรับลูกบ้าน</CardTitle>
            <CardDescription className="text-slate-500 text-[14px] leading-relaxed">
              เพื่อผูกข้อมูลรับแจ้งเตือนบิล ใบเสร็จรับเงิน และแจ้งซ่อมผ่าน LINE กรุณาเชื่อมต่อบัญชี LINE ของคุณก่อนเริ่มกรอกข้อมูลสมัครสมาชิก
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full h-14 bg-[#00C300] hover:bg-[#00B000] text-white font-bold rounded-2xl text-base shadow-lg shadow-[#00C300]/25 transition-all flex items-center justify-center gap-3"
              onClick={() => signIn("line", { callbackUrl: "/register/tenant" })}
              aria-label="ล็อกอินผ่านบัญชี LINE"
            >
              {/* Chat bubble icon — อ่านออกชัดบน mobile ทุกขนาดฟอนต์ */}
              <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20 2H4C2.897 2 2 2.897 2 4v18l4-4h14c1.103 0 2-.897 2-2V4c0-1.103-.897-2-2-2z"/>
              </svg>
              <span>ล็อกอินผ่านบัญชี </span>
              <span translate="no">LINE</span>
            </Button>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 pt-4 border-t border-slate-100">
            <div className="text-sm text-center text-slate-500">
              มีบัญชีลูกบ้านอยู่แล้ว?{" "}
              <Link href="/login" className="text-blue-600 hover:underline font-semibold">
                เข้าสู่ระบบที่นี่
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md mx-auto shadow-xl border-slate-200 rounded-3xl bg-white">
        <CardHeader className="space-y-1 text-center pb-4">
          <CardTitle className="text-2xl font-extrabold text-slate-800 tracking-tight">สร้างบัญชีลูกบ้าน</CardTitle>
          <CardDescription className="text-[14px] text-slate-500">
            กรอกรหัสห้องเช่าและข้อมูลเพิ่มเติมเพื่อสมัครเข้าสู่ระบบ
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            
            {/* LINE Profile Linked Alert */}
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-800">
              {session.user.image ? (
                <img 
                  src={session.user.image} 
                  alt={session.user.name || "LINE Profile"} 
                  className="w-10 h-10 rounded-full border border-emerald-250"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                  {session.user.name?.charAt(0) || "L"}
                </div>
              )}
              <div className="text-sm overflow-hidden">
                <p className="font-semibold text-emerald-900">เชื่อมต่อ LINE เรียบร้อยแล้ว</p>
                <p className="text-emerald-600 text-xs truncate max-w-[200px]">{session.user.name}</p>
              </div>
            </div>

            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="inviteCode" className="font-bold text-slate-700">รหัสห้องพัก (Invite Code) *</Label>
              <Input
                id="inviteCode"
                placeholder="เช่น A1B2C3"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                required
                className="uppercase font-mono tracking-wider h-12 rounded-xl"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name" className="font-bold text-slate-700">ชื่อ-นามสกุลผู้เช่า *</Label>
              <Input
                id="name"
                placeholder="สมชาย ใจดี"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-12 rounded-xl"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="font-bold text-slate-700">อีเมล *</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 rounded-xl"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="font-bold text-slate-700">กำหนดรหัสผ่านเข้าสู่ระบบ *</Label>
              <Input
                id="password"
                type="password"
                placeholder="รหัสผ่านอย่างน้อย 6 ตัวอักษร"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-12 rounded-xl"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 pt-4 border-t border-slate-100">
            <Button 
              className="w-full h-12 bg-black hover:bg-slate-800 text-white font-bold rounded-xl transition-all" 
              type="submit" 
              disabled={loading}
            >
              {loading ? "กำลังลงทะเบียน..." : "ลงทะเบียนและผูกบัญชี"}
            </Button>
            <div className="text-sm text-center text-slate-500">
              ต้องการเปลี่ยนบัญชี LINE?{" "}
              <button 
                type="button" 
                onClick={() => signOut({ callbackUrl: window.location.href })}
                className="text-red-500 hover:underline font-semibold"
              >
                ออกจากระบบ LINE
              </button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function TenantRegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="text-slate-500 font-medium animate-pulse text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          กำลังโหลดข้อมูล...
        </div>
      </div>
    }>
      <TenantRegisterForm />
    </Suspense>
  );
}
