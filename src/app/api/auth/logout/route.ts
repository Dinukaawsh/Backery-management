import { NextResponse } from "next/server";

import { clearTokenCookie } from "@/lib/auth";
import { corsOptionsResponse, corsResponse } from "@/lib/cors";

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function POST() {
  const response = corsResponse({ ok: true });
  response.cookies.set(clearTokenCookie());
  return response;
}

export async function DELETE() {
  return POST();
}
