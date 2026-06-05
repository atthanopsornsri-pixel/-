import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-slate-800 p-8 md:p-16">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold">นโยบายความเป็นส่วนตัว (Privacy Policy)</h1>
        <p className="text-slate-500">ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล (PDPA)</p>
        
        <div className="space-y-4 text-slate-700 leading-relaxed">
          <h2 className="text-xl font-semibold mt-6">1. ข้อมูลที่เราเก็บรวบรวม</h2>
          <p>
            เราเก็บรวบรวมข้อมูลส่วนบุคคลที่จำเป็นสำหรับการให้บริการ เช่น ชื่อ-นามสกุล, เบอร์โทรศัพท์, อีเมล, 
            ข้อมูลบัญชี LINE, และสลิปโอนเงิน (หากมีการอัปโหลด)
          </p>
          <h2 className="text-xl font-semibold mt-6">2. วัตถุประสงค์ในการเก็บข้อมูล</h2>
          <p>
            เราใช้ข้อมูลของท่านเพื่อการยืนยันตัวตน, แจ้งเตือนยอดชำระเงิน, ออกใบเสร็จ, 
            และอำนวยความสะดวกในการติดต่อสื่อสารกับเจ้าของหอพักเท่านั้น
          </p>
          <h2 className="text-xl font-semibold mt-6">3. การรักษาความปลอดภัย</h2>
          <p>
            ข้อมูลทั้งหมดจะถูกเข้ารหัสและจัดเก็บในระบบคลาวด์ที่มีมาตรฐานความปลอดภัยระดับสูง 
            และเราจะไม่นำข้อมูลของท่านไปขายหรือเปิดเผยให้บุคคลที่สามโดยเด็ดขาด
          </p>
          <h2 className="text-xl font-semibold mt-6">4. สิทธิของเจ้าของข้อมูล</h2>
          <p>
            ท่านมีสิทธิขอเข้าถึง แก้ไข ลบข้อมูล หรือยกเลิกความยินยอมในการประมวลผลข้อมูลส่วนบุคคลของท่าน 
            ตามที่ระบุในกฎหมาย PDPA
          </p>
        </div>

        <div className="pt-8">
          <Link href="/">
            <Button variant="outline">กลับหน้าหลัก</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
