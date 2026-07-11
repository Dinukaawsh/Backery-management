import { NextRequest } from "next/server";

import { getAppDownloadPublicInfo } from "@/lib/app-download";
import { corsOptionsResponse, corsResponse } from "@/lib/cors";

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function GET() {
  try {
    const info = await getAppDownloadPublicInfo();
    return corsResponse({ info });
  } catch (error) {
    console.error("GET /api/app-download/info failed:", error);
    return corsResponse({ error: "Failed to load download info" }, 500);
  }
}
