import { getDashboardMetrics } from "@/app/actions/dashboard";
import { TrendingUp, AlertCircle, Home } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSecurePrisma } from "@/lib/prisma-secure";
import { ExportButton } from "@/components/ExportButton";

export default async function OwnerDashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || (session.user.role !== "OWNER" && session.user.role !== "ADMIN")) {
    redirect("/dashboard"); // Redirect unauthorized users
  }

  const secureDb = await getSecurePrisma();
  const property = await secureDb.property.findFirst();

  const result = await getDashboardMetrics();
  
  // Default values
  let metrics = {
    totalRevenue: 0,
    outstandingDebt: 0,
    occupancyRate: 0,
    occupiedRooms: 0,
    totalRooms: 0,
  };

  if (result.success && result.data) {
    metrics = result.data;
  }

  // Format currency securely
  const formatTHB = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
            ภาพรวมธุรกิจ (Business Overview)
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            สรุปผลประกอบการและสถานะห้องพักประจำเดือนของคุณ
          </p>
        </div>
        {property && (
          <div>
            <ExportButton propertyId={property.id} />
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* 1. Total Revenue Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex items-center gap-4 transition-all hover:shadow-md hover:-translate-y-1">
          <div className="bg-emerald-100 text-emerald-600 p-4 rounded-full flex-shrink-0">
            <TrendingUp size={28} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">รายรับเดือนนี้</p>
            <p className="text-3xl font-black text-slate-800 mt-1">
              {formatTHB(metrics.totalRevenue)}
            </p>
          </div>
        </div>

        {/* 2. Outstanding Debt Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex items-center gap-4 transition-all hover:shadow-md hover:-translate-y-1">
          <div className="bg-rose-100 text-rose-600 p-4 rounded-full flex-shrink-0">
            <AlertCircle size={28} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-sm font-semibold text-rose-700 uppercase tracking-wide">ยอดค้างชำระ</p>
            <p className="text-3xl font-black text-slate-800 mt-1">
              {formatTHB(metrics.outstandingDebt)}
            </p>
          </div>
        </div>

        {/* 3. Occupancy Rate Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex items-center gap-4 transition-all hover:shadow-md hover:-translate-y-1">
          <div className="bg-indigo-100 text-indigo-600 p-4 rounded-full flex-shrink-0">
            <Home size={28} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-sm font-semibold text-indigo-700 uppercase tracking-wide">อัตราการเข้าพัก</p>
            <p className="text-3xl font-black text-slate-800 mt-1">
              {metrics.occupancyRate}%
            </p>
            <p className="text-xs font-medium text-slate-500 mt-1">
              {metrics.occupiedRooms} / {metrics.totalRooms} ห้อง
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
