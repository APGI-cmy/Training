import type { NextRequest } from "next/server";
import { refreshPortalSession } from "@/server/auth/refresh-portal-session";

// Renew APGI authentication only. This does not launch, retain or end an AWS session.
export async function proxy(request: NextRequest) {
  return refreshPortalSession(request);
}

export const config = {
  matcher: [
    "/", "/dashboard/:path*", "/catalogue/:path*", "/profile/:path*",
    "/admin/:path*", "/learn/:path*", "/invitations/:path*",
    "/alp-sign-in/:path*", "/register/:path*", "/api/:path*"
  ]
};
