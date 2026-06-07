"use client";
import { toast } from "sonner";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "next-auth/react";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [lineChannelAccessToken, setLineChannelAccessToken] = useState("");
  const [lineUserId, setLineUserId] = useState("");
  const [lineBindingCode, setLineBindingCode] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  const isOwner = session?.user?.role === "OWNER" || session?.user?.role === "ADMIN";

  useEffect(() => {
    if (typeof window !== "undefined") {
      setWebhookUrl(window.location.origin + "/api/webhook/line");
    }
    
    async function fetchProfile() {
      const res = await fetch("/api/users/me");
      if (res.ok) {
        const data = await res.json();
        setLineChannelAccessToken(data.lineChannelAccessToken || "");
        setLineUserId(data.lineUserId || "");
        setLineBindingCode(data.lineBindingCode || "");
      }
    }
    fetchProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const res = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineChannelAccessToken, lineUserId }),
    });

    if (res.ok) {
      toast.success("บันทึกการตั้งค่าสำเร็จ");
    } else {
      toast.error("เกิดข้อผิดพลาด");
    }
    setIsSaving(false);
  };

  const [isTestingLine, setIsTestingLine] = useState(false);

  const handleTestLine = async () => {
    if (!lineChannelAccessToken || !lineUserId) {
      toast.error("กรุณากรอกทั้ง Token และ User ID ก่อนทดสอบ");
      return;
    }
    setIsTestingLine(true);
    try {
      const res = await fetch("/api/line-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: lineChannelAccessToken, lineUserId }),
      });
      if (res.ok) {
        toast.success("ทดสอบการเชื่อมต่อสำเร็จ! ส่งข้อความไปยังไลน์ของคุณเรียบร้อย");
      } else {
        const errData = await res.json();
        toast.error(errData.message || "การเชื่อมต่อล้มเหลว กรุณาตรวจสอบ Token อีกครั้ง");
      }
    } catch (err) {
      console.error(err);
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsTestingLine(false);
    }
  };

  const handleGenerateCode = async () => {
    if (isOwner && !lineChannelAccessToken) {
      toast.error("กรุณากรอกและบันทึก LINE Channel Access Token ก่อนสร้างรหัส");
      return;
    }
    setIsGeneratingCode(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generateBindingCode: true }),
      });
      if (res.ok) {
        const data = await res.json();
        setLineBindingCode(data.lineBindingCode || "");
        toast.success("สร้างรหัสผูกบัญชีสำเร็จ! กรุณาส่งรหัสนี้เข้าแชต LINE OA");
      } else {
        toast.error("ไม่สามารถสร้างรหัสได้");
      }
    } catch (err) {
      console.error(err);
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setIsGeneratingCode(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">ตั้งค่าระบบ</h1>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold text-slate-800 mb-2">เชื่อมต่อ LINE Official Account (Messaging API)</h2>
        <p className="text-slate-500 text-sm mb-6">
          {isOwner 
            ? "ตั้งค่า LINE OA ของหอพัก และผูก LINE User ID ของคุณเพื่อรับแจ้งเตือนผู้เข้าพักหรือรายงานแจ้งซ่อม"
            : "เชื่อมโยงบัญชี LINE ของคุณกับหอพักเพื่อรับแจ้งเตือนบิลค่าเช่าและพัสดุผ่านไลน์อัตโนมัติ"
          }
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          {isOwner && (
            <>
              <div className="space-y-2">
                <Label>LINE Channel Access Token</Label>
                <Input 
                  type="password" 
                  value={lineChannelAccessToken} 
                  onChange={e => setLineChannelAccessToken(e.target.value)} 
                  placeholder="กรอก Channel Access Token ยาวๆ..." 
                  className="w-full rounded-xl bg-slate-50 h-11"
                />
                <p className="text-xs text-slate-400">คัดลอกได้จาก LINE Developers Console (Messaging API tab)</p>
              </div>

              <div className="space-y-2 p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                <div>
                  <Label className="text-slate-800 font-bold block mb-1">LINE Webhook URL</Label>
                  <p className="text-xs text-slate-500 leading-normal">คัดลอก URL นี้ไปใส่ในหน้า LINE Developers Console ของหอพักคุณ และเปิดใช้งาน Webhooks</p>
                </div>
                <div className="flex gap-2">
                  <Input 
                    type="text" 
                    value={webhookUrl} 
                    readOnly 
                    className="flex-1 rounded-xl bg-white h-11 font-mono text-sm border-slate-200 select-all"
                  />
                  <Button 
                    type="button" 
                    onClick={() => {
                      navigator.clipboard.writeText(webhookUrl);
                      toast.success("คัดลอก Webhook URL สำเร็จ");
                    }}
                    variant="outline"
                    className="rounded-xl border-slate-200 h-11 hover:bg-slate-100 text-slate-600 font-semibold"
                  >
                    คัดลอก
                  </Button>
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>LINE User ID ส่วนตัวของท่าน (ขึ้นต้นด้วย U...)</Label>
            <div className="flex gap-3">
              <Input 
                type="text" 
                value={lineUserId} 
                readOnly
                placeholder="ระบบจะระบุโดยอัตโนมัติหลังผูกบัญชีด้วยการส่งรหัส" 
                className="flex-1 rounded-xl bg-slate-100/70 h-11 font-mono cursor-not-allowed text-slate-500"
              />
              {isOwner && (
                <Button 
                  type="button" 
                  onClick={handleTestLine} 
                  disabled={isTestingLine || !lineChannelAccessToken || !lineUserId} 
                  variant="outline" 
                  className="rounded-xl border-slate-200 text-slate-600 shrink-0 h-11 hover:bg-slate-50"
                >
                  {isTestingLine ? "กำลังทดสอบ..." : "ทดสอบส่งข้อความ"}
                </Button>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {isOwner 
                ? "LINE User ID ของผู้ดูแลระบบ สำหรับรับแจ้งซ่อม/แจ้งสอบถามห้องพัก" 
                : "LINE User ID ของลูกบ้าน สำหรับรับแจ้งบิลค่าเช่า/พัสดุ"
              }
            </p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2">
              🔑 ขั้นตอนการผูก LINE User ID อัตโนมัติ
            </h3>
            
            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              {isOwner ? (
                <>
                  <p>1. ตรวจสอบให้แน่ใจว่าได้คลิก <b>"บันทึกข้อมูล"</b> รหัส Token และนำ Webhook URL ด้านบนไปตั้งค่าใน LINE Console เรียบร้อยแล้ว</p>
                  <p>2. เพิ่มเพื่อน LINE Official Account (LINE OA) ของหอพักคุณ</p>
                </>
              ) : (
                <>
                  <p>1. ค้นหาและเพิ่มเพื่อน LINE Official Account (LINE OA) ของหอพักคุณ (สามารถสอบถามคิวอาร์โค้ดได้จากเจ้าของหอพัก)</p>
                </>
              )}
              <p>2. กดปุ่มสร้างรหัสผูกบัญชีด้านล่างนี้</p>
              <p>3. พิมพ์รหัสที่ได้ ส่งเข้าไปในช่องแชตของ LINE OA ทันที ระบบจะเชื่อมต่อและบันทึกข้อมูลให้อัตโนมัติ!</p>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <Button
                type="button"
                onClick={handleGenerateCode}
                disabled={isGeneratingCode || (isOwner && !lineChannelAccessToken)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 font-bold shadow-sm"
              >
                {isGeneratingCode ? "กำลังสร้าง..." : lineBindingCode ? "🔄 สร้างรหัสใหม่" : "✨ สร้างรหัสผูกบัญชี"}
              </Button>

              {lineBindingCode && (
                <div className="bg-white px-4 py-2 rounded-xl border border-indigo-200 flex items-center gap-3">
                  <span className="text-xs text-slate-400 font-semibold">รหัสของคุณ:</span>
                  <span className="text-lg font-black text-indigo-700 font-mono tracking-wider">{lineBindingCode}</span>
                  <Button 
                    type="button" 
                    onClick={() => {
                      navigator.clipboard.writeText(lineBindingCode);
                      toast.success("คัดลอกรหัสผูกบัญชีสำเร็จ");
                    }}
                    variant="ghost"
                    className="p-1 h-auto text-slate-400 hover:text-slate-600"
                  >
                    คัดลอก
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          <Button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white w-full rounded-full mt-4 h-11 font-bold">
            {isSaving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
          </Button>
        </form>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold text-slate-800 mb-2">เปลี่ยนรหัสผ่าน</h2>
        <p className="text-slate-500 text-sm mb-6">
          ตั้งรหัสผ่านใหม่สำหรับการเข้าสู่ระบบครั้งต่อไป
        </p>

        <form onSubmit={async (e) => {
          e.preventDefault();
          const target = e.target as typeof e.target & {
            password: { value: string };
            confirmPassword: { value: string };
          };
          const password = target.password.value;
          if (password !== target.confirmPassword.value) {
            toast.error("รหัสผ่านไม่ตรงกัน!");
            return;
          }
          setIsSaving(true);
          const res = await fetch("/api/users/me", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password }),
          });
          if (res.ok) {
            toast.success("เปลี่ยนรหัสผ่านสำเร็จ!");
            target.password.value = "";
            target.confirmPassword.value = "";
          } else {
            toast.error("เกิดข้อผิดพลาด");
          }
          setIsSaving(false);
        }} className="space-y-4">
          <div className="space-y-2">
            <Label>รหัสผ่านใหม่</Label>
            <Input type="password" name="password" required className="rounded-xl bg-slate-50" />
          </div>
          <div className="space-y-2">
            <Label>ยืนยันรหัสผ่านใหม่</Label>
            <Input type="password" name="confirmPassword" required className="rounded-xl bg-slate-50" />
          </div>
          
          <Button type="submit" disabled={isSaving} className="bg-slate-800 hover:bg-slate-900 text-white rounded-full mt-4">
            {isSaving ? "กำลังบันทึก..." : "อัปเดตรหัสผ่าน"}
          </Button>
        </form>
      </div>
    </div>
  );
}
