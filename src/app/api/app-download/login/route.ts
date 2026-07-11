import { NextRequest } from "next/server";

import {
  createAppDownloadToken,
  getAppDownloadCookieOptions,
  verifyAppDownloadLogin,
} from "@/lib/app-download";
import { corsOptionsResponse, corsResponse } from "@/lib/cors";

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username =
      typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!username || !password) {
      return corsResponse({ error: "Username and password are required" }, 400);
    }

    const valid = await verifyAppDownloadLogin(username, password);
    if (!valid) {
      return corsResponse({ error: "Invalid username or password" }, 401);
    }

    const token = await createAppDownloadToken();
    const response = corsResponse({ ok: true });
    response.cookies.set(getAppDownloadCookieOptions(token));
    return response;
  } catch (error) {
    console.error("POST /api/app-download/login failed:", error);
    return corsResponse({ error: "Login failed" }, 500);
  }
}
