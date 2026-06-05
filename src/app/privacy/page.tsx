import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-100 p-8 md:p-12 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">นโยบายการคุ้มครองข้อมูลส่วนบุคคล (Privacy Policy)</h1>
          <p className="text-slate-500 mt-2">สำหรับผู้เช่า (Apartment OS)</p>
        </div>
        
        <div className="space-y-6 text-slate-700 leading-relaxed">
          <p>
            เพื่อให้การใช้งานระบบ Apartment OS เป็นไปอย่างสมบูรณ์และปลอดภัย ทางเราจำเป็นต้องเก็บรวบรวมและประมวลผลข้อมูลส่วนบุคคลของคุณ ดังนี้:
          </p>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">1. ข้อมูลที่เรารวบรวม:</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>ข้อมูลยืนยันตัวตน:</strong> ข้อมูลโปรไฟล์จาก LINE (LINE User ID, ชื่อแสดงผล, รูปโปรไฟล์) และ เบอร์โทรศัพท์</li>
              <li><strong>ข้อมูลการเช่า:</strong> หมายเลขห้องพักและข้อมูลที่เกี่ยวข้องกับสัญญาเช่าที่เจ้าของหอพักระบุไว้</li>
              <li><strong>ข้อมูลการทำธุรกรรม:</strong> รูปภาพหลักฐานการโอนเงิน (สลิปธนาคาร) และประวัติการชำระเงิน</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">2. วัตถุประสงค์ในการใช้งาน:</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>เพื่อยืนยันตัวตนและผูกบัญชีของคุณเข้ากับห้องพักที่ถูกต้อง</li>
              <li>เพื่อส่งการแจ้งเตือนบิลค่าเช่าและสถานะการชำระเงินผ่านแอปพลิเคชัน LINE</li>
              <li>เพื่อเป็นระบบตัวกลางในการส่งมอบหลักฐานการชำระเงินของคุณให้กับ &quot;เจ้าของหอพัก/นิติบุคคล&quot; โดยตรง</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">3. การเปิดเผยข้อมูล:</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>ข้อมูลของคุณจะถูกเข้าถึงได้โดย <strong>&quot;เจ้าของหอพักหรือผู้ดูแลระบบของอาคารที่คุณพักอาศัยอยู่เท่านั้น&quot;</strong></li>
              <li>Apartment OS ในฐานะผู้ให้บริการซอฟต์แวร์ จะไม่นำข้อมูลของคุณไปขายต่อ หรือส่งมอบให้บุคคลที่สามเพื่อการโฆษณาเด็ดขาด</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">4. ความปลอดภัยของข้อมูล:</h2>
            <p>
              ภาพสลิปโอนเงินของคุณจะถูกจัดเก็บในระบบคลาวด์แบบปิด (Private Storage) ที่มีการเข้ารหัส ไม่สามารถเข้าถึงได้ผ่านอินเทอร์เน็ตสาธารณะ
            </p>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-100">
          <Link href="/">
            <Button variant="outline" className="rounded-xl h-12 px-6 font-semibold border-slate-200">กลับหน้าหลัก</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
