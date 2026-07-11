import { NextRequest } from "next/server";

import {
  getAppDownloadAdminSettings,
  updateAppDownloadSettings,
} from "@/lib/app-download";
import { requireAuth } from "@/lib/api-auth";
import { corsOptionsResponse, corsResponse } from "@/lib/cors";

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["admin"]);
  if (auth.error || !auth.session) return auth.error;

  try {
    const settings = await getAppDownloadAdminSettings();
    const origin = new URL(request.url).origin;

    return corsResponse({
      settings: {
        ...settings,
        shareUrl: `${origin}/download-app`,
      },
    });
  } catch (error) {
    console.error("GET /api/settings/app-download failed:", error);
    return corsResponse({ error: "Failed to load app download settings" }, 500);
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request, ["admin"]);
  if (auth.error || !auth.session) return auth.error;

  try {
    const body = await request.json();
    const username =
      typeof body.username === "string" ? body.username.trim() : "";
    const password =
      typeof body.password === "string" ? body.password : undefined;
    const downloadUrl =
      typeof body.downloadUrl === "string" ? body.downloadUrl.trim() : "";

    const settings = await updateAppDownloadSettings({
      username,
      password,
      downloadUrl,
    });

    const origin = new URL(request.url).origin;

    return corsResponse({
      settings: {
        ...settings,
        shareUrl: `${origin}/download-app`,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update app download settings";
    console.error("PATCH /api/settings/app-download failed:", error);
    return corsResponse({ error: message }, 400);
  }
}
