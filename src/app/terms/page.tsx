import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-100 p-8 md:p-12 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">ข้อตกลงการให้บริการ (Terms of Service)</h1>
          <p className="text-slate-500 mt-2">อัปเดตล่าสุด: มิถุนายน 2026</p>
        </div>
        
        <div className="space-y-6 text-slate-700 leading-relaxed">
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">1. สถานะของผู้ให้บริการ:</h2>
            <p>
              &quot;Apartment OS&quot; เป็นเพียง <strong>ผู้ให้บริการแพลตฟอร์มซอฟต์แวร์ (Software as a Service)</strong> เพื่ออำนวยความสะดวกในการจัดการบิลและการชำระเงินเท่านั้น เราไม่ใช่คู่สัญญาเช่า ไม่ใช่ตัวแทนรับชำระเงิน และไม่มีส่วนได้ส่วนเสียในค่าเช่าของคุณ
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">2. การปฏิเสธความรับผิด (Limitation of Liability):</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>ทางเราจะไม่รับผิดชอบต่อความผิดพลาดของ &quot;ยอดเงินค่าน้ำ ค่าไฟ หรือค่าเช่า&quot; ที่ปรากฏในระบบ เนื่องจากข้อมูลเหล่านั้นถูกนำเข้าและจัดการโดยเจ้าของหอพัก หากมีข้อโต้แย้งเรื่องยอดเงิน ผู้เช่าต้องติดต่อเจ้าของหอพักโดยตรง</li>
              <li>ทางเราจะไม่รับผิดชอบต่อความเสียหายใดๆ ที่เกิดจากการโอนเงินผิดบัญชี การอัปโหลดสลิปปลอม หรือข้อพิพาททางการเงินระหว่างผู้เช่าและเจ้าของหอพัก</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">3. ความรับผิดชอบของผู้ใช้งาน:</h2>
            <p>
              ผู้ใช้งานตกลงที่จะอัปโหลดเฉพาะภาพหลักฐานการโอนเงินที่ถูกต้องตามกฎหมายเท่านั้น ห้ามอัปโหลดภาพอนาจาร ไวรัสคอมพิวเตอร์ หรือข้อมูลที่ผิดกฎหมายเข้าสู่ระบบโดยเด็ดขาด หากฝ่าฝืน ทางเรามีสิทธิ์ระงับบัญชีการใช้งานและลบข้อมูลทันทีโดยไม่ต้องแจ้งให้ทราบล่วงหน้า
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">4. ความเสถียรของระบบ:</h2>
            <p>
              ทางเราจะพยายามอย่างเต็มที่ในการรักษาระบบให้ทำงานได้ตลอดเวลา แต่อาจมีการหยุดชะงักเพื่อบำรุงรักษา (Maintenance) ทางเราไม่รับประกันความเสียหายทางธุรกิจที่อาจเกิดขึ้นจากการที่ระบบไม่สามารถเข้าถึงได้ชั่วคราว
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
