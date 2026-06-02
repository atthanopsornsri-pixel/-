"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="w-full">
      <div className="space-y-2 text-left mb-8">
        <h2 className="text-3xl font-extrabold text-slate-900">เข้าสู่ระบบ</h2>
        <p className="text-base text-slate-500">
          กรอกอีเมลและรหัสผ่านของคุณ
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
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-slate-700 font-medium">รหัสผ่าน</Label>
              <a href="#" className="text-sm font-semibold text-blue-600 hover:underline">ลืมรหัสผ่าน?</a>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white"
            />
          </div>
        </div>
        <div className="flex flex-col space-y-6 mt-8">
          <Button className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-base shadow-lg shadow-slate-900/20" type="submit" disabled={loading}>
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </Button>
          
          <div className="relative w-full py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase font-medium">
              <span className="bg-white px-4 text-slate-400">
                หรือเข้าสู่ระบบด้วย
              </span>
            </div>
          </div>
          
          <Button variant="outline" type="button" className="w-full h-12 rounded-xl border-slate-200 hover:bg-slate-50 font-semibold text-slate-700" onClick={() => alert("Line Login coming soon!")}>
            <svg className="w-5 h-5 mr-2 text-[#00C300]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 3.551 8.875 8.358 9.584.327.071.77.218.883.499.102.253.067.643.033.811l-.145.867c-.042.247-.2.98.861.533 1.061-.448 5.722-3.376 7.943-5.863 1.341-1.503 2.067-3.149 2.067-4.992z" />
            </svg>
            เข้าสู่ระบบด้วย LINE
          </Button>
        </div>
      </form>
    </div>
  );
}
