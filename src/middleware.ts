import { NextRequest, NextResponse } from "next/server";

import { verifyToken } from "@/lib/auth";
import { FEATURE_ROUTE_GATES, features } from "@/lib/features";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const publicPaths = [
  "/login",
  "/download-app",
  "/api/auth/login",
  "/api/health",
  "/api/app-download",
  "/api/settings/business",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api")) {
    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: corsHeaders });
    }

    const response = NextResponse.next();
    for (const [key, value] of Object.entries(corsHeaders)) {
      response.headers.set(key, value);
    }
    return response;
  }

  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const token = request.cookies.get("bakery_token")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const session = await verifyToken(token);
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (session.role !== "admin") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  for (const gate of FEATURE_ROUTE_GATES) {
    if (
      (pathname === gate.prefix || pathname.startsWith(`${gate.prefix}/`)) &&
      !features[gate.enabled]
    ) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
