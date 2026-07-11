import { NextRequest, NextResponse } from "next/server";

import {
  getAppDownloadCookieName,
  getConfiguredApkDownloadUrl,
  verifyAppDownloadToken,
} from "@/lib/app-download";
import { corsOptionsResponse, corsResponse } from "@/lib/cors";

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(getAppDownloadCookieName())?.value;
    if (!token || !(await verifyAppDownloadToken(token))) {
      return corsResponse({ error: "Download access expired. Sign in again." }, 401);
    }

    const downloadUrl = await getConfiguredApkDownloadUrl();
    if (!downloadUrl) {
      return corsResponse({ error: "APK download is not configured" }, 503);
    }

    return NextResponse.redirect(downloadUrl);
  } catch (error) {
    console.error("GET /api/app-download/apk failed:", error);
    return corsResponse({ error: "Download failed" }, 500);
  }
}
