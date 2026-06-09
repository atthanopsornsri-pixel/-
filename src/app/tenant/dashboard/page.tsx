import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSecurePrisma } from "@/lib/prisma-secure";
import { TenantPaymentForm } from "@/components/TenantPaymentForm";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";

export default async function TenantDashboardPage() {
  const session = await getServerSession(authOptions);

  // If not logged in, or not a tenant, redirect
  if (!session || session.user.role !== "TENANT") {
    redirect("/login");
  }

  // If tenant is not bound, redirect to bind
  if (!session.user.isBound) {
    redirect("/tenant/bind");
  }

  const secureDb = await getSecurePrisma();

  // ดึงข้อมูล tenant เพื่อเช็ค profileCompleted
  const { prisma } = await import("@/lib/prisma");
  const tenantProfile = await prisma.tenant.findUnique({
    where: { userId: session.user.id },
    select: { profileCompleted: true, firstName: true },
  });

  // Fetch the latest bill for this tenant's room
  // Thanks to getSecurePrisma, it implicitly filters to ONLY this tenant's room!
  const latestBill = await secureDb.bill.findFirst({
    orderBy: { createdAt: "desc" }, // Get the most recent bill
    include: {
      room: { select: { number: true, property: { select: { name: true } } } }
    }
  });

  const formatTHB = (amount: number) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);
  };

  const getMonthName = (month: number) => {
    const months = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    return months[month - 1];
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 pt-8 animate-in fade-in duration-500">
      {/* Banner: กรอกข้อมูลก่อน (ถ้ายังไม่ครบ) */}
      {!tenantProfile?.profileCompleted && (
        <div className="max-w-md w-full mb-4">
          <Link href="/register/tenant/profile" className="block">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="font-bold text-amber-800 text-sm">กรอกข้อมูลให้ครบก่อนนะ</p>
                <p className="text-amber-700 text-xs mt-0.5">ต้องใช้ชื่อจริงและเลขบัตรประชาชนเพื่อออกสัญญาเช่า</p>
                <p className="text-amber-600 text-xs font-semibold mt-1">กดที่นี่เพื่อกรอกข้อมูล →</p>
              </div>
            </div>
          </Link>
        </div>
      )}

      <div className="max-w-md w-full bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-6 md:p-8">

        {/* Header section */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-extrabold text-slate-800">
            {latestBill ? `ห้อง ${latestBill.room.number}` : "ข้อมูลห้องพัก"}
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            {latestBill?.room.property.name || "ระบบผู้เช่า"}
          </p>
        </div>

        {!latestBill ? (
          <div className="text-center p-8 bg-slate-100 rounded-2xl">
            <p className="text-slate-500 font-medium">ยังไม่มีบิลค่าเช่าในระบบ</p>
          </div>
        ) : (
          <>
            {/* Bill Info Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6">
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200">
                <span className="text-slate-500 font-semibold">
                  {latestBill.type === "CHECKIN" ? "ประเภทบิล" : "ประจำเดือน"}
                </span>
                <span className="font-bold text-slate-800">
                  {latestBill.type === "CHECKIN"
                    ? "🔑 บิลค่าเข้าอยู่"
                    : `${getMonthName(latestBill.month)} ${latestBill.year + 543}`}
                </span>
              </div>

              {latestBill.type === "CHECKIN" ? (
                /* ── บิลเข้าอยู่ ── */
                <div className="space-y-3 text-sm">
                  {latestBill.securityDeposit > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">เงินประกันห้อง <span className="text-xs text-emerald-600">(คืนตอนย้ายออก)</span></span>
                      <span className="font-semibold text-slate-700">{formatTHB(latestBill.securityDeposit)}</span>
                    </div>
                  )}
                  {latestBill.advanceRent > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">ค่าเช่าล่วงหน้า</span>
                      <span className="font-semibold text-slate-700">{formatTHB(latestBill.advanceRent)}</span>
                    </div>
                  )}
                  {latestBill.keyDeposit > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">ค่ามัดจำกุญแจ / คีย์การ์ด</span>
                      <span className="font-semibold text-slate-700">{formatTHB(latestBill.keyDeposit)}</span>
                    </div>
                  )}
                  {latestBill.vehicleFee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">ค่าลงทะเบียน / ที่จอดรถ</span>
                      <span className="font-semibold text-slate-700">{formatTHB(latestBill.vehicleFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-end mt-4 pt-4 border-t border-slate-200">
                    <span className="text-slate-800 font-bold">ยอดสุทธิ</span>
                    <span className="text-3xl font-black text-rose-600">{formatTHB(latestBill.totalAmount)}</span>
                  </div>
                </div>
              ) : (
                /* ── บิลรายเดือน ── */
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">ค่าเช่า</span>
                    <span className="font-semibold text-slate-700">{formatTHB(latestBill.rentAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">ค่าน้ำ ({latestBill.waterUnits || 0} หน่วย)</span>
                    <span className="font-semibold text-slate-700">{formatTHB(latestBill.waterAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">ค่าไฟ ({latestBill.electricUnits || 0} หน่วย)</span>
                    <span className="font-semibold text-slate-700">{formatTHB(latestBill.electricAmount)}</span>
                  </div>
                  {(latestBill.commonFee > 0) && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">ค่าส่วนกลาง</span>
                      <span className="font-semibold text-slate-700">{formatTHB(latestBill.commonFee)}</span>
                    </div>
                  )}
                  {/* Total */}
                  <div className="flex justify-between items-end mt-4 pt-4 border-t border-slate-200">
                    <span className="text-slate-800 font-bold">ยอดสุทธิ</span>
                    <span className="text-3xl font-black text-rose-600">{formatTHB(latestBill.totalAmount)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Status section */}
            {latestBill.status === "UNPAID" && (
              <div className="animate-in slide-in-from-bottom-4">
                <div className="flex items-center gap-2 text-rose-600 mb-2">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-bold text-sm">รอการชำระเงิน</span>
                </div>
                <TenantPaymentForm billId={latestBill.id} />
              </div>
            )}

            {latestBill.status === "PENDING" && (
              <div className="bg-sky-50 border border-sky-200 text-sky-700 p-6 rounded-2xl flex flex-col items-center text-center animate-in zoom-in-95">
                <Clock className="w-12 h-12 mb-3 text-sky-500" />
                <h3 className="text-lg font-bold mb-1">ส่งสลิปเรียบร้อย</h3>
                <p className="text-sm font-medium opacity-80">กำลังรอเจ้าของหอพักตรวจสอบยอดเงิน</p>
              </div>
            )}

            {latestBill.status === "PAID" && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-6 rounded-2xl flex flex-col items-center text-center animate-in zoom-in-95">
                <CheckCircle2 className="w-12 h-12 mb-3 text-emerald-500" />
                <h3 className="text-lg font-bold mb-1">ชำระเงินเสร็จสิ้น</h3>
                <p className="text-sm font-medium opacity-80">ขอบคุณที่ชำระค่าบริการตรงเวลา</p>
              </div>
            )}
            
            {latestBill.status === "OVERDUE" && (
              <div className="animate-in slide-in-from-bottom-4">
                <div className="flex items-center gap-2 text-rose-600 mb-2">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-bold text-sm">เกินกำหนดชำระ</span>
                </div>
                <TenantPaymentForm billId={latestBill.id} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
