import { redirect } from "next/navigation";

/**
 * /dashboard/admin — redirect ไปหน้า owners โดยอัตโนมัติ
 * (admin ไม่มี root landing page — sub-routes ทำหน้าที่แทน)
 */
export default function AdminIndexPage() {
  redirect("/dashboard/admin/owners");
}
