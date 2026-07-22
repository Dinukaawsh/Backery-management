import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "@/db";
import { users } from "@/db/schema";
import { corsOptionsResponse, corsResponse } from "@/lib/cors";
import { requireAuth } from "@/lib/api-auth";
import {
  driverHasPendingUnsold,
  resetDriverStock,
} from "@/lib/stock-closure";

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ["admin"]);
  if (auth.error || !auth.session) return auth.error;

  try {
    const body = await request.json();
    const deliveryGuyId = Number(body.deliveryGuyId);

    if (!Number.isInteger(deliveryGuyId) || deliveryGuyId <= 0) {
      return corsResponse({ error: "Invalid delivery partner" }, 400);
    }

    const db = getDb();
    const [deliveryGuy] = await db
      .select()
      .from(users)
      .where(eq(users.id, deliveryGuyId))
      .limit(1);

    if (!deliveryGuy || deliveryGuy.role !== "delivery") {
      return corsResponse({ error: "Delivery partner not found" }, 404);
    }

    const hasPending = await driverHasPendingUnsold(deliveryGuyId);
    if (!hasPending) {
      return corsResponse(
        { error: "No unsold stock to reset for this partner" },
        400,
      );
    }

    const result = await resetDriverStock(deliveryGuyId, auth.session.id);

    return corsResponse({
      deliveryGuyId,
      deliveryGuyName: deliveryGuy.name,
      ...result,
    });
  } catch (error) {
    console.error("POST /api/stock-closures failed:", error);
    return corsResponse({ error: "Failed to reset unsold stock" }, 500);
  }
}
