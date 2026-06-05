import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSecurePrisma } from "@/lib/prisma-secure";
import { ApprovalCards, ApprovalBill } from "@/components/ApprovalCards";
import { createClient } from "@supabase/supabase-js";

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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; 
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const initialBills: ApprovalBill[] = await Promise.all(
    pendingBills.map(async (bill) => {
      let signedSlipUrl = "";

      if (bill.slipUrl) {
        // Assume slipUrl in DB might be the full path e.g. "documents/slips/xxx.jpg"
        // We need to parse out bucket and path if they are combined.
        // For Phase 3, we used "documents" as default bucket.
        const bucket = "documents"; 
        // In case slipUrl has full path like https://..., we only need the relative path.
        // Assuming slipUrl stored in DB is the relative path "slips/xxx.jpg"
        const { data } = await supabase.storage
          .from(bucket)
          .createSignedUrl(bill.slipUrl, 60); // 60 seconds validity for maximum security
        
        if (data?.signedUrl) {
          signedSlipUrl = data.signedUrl;
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
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
          ตรวจสลิปโอนเงิน
          {initialBills.length > 0 && (
            <span className="bg-amber-100 text-amber-700 text-sm font-bold px-3 py-1 rounded-full">
              {initialBills.length} รายการ
            </span>
          )}
        </h1>
        <p className="text-slate-500 mt-2 font-medium">
          ระบบตรวจสอบสลิปโอนเงินความเร็วสูง อนุมัติทันใจในคลิกเดียว (รูประบบ Signed URL ปลอดภัย 100%)
        </p>
      </div>

      {/* Interactive Client Component */}
      <ApprovalCards initialBills={initialBills} />
      
    </div>
  );
}
