import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { NextRequest } from "next/server";

import { getDb } from "@/db";
import { shops, users } from "@/db/schema";
import { requireAuth } from "@/lib/api-auth";
import { corsOptionsResponse, corsResponse } from "@/lib/cors";
import { validateShopInput } from "@/lib/validators";

const creator = alias(users, "shop_creator");

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error || !auth.session) return auth.error;

  try {
    const conditions =
      auth.session.role === "delivery"
        ? eq(shops.isActive, true)
        : undefined;

    const allShops = await getDb()
      .select({
        id: shops.id,
        name: shops.name,
        ownerName: shops.ownerName,
        address: shops.address,
        phone: shops.phone,
        route: shops.route,
        outstandingBalance: shops.outstandingBalance,
        isActive: shops.isActive,
        createdById: shops.createdById,
        createdAt: shops.createdAt,
        addedByName: creator.name,
        addedByRole: creator.role,
      })
      .from(shops)
      .leftJoin(creator, eq(shops.createdById, creator.id))
      .where(conditions)
      .orderBy(desc(shops.createdAt));

    return corsResponse({ shops: allShops });
  } catch (error) {
    console.error("GET /api/shops failed:", error);
    return corsResponse({ error: "Failed to fetch shops" }, 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error || !auth.session) return auth.error;

  try {
    const body = await request.json();
    const input = validateShopInput(body);
    if (!input) return corsResponse({ error: "Invalid shop data" }, 400);

    const createdById = Number(auth.session.id);
    if (!Number.isInteger(createdById) || createdById <= 0) {
      return corsResponse({ error: "Invalid session" }, 401);
    }

    const [shop] = await getDb()
      .insert(shops)
      .values({
        name: input.name,
        ownerName: input.ownerName,
        address: input.address,
        phone: input.phone ?? null,
        route: input.route ?? null,
        createdById,
      })
      .returning();

    const [withCreator] = await getDb()
      .select({
        id: shops.id,
        name: shops.name,
        ownerName: shops.ownerName,
        address: shops.address,
        phone: shops.phone,
        route: shops.route,
        outstandingBalance: shops.outstandingBalance,
        isActive: shops.isActive,
        createdById: shops.createdById,
        createdAt: shops.createdAt,
        addedByName: creator.name,
        addedByRole: creator.role,
      })
      .from(shops)
      .leftJoin(creator, eq(shops.createdById, creator.id))
      .where(eq(shops.id, shop.id))
      .limit(1);

    return corsResponse({ shop: withCreator ?? shop }, 201);
  } catch (error) {
    console.error("POST /api/shops failed:", error);
    return corsResponse({ error: "Failed to create shop" }, 500);
  }
}
