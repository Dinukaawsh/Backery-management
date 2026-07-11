import { NextRequest } from "next/server";

import { requireAuth } from "@/lib/api-auth";
import {
  getBusinessSettings,
  updateBusinessSettings,
} from "@/lib/business-settings";
import { corsOptionsResponse, corsResponse } from "@/lib/cors";

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function GET() {
  try {
    const settings = await getBusinessSettings();
    return corsResponse({ settings });
  } catch (error) {
    console.error("GET /api/settings/business failed:", error);
    return corsResponse({ error: "Failed to load business settings" }, 500);
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request, ["admin"]);
  if (auth.error || !auth.session) return auth.error;

  try {
    const body = await request.json();
    const businessName =
      typeof body.businessName === "string" ? body.businessName : "";
    const address = typeof body.address === "string" ? body.address : "";
    const phone = typeof body.phone === "string" ? body.phone : "";
    const email =
      body.email === null
        ? null
        : typeof body.email === "string"
          ? body.email
          : undefined;
    const ownerName =
      body.ownerName === null
        ? null
        : typeof body.ownerName === "string"
          ? body.ownerName
          : undefined;

    const settings = await updateBusinessSettings({
      businessName,
      address,
      phone,
      email,
      ownerName,
    });

    return corsResponse({ settings });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update business settings";
    console.error("PATCH /api/settings/business failed:", error);
    return corsResponse({ error: message }, 400);
  }
}
