"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { bindTenantAccount } from "@/app/actions/tenant-binding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Phone, AlertCircle, CheckCircle2 } from "lucide-react";

export default function TenantBindingPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // If session is loading, show blank or spinner
  if (status === "loading") {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  }

  // If no session or not a LINE user, redirect to login
  if (!session || session.user.role !== "TENANT" || !session.user.lineUserId) {
    router.replace("/login");
    return null;
  }

  // If the session says it's already bound, redirect to dashboard
  if (session.user.isBound) {
    router.replace("/dashboard");
    return null;
  }

  const handleBind = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!phoneNumber || phoneNumber.length < 9) {
      setErrorMsg("กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Call Server Action to bind account
      const res = await bindTenantAccount(phoneNumber, session.user.lineUserId!);

      if (res.success) {
        setSuccessMsg(res.message || "ผูกบัญชีสำเร็จ");
        
        // 2. IMPORTANT: Refresh the NextAuth Session!
        // This triggers the JWT callback again, which will now query the DB, 
        // find the tenant using the lineUserId, and inject tenantId and roomId into the token.
        await update(); 

        // 3. Redirect to the tenant dashboard where they can see their bills
        router.push("/dashboard");
      } else {
        setErrorMsg(res.error || "ไม่สามารถผูกบัญชีได้");
      }
    } catch (err) {
      setErrorMsg("ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#00C300]/10 text-[#00C300] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
              {/* Simple LINE icon representation */}
              <path d="M21.543 10.457c0-4.32-4.225-7.838-9.424-7.838-5.197 0-9.423 3.518-9.423 7.838 0 3.864 3.398 7.151 8.019 7.747.314.041.761.127.87.397.098.242.063.616.03.856l-.134.808c-.042.253-.195.962.846.525s5.586-3.29 7.683-5.694c1.025-1.18 1.533-2.392 1.533-3.639M8.36 12.38H5.975v-3.774h2.384v1.01H7.07v.39h1.289v.987H7.07v.397h1.29v.99zm2.463 0H9.554V8.606h1.269v3.774zm4.185 0h-1.3l-1.572-2.14v2.14h-1.269V8.606h1.29l1.551 2.131V8.606h1.269v3.774zm3.085-2.784h-1.29V8.606h-1.269v3.774h2.559v-.99h-1.29v-.397h1.29v-.987h-1.29v-.39h1.29v-.99z" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800">เชื่อมต่อบัญชี</h1>
          <p className="text-slate-500 mt-2 text-sm">
            กรุณายืนยันเบอร์โทรศัพท์ที่ลงทะเบียนไว้กับหอพักเพื่อผูกบัญชี LINE ของคุณ
          </p>
        </div>

        {/* Status Messages */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex items-start gap-3 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{errorMsg}</p>
          </div>
        )}
        
        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl flex items-start gap-3 text-sm">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{successMsg}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleBind} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">เบอร์โทรศัพท์</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-5 h-5" />
              </div>
              <Input
                type="tel"
                placeholder="0812345678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))} // Allow only numbers
                className="pl-11 h-14 bg-slate-50 border-slate-200 text-lg tracking-wider rounded-xl focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                disabled={isLoading || !!successMsg}
              />
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={isLoading || !!successMsg || phoneNumber.length < 9}
            className="w-full h-14 bg-[#00C300] hover:bg-[#00B000] text-white font-bold rounded-xl text-lg shadow-lg shadow-[#00C300]/30 transition-all"
          >
            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "ยืนยันการผูกบัญชี"}
          </Button>
        </form>

      </div>
    </div>
  );
}
