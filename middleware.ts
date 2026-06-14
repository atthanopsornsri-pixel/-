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

    // 4. Unregistered TENANT — LINE login without invite code → redirect to registration
    // ต้องยกเว้น /register เพื่อกัน infinite redirect loop
    if (
      role === "TENANT" &&
      req.nextauth.token?.isBound === false &&
      !path.startsWith("/register") &&
      !path.startsWith("/login")
    ) {
      return NextResponse.redirect(new URL("/register/tenant", req.url));
    }

    return passThrough;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        // Public routes — ผ่านได้เสมอ ไม่ต้องมี token
        if (
          path.startsWith("/register") ||
          path.startsWith("/login") ||
          path.startsWith("/api/auth") ||
          path.startsWith("/pay") ||
          path.startsWith("/p/") ||
          path === "/pricing" ||
          path === "/privacy" ||
          path === "/terms"
        ) {
          return true;
        }
        // Protected routes — ต้องมี token
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/admin/:path*",
    "/owner/:path*",
    "/tenant/:path*",
    "/dashboard/:path*",
    "/register/:path*", // เพิ่มเพื่อให้ authorized callback รู้จัก path นี้
  ],
};
