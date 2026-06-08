import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role;
    const path = req.nextUrl.pathname;

    // Shared: inject pathname header สำหรับ Server Components
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-pathname", path);
    const passThrough = NextResponse.next({
      request: { headers: requestHeaders },
    });

    // ✅ Fix #2 & #5 — ADMIN bypass ผ่านได้ทุก route ไม่ต้องเช็คต่อ
    if (role === "ADMIN") {
      return passThrough;
    }

    // 1. Admin Routes — ต้องเป็น ADMIN เท่านั้น
    if (
      path.startsWith("/admin") ||
      path.startsWith("/dashboard/admin")
    ) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
      // ถึงบรรทัดนี้ได้ แปลว่า role ไม่ใช่ ADMIN แน่นอน (bypass ด้านบนกรองออกไปแล้ว)
    }

    // 2. Owner Routes
    const ownerRoutes = [
      "/owner",
      "/dashboard/properties",
      "/dashboard/rooms",
      "/dashboard/settings",
      "/dashboard/tenants",
      "/dashboard/billing",
      "/dashboard/saas-billing",
      "/dashboard/meters", // ✅ Fix #1 — เพิ่มแล้ว
    ];

    if (ownerRoutes.some((r) => path.startsWith(r))) {
      if (role !== "OWNER") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    // 3. Tenant Routes
    const tenantRoutes = [
      "/tenant",
      "/dashboard/my-contract",
      "/dashboard/my-bills",
    ];

    if (tenantRoutes.some((r) => path.startsWith(r))) {
      if (role !== "TENANT") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    return passThrough;
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/admin/:path*",
    "/owner/:path*",
    "/tenant/:path*",
    "/dashboard/:path*",
  ],
};
