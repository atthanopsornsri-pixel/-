"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function SignOutButton() {
  const [showModal, setShowModal] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut({ callbackUrl: "/" });
  };

  return (
    <>
      <Button 
        onClick={() => setShowModal(true)} 
        variant="ghost" 
        className="text-slate-500 hover:text-red-600 hover:bg-red-50 font-medium rounded-full px-3 md:px-6 transition-colors text-xs md:text-sm"
      >
        ออกจากระบบ
      </Button>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-800 mb-2">ยืนยันการออกจากระบบ</h3>
            <p className="text-slate-500 mb-6">คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบ JadHor OS?</p>
            
            <div className="flex gap-3 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setShowModal(false)}
                disabled={isSigningOut}
                className="rounded-xl border-slate-200 text-slate-600 font-medium"
              >
                ยกเลิก
              </Button>
              <Button 
                variant="destructive"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium"
              >
                {isSigningOut ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
