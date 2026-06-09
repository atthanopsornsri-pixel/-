"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession, signIn, signOut } from "next-auth/react";

/** ตรวจสอบว่าอยู่ใน LINE in-app browser หรือไม่ */
function useIsLineInAppBrowser() {
  const [isLine, setIsLine] = useState(false);
  useEffect(() => {
    setIsLine(/\bLine\//i.test(navigator.userAgent));
  }, []);
  return isLine;
}

/** หน้าแนะนำให้เปิดใน Chrome/Safari */
function OpenInExternalBrowserPrompt({ inviteCode }: { inviteCode: string }) {
  const [copied, setCopied] = useState(false);
  const currentUrl = typeof window !== "undefined" ? window.location.href : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select text
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md mx-auto shadow-xl border-slate-200 rounded-3xl p-6 bg-white text-center">
        <CardHeader className="space-y-3 pb-4">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-2">
            <svg className="w-9 h-9 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <CardTitle className="text-[20px] font-bold text-slate-800">เปิดในเบราว์เซอร์ก่อนนะคะ</CardTitle>
          <CardDescription className="text-slate-500 text-[14px] leading-relaxed">
            หน้านี้ต้องเปิดใน <strong className="text-slate-700">Chrome</strong> หรือ <strong className="text-slate-700">Safari</strong> จึงจะลงทะเบียนผ่าน LINE ได้
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 1 */}
          <div className="bg-slate-50 rounded-2xl p-4 text-left space-y-3">
            <p className="text-sm font-semibold text-slate-700">วิธีเปิดในเบราว์เซอร์:</p>
            <ol className="text-sm text-slate-600 space-y-2 list-none">
              <li className="flex items-start gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                <span>กดปุ่ม <strong>⋮</strong> (สามจุด) ที่มุมขวาบน</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                <span>เลือก <strong>"เปิดใน Chrome"</strong> หรือ <strong>"เปิดใน Safari"</strong></span>
              </li>
            </ol>
          </div>

          <div className="text-xs text-slate-400">— หรือคัดลอกลิงก์แล้วเปิดในเบราว์เซอร์เอง —</div>

          <Button
            onClick={handleCopy}
            className="w-full h-12 rounded-xl font-bold bg-slate-900 hover:bg-slate-700 text-white transition-all"
          >
            {copied ? "✓ คัดลอกแล้ว!" : "📋 คัดลอกลิงก์"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function TenantRegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status, update } = useSession();
  const isLineInAppBrowser = useIsLineInAppBrowser();

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ── Hook 1: ดึง invite code จาก URL (must be before any early return) ──
  useEffect(() => {
    const code = searchParams.get("code") || searchParams.get("inviteCode") || "";
    if (code) setInviteCode(code.toUpperCase());
  }, [searchParams]);

  // ── Hook 2: pre-fill ชื่อจาก LINE profile (must be before any early return) ──
  useEffect(() => {
    if (session?.user?.name && !name) {
      setName(session.user.name);
    }
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Conditional renders (after ALL hooks) ──
  if (isLineInAppBrowser) {
    return <OpenInExternalBrowserPrompt inviteCode={inviteCode} />;
  }

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
              <svg className="w-9 h-9 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20 2H4C2.897 2 2 2.897 2 4v18l4-4h14c1.103 0 2-.897 2-2V4c0-1.103-.897-2-2-2zm-7 11h-2v-2h2v2zm0-4h-2V5h2v4z"/>
              </svg>
            </div>
            <CardTitle className="text-[24px] font-bold text-slate-800 tracking-tight">ลงทะเบียนสำหรับลูกบ้าน</CardTitle>
            <CardDescription className="text-slate-500 text-[14px] leading-relaxed">
              เพื่อผูกข้อมูลรับแจ้งเตือนบิล ใบเสร็จรับเงิน และแจ้งซ่อมผ่าน LINE กรุณาเชื่อมต่อบัญชี LINE ของคุณก่อนเริ่มกรอกข้อมูล
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              className="w-full h-14 bg-[#00C300] hover:bg-[#00B000] text-white font-bold rounded-2xl text-base shadow-lg shadow-[#00C300]/25 transition-all flex items-center justify-center gap-3"
              onClick={() => signIn("line", { callbackUrl: `/register/tenant${inviteCode ? `?code=${inviteCode}` : ""}` })}
              aria-label="ล็อกอินผ่านบัญชี LINE"
            >
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

  // ── Logged in — show registration form ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      setError("กรุณากรอกรหัสห้องพัก (Invite Code)");
      return;
    }
    if (!name.trim()) {
      setError("กรุณากรอกชื่อ-นามสกุลผู้เช่า");
      return;
    }
    if (!password || password.length < 6) {
      setError("กรุณากำหนดรหัสผ่านอย่างน้อย 6 ตัวอักษร");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // ใช้ placeholder email จาก session (ระบบสร้างให้อัตโนมัติ ผู้ใช้ไม่ต้องกรอก)
      const emailToUse = session.user.email ?? `line-${session.user.id}@line.placeholder.jadhor.app`;

      const res = await fetch("/api/auth/register-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email: emailToUse,
          password,
          inviteCode,
          userId: session.user.id,
          lineUserId: session.user.lineUserId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "เกิดข้อผิดพลาดในการลงทะเบียน");
      }

      await update();
      // redirect ไปกรอกข้อมูลจริง (ชื่อ/บัตร/รถ) ก่อนเข้า dashboard
      router.push("/register/tenant/profile");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md mx-auto shadow-xl border-slate-200 rounded-3xl bg-white">
        <CardHeader className="space-y-1 text-center pb-4">
          <CardTitle className="text-2xl font-extrabold text-slate-800 tracking-tight">สร้างบัญชีลูกบ้าน</CardTitle>
          <CardDescription className="text-[14px] text-slate-500">
            กรอกรหัสห้องเช่าและข้อมูลเพิ่มเติมเพื่อเริ่มใช้งาน
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">

            {/* LINE Profile badge */}
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3">
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || "LINE Profile"}
                  className="w-10 h-10 rounded-full border border-emerald-200 shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold shrink-0">
                  {session.user.name?.charAt(0) || "L"}
                </div>
              )}
              <div className="text-sm overflow-hidden">
                <p className="font-semibold text-emerald-900">เชื่อมต่อ LINE เรียบร้อยแล้ว ✓</p>
                <p className="text-emerald-600 text-xs">การแจ้งเตือนบิลจะส่งผ่านบัญชีนี้</p>
              </div>
            </div>

            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl">
                {error}
              </div>
            )}

            {/* Invite Code — auto-filled + read-only if from URL */}
            <div className="space-y-2">
              <Label htmlFor="inviteCode" className="font-bold text-slate-700">
                รหัสห้องพัก (Invite Code) *
              </Label>
              <Input
                id="inviteCode"
                placeholder="เช่น A1B2C3"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                required
                className="uppercase font-mono tracking-wider h-12 rounded-xl"
              />
              {inviteCode && (
                <p className="text-xs text-emerald-600 pl-1">✓ รหัสจากลิงก์เชิญ</p>
              )}
            </div>

            {/* ชื่อจริง — pre-fill จาก LINE แต่แก้ได้ */}
            <div className="space-y-2">
              <Label htmlFor="name" className="font-bold text-slate-700">
                ชื่อ-นามสกุลจริง *
              </Label>
              <Input
                id="name"
                placeholder="สมชาย ใจดี"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-12 rounded-xl"
              />
              <p className="text-xs text-slate-400 pl-1">กรอกชื่อจริง (ดึงจาก LINE แต่แก้ได้)</p>
            </div>

            {/* Password — สำหรับเข้าสู่ระบบสำรอง */}
            <div className="space-y-2">
              <Label htmlFor="password" className="font-bold text-slate-700">
                รหัสผ่านสำรอง *
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="อย่างน้อย 6 ตัวอักษร"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-12 rounded-xl"
              />
              <p className="text-xs text-slate-400 pl-1">ใช้เข้าสู่ระบบในกรณีที่ไม่ได้ใช้ LINE</p>
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
