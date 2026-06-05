import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white text-slate-800 p-8 md:p-16">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold">เงื่อนไขการให้บริการ (Terms of Service)</h1>
        <p className="text-slate-500">อัปเดตล่าสุด: มิถุนายน 2026</p>
        
        <div className="space-y-4 text-slate-700 leading-relaxed">
          <p>
            ข้อตกลงและเงื่อนไขการใช้บริการนี้ เป็นข้อผูกพันทางกฎหมายระหว่างผู้ใช้บริการและระบบ Apartment OS 
            การเข้าใช้บริการระบบถือว่าท่านยอมรับข้อตกลงนี้โดยสมบูรณ์
          </p>
          <h2 className="text-xl font-semibold mt-6">1. การให้บริการ</h2>
          <p>
            ระบบทำหน้าที่เป็นแพลตฟอร์มในการบริหารจัดการหอพักและข้อมูลลูกบ้าน 
            เราไม่ได้มีส่วนร่วมในข้อพิพาทระหว่างเจ้าของหอพักและผู้เช่า
          </p>
          <h2 className="text-xl font-semibold mt-6">2. ความรับผิดชอบของผู้ใช้</h2>
          <p>
            ท่านตระหนักดีว่าข้อมูลที่ท่านป้อนเข้าสู่ระบบจะต้องเป็นความจริง 
            และไม่ละเมิดสิทธิของบุคคลที่สาม หรือฝ่าฝืนกฎหมายใดๆ
          </p>
          <h2 className="text-xl font-semibold mt-6">3. การยกเลิกและคืนเงิน</h2>
          <p>
            ค่าบริการระบบ (SaaS) แบบรายเดือนและรายปี ไม่สามารถขอคืนเงินได้เว้นแต่จะมีกรณีขัดข้องที่เกิดจากฝั่งระบบของเราโดยตรง
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
