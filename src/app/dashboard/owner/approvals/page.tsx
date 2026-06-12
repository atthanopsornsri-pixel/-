import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSecurePrisma } from "@/lib/prisma-secure";
import { ApprovalCards, ApprovalBill } from "@/components/ApprovalCards";
import { createClient } from "@supabase/supabase-js";
import { ClipboardCheck } from "lucide-react";

/**
 * ตรวจสอบว่า slipUrl เป็น URL ที่ใช้ตรง ๆ ได้เลย (base64 / http)
 * หรือต้องส่งต่อให้ Supabase สร้าง Signed URL ก่อน (Supabase Storage path)
 */
function resolveSlipUrl(raw: string): "inline" | "storage" {
  if (raw.startsWith("data:") || raw.startsWith("http://") || raw.startsWith("https://")) {
    return "inline";
  }
  return "storage";
}

export default async function ApprovalsDashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || (session.user.role !== "OWNER" && session.user.role !== "ADMIN")) {
    redirect("/dashboard");
  }

  const secureDb = await getSecurePrisma();

  // 1. Fetch all PENDING bills (waiting for approval)
  // Thanks to getSecurePrisma, it ONLY fetches bills belonging to this owner!
  const pendingBills = await secureDb.bill.findMany({
    where: {
      status: "PENDING",
    },
    include: {
      room: { select: { number: true } }
    },
    orderBy: {
      updatedAt: "asc" // Oldest slips first
    }
  });

  // 2. Secure Images: Generate Signed URLs directly in the Server Component
  // สร้าง client แบบป้องกัน — ถ้า env หายหรือสร้างไม่ได้ จะไม่ทำให้ทั้งหน้าพัง
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let supabase: ReturnType<typeof createClient> | null = null;
  if (supabaseUrl && supabaseServiceKey) {
    try {
      supabase = createClient(supabaseUrl, supabaseServiceKey);
    } catch (e) {
      console.error("[APPROVALS] supabase client init failed:", e);
    }
  }

  const initialBills: ApprovalBill[] = await Promise.all(
    pendingBills.map(async (bill) => {
      let signedSlipUrl = "";

      if (bill.slipUrl) {
        const urlType = resolveSlipUrl(bill.slipUrl);

        if (urlType === "inline") {
          // base64 Data URL หรือ HTTPS URL ใช้ตรง ๆ ได้เลย
          signedSlipUrl = bill.slipUrl;
        } else if (supabase) {
          // Supabase Storage path → ต้องสร้าง Signed URL ก่อน
          try {
            const { data } = await supabase.storage
              .from("documents")
              .createSignedUrl(bill.slipUrl, 300); // 5 minutes validity
            if (data?.signedUrl) {
              signedSlipUrl = data.signedUrl;
            }
          } catch {
            // ไม่แสดง error — ปล่อยให้ signedSlipUrl เป็น "" แล้ว UI จะแสดง placeholder
          }
        }
      }

      return {
        id: bill.id,
        roomNumber: bill.room.number,
        totalAmount: bill.totalAmount,
        signedSlipUrl,
        month: bill.month,
        year: bill.year
      };
    })
  );

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      
      {/* Page Header */}
      <div className="mb-8 flex items-center gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--jh-radius-md)]"
          style={{ background: "#d4a548", color: "#fff", boxShadow: "0 10px 22px -8px #d4a548" }}
        >
          <ClipboardCheck className="h-[22px] w-[22px]" strokeWidth={2} />
        </div>
        <div>
        <h1 className="text-2xl md:text-[28px] font-bold text-[var(--jh-ink)] tracking-[-0.02em] flex items-center gap-3">
          ตรวจสลิปโอนเงิน
          {initialBills.length > 0 && (
            <span className="bg-amber-100 text-amber-700 text-sm font-bold px-3 py-1 rounded-full">
              {initialBills.length} รายการ
            </span>
          )}
        </h1>
        <p className="text-slate-500 mt-0.5 font-medium">
          ระบบตรวจสอบสลิปโอนเงินความเร็วสูง อนุมัติทันใจในคลิกเดียว (รูประบบ Signed URL ปลอดภัย 100%)
        </p>
        </div>
      </div>

      {/* Interactive Client Component */}
      <ApprovalCards initialBills={initialBills} />
      
    </div>
  );
}
