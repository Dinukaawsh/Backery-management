import { NextRequest } from "next/server";

import { requireAuth } from "@/lib/api-auth";
import { corsOptionsResponse, corsResponse } from "@/lib/cors";
import {
  listNotifications,
  markNotificationsRead,
} from "@/lib/notifications";

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error || !auth.session) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") ?? "1");
    const limit = Number(searchParams.get("limit") ?? "20");

    const result = await listNotifications({
      userId: auth.session.id,
      role: auth.session.role,
      page: Number.isFinite(page) ? page : 1,
      limit: Number.isFinite(limit) ? limit : 20,
    });

    return corsResponse(result);
  } catch (error) {
    console.error("GET /api/notifications failed:", error);
    return corsResponse({ error: "Failed to fetch notifications" }, 500);
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error || !auth.session) return auth.error;

  try {
    const body = await request.json();
    const all = body.all === true;
    const ids = Array.isArray(body.ids)
      ? body.ids
          .map((id: unknown) => Number(id))
          .filter((id: number) => Number.isInteger(id) && id > 0)
      : undefined;

    await markNotificationsRead({
      userId: auth.session.id,
      all,
      ids,
    });

    return corsResponse({ ok: true });
  } catch (error) {
    console.error("PATCH /api/notifications failed:", error);
    return corsResponse({ error: "Failed to update notifications" }, 500);
  }
}
