import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSecurePrisma } from "@/lib/prisma-secure";
import { ImportClientComponent } from "./ImportClientComponent";

export default async function ImportSettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "OWNER" && session.user.role !== "ADMIN")) {
    redirect("/dashboard");
  }

  const secureDb = await getSecurePrisma();

  // Fetch the properties owned by this user
  const properties = await secureDb.property.findMany({
    orderBy: { createdAt: "asc" }
  });

  if (properties.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        คุณยังไม่ได้สร้างหอพัก กรุณาสร้างหอพักก่อนนำเข้าข้อมูล
      </div>
    );
  }

  // Pass the first property ID by default, or let the client select
  const defaultPropertyId = properties[0].id;

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">นำเข้าข้อมูลหอพัก (Bulk Import)</h1>
        <p className="text-slate-500 mt-2 font-medium">
          อัปโหลดไฟล์ Excel/CSV เพื่อดึงรายชื่อห้องและผู้เช่าเข้าระบบอัตโนมัติ ไม่ต้องคีย์มือทีละห้อง
        </p>
      </div>

      <ImportClientComponent propertyId={defaultPropertyId} />
    </div>
  );
}
