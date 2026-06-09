import { redirect } from "next/navigation";

/**
 * Legacy tenant dashboard — ย้ายไปที่ /dashboard/my-bills แล้ว
 * Page นี้เก็บไว้เพื่อกันลิงก์เก่าพัง
 */
export default function TenantDashboardLegacyPage() {
  redirect("/dashboard/my-bills");
}
