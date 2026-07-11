import { count, eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "@/db";
import { sales, shops } from "@/db/schema";
import { requireAuth } from "@/lib/api-auth";
import { corsOptionsResponse, corsResponse } from "@/lib/cors";
import { validateShopInput } from "@/lib/validators";

type RouteContext = { params: Promise<{ id: string }> };

function parseId(id: string) {
  const shopId = Number(id);
  if (!Number.isInteger(shopId) || shopId <= 0) return null;
  return shopId;
}

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request, ["admin"]);
  if (auth.error) return auth.error;

  try {
    const { id } = await context.params;
    const shopId = parseId(id);
    if (!shopId) return corsResponse({ error: "Invalid shop id" }, 400);

    const body = await request.json();
    const updates: Partial<{
      name: string;
      ownerName: string;
      address: string;
      phone: string | null;
      isActive: boolean;
    }> = {};

    const validated = validateShopInput(body);
    if (validated) {
      Object.assign(updates, validated);
    }

    if (typeof body.isActive === "boolean") {
      updates.isActive = body.isActive;
    }

    if (Object.keys(updates).length === 0) {
      return corsResponse({ error: "No changes provided" }, 400);
    }

    const [shop] = await getDb()
      .update(shops)
      .set(updates)
      .where(eq(shops.id, shopId))
      .returning();

    if (!shop) return corsResponse({ error: "Shop not found" }, 404);
    return corsResponse({ shop });
  } catch (error) {
    console.error("PUT /api/shops/[id] failed:", error);
    return corsResponse({ error: "Failed to update shop" }, 500);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request, ["admin"]);
  if (auth.error) return auth.error;

  try {
    const { id } = await context.params;
    const shopId = parseId(id);
    if (!shopId) return corsResponse({ error: "Invalid shop id" }, 400);

    const db = getDb();

    const [shop] = await db
      .select()
      .from(shops)
      .where(eq(shops.id, shopId))
      .limit(1);

    if (!shop) return corsResponse({ error: "Shop not found" }, 404);

    if (shop.isActive) {
      return corsResponse({ error: "Disable the shop before deleting" }, 400);
    }

    const [saleCount] = await db
      .select({ count: count() })
      .from(sales)
      .where(eq(sales.shopId, shopId));

    if (saleCount.count > 0) {
      return corsResponse(
        { error: "Cannot delete a shop that has sales records" },
        400,
      );
    }

    await db.delete(shops).where(eq(shops.id, shopId));

    return corsResponse({ ok: true });
  } catch (error) {
    console.error("DELETE /api/shops/[id] failed:", error);
    return corsResponse({ error: "Failed to delete shop" }, 500);
  }
}
