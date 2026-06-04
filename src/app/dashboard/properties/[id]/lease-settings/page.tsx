/* eslint-disable */
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LeaseSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const [property, setProperty] = useState<any>(null);
  const [template, setTemplate] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const defaultTemplate = `ข้อตกลงและเงื่อนไขการเช่าห้องพัก:
1. ผู้เช่าตกลงชำระค่าเช่าล่วงหน้า 1 เดือน และเงินประกันความเสียหาย 1 เดือน ก่อนเข้าพัก
2. ห้ามส่งเสียงดังรบกวนผู้อื่นหลังเวลา 22.00 น.
3. ห้ามเลี้ยงสัตว์ทุกชนิดภายในห้องพักและบริเวณอาคาร
4. หากพบว่ามีการทำลายทรัพย์สินของทางหอพัก ผู้เช่าต้องชดใช้ตามมูลค่าจริง
5. การย้ายออกต้องแจ้งล่วงหน้าอย่างน้อย 30 วัน มิฉะนั้นจะถูกริบเงินประกัน`;

  useEffect(() => {
    fetchProperty();
  }, [params.id]);

  async function fetchProperty() {
    const res = await fetch(`/api/properties/${params.id}`);
    if (res.ok) {
      const data = await res.json();
      setProperty(data);
      setTemplate(data.leaseTemplate || defaultTemplate);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const res = await fetch(`/api/properties/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leaseTemplate: template }),
    });

    if (res.ok) {
      alert("บันทึกเทมเพลตสัญญาเช่าสำเร็จ");
      router.push("/dashboard/properties");
    } else {
      alert("เกิดข้อผิดพลาดในการบันทึก");
    }
    setIsSaving(false);
  };

  if (!property) return <div className="p-8">กำลังโหลด...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">ตั้งค่าฟอร์มสัญญาเช่า (Lease Template)</h1>
        <Button variant="outline" onClick={() => router.back()}>กลับ</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>กำหนดเงื่อนไขสัญญาเช่าสำหรับ {property.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-500">
            ข้อความด้านล่างนี้จะถูกนำไปแทรกใน <b>"สัญญาเช่าอิเล็กทรอนิกส์"</b> ที่จะพิมพ์ออกมาให้ลูกบ้านเซ็น<br/>
            คุณสามารถออกแบบข้อตกลง กฎระเบียบ หรือแก้ไขข้อความได้ตามต้องการ
          </p>
          
          <textarea
            className="w-full min-h-[400px] p-4 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            placeholder="กรอกเงื่อนไขสัญญาเช่าของคุณ..."
          ></textarea>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
              {isSaving ? "กำลังบันทึก..." : "บันทึกเงื่อนไขสัญญา"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
