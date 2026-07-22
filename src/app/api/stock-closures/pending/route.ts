import { NextRequest } from "next/server";

import { corsOptionsResponse, corsResponse } from "@/lib/cors";
import { requireAuth } from "@/lib/api-auth";
import { getAllPendingUnsold } from "@/lib/stock-closure";

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["admin"]);
  if (auth.error) return auth.error;

  try {
    const pending = await getAllPendingUnsold();
    return corsResponse({ pending });
  } catch (error) {
    console.error("GET /api/stock-closures/pending failed:", error);
    return corsResponse({ error: "Failed to load pending unsold stock" }, 500);
  }
}
