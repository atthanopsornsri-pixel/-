"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  const [lineToken, setLineToken] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const res = await fetch("/api/users/me");
      if (res.ok) {
        const data = await res.json();
        setLineToken(data.lineToken || "");
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const res = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineToken }),
    });

    if (res.ok) {
      alert("บันทึกการตั้งค่าสำเร็จ");
    } else {
      alert("เกิดข้อผิดพลาด");
    }
    setIsSaving(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">ตั้งค่าระบบ</h1>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold text-slate-800 mb-2">เชื่อมต่อ LINE Notify</h2>
        <p className="text-slate-500 text-sm mb-6">
          กรอก LINE Notify Token เพื่อรับการแจ้งเตือนพัสดุ แจ้งซ่อม และบิลใหม่ เข้าที่ LINE ของคุณ
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label>LINE Notify Token</Label>
            <Input 
              type="password" 
              value={lineToken} 
              onChange={e => setLineToken(e.target.value)} 
              placeholder="v8xxxxxxxxxxxxxxxxxxxxx" 
            />
            <p className="text-xs text-slate-400 mt-1">สามารถสร้าง Token ได้ที่ <a href="https://notify-bot.line.me/" target="_blank" className="text-blue-500 hover:underline">notify-bot.line.me</a></p>
          </div>
          
          <Button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white w-full rounded-full mt-4">
            {isSaving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
          </Button>
        </form>
      </div>
    </div>
  );
}
