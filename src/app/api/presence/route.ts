import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { users } from "@/db/schema";
import { requireAuth } from "@/lib/api-auth";
import { corsOptionsResponse, corsResponse } from "@/lib/cors";
import { presenceFromLastSeen } from "@/lib/presence";

export async function OPTIONS() {
  return corsOptionsResponse();
}

/** Authenticated heartbeat — marks the current user as recently active. */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error || !auth.session) return auth.error;

  try {
    const now = new Date();
    await getDb()
      .update(users)
      .set({ lastSeenAt: now })
      .where(eq(users.id, auth.session.id));

    const presence = presenceFromLastSeen(now);
    return corsResponse({
      ok: true,
      isOnline: presence.isOnline,
      lastSeenAt: presence.lastSeenAt,
    });
  } catch (error) {
    console.error("POST /api/presence failed:", error);
    return corsResponse({ error: "Failed to update presence" }, 500);
  }
}
