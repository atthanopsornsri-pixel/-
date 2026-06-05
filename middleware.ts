import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role;
    const path = req.nextUrl.pathname;

    // 1. Admin Routes
    if (path.startsWith("/admin") || path.startsWith("/dashboard/admin")) {
      if (role !== "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    // 2. Owner Routes
    // Including both the requested /owner path and the actual dashboard sub-paths
    const ownerRoutes = [
      "/owner", 
      "/dashboard/properties", 
      "/dashboard/rooms", 
      "/dashboard/settings", 
      "/dashboard/tenants", 
      "/dashboard/billing", 
      "/dashboard/saas-billing"
    ];
    
    const isOwnerRoute = ownerRoutes.some(r => path.startsWith(r));
    
    if (isOwnerRoute) {
      if (role !== "OWNER") {
        // Redirect unauthorized users (like TENANT) to their dashboard
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    // 3. Tenant Routes
    // Including both the requested /tenant path and the actual dashboard sub-paths
    const tenantRoutes = [
      "/tenant", 
      "/dashboard/my-contract", 
      "/dashboard/my-bills"
    ];

    const isTenantRoute = tenantRoutes.some(r => path.startsWith(r));

    if (isTenantRoute) {
      if (role !== "TENANT") {
        // Redirect unauthorized users (like OWNER) to their dashboard
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

// Protect all routes under /admin, /owner, /tenant, and /dashboard
export const config = {
  matcher: [
    "/admin/:path*", 
    "/owner/:path*", 
    "/tenant/:path*", 
    "/dashboard/:path*"
  ]
};
