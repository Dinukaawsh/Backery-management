import { desc, eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "@/db";
import { shops, users } from "@/db/schema";
import { requireAuth } from "@/lib/api-auth";
import { corsOptionsResponse, corsResponse } from "@/lib/cors";
import { validateShopInput } from "@/lib/validators";

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error || !auth.session) return auth.error;

  try {
    const creator = users;
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

    const [shop] = await getDb()
      .insert(shops)
      .values({
        ...input,
        createdById: auth.session.id,
      })
      .returning();

    const [withCreator] = await getDb()
      .select({
        id: shops.id,
        name: shops.name,
        ownerName: shops.ownerName,
        address: shops.address,
        phone: shops.phone,
        isActive: shops.isActive,
        createdById: shops.createdById,
        createdAt: shops.createdAt,
        addedByName: users.name,
        addedByRole: users.role,
      })
      .from(shops)
      .leftJoin(users, eq(shops.createdById, users.id))
      .where(eq(shops.id, shop.id))
      .limit(1);

    return corsResponse({ shop: withCreator ?? shop }, 201);
  } catch (error) {
    console.error("POST /api/shops failed:", error);
    return corsResponse({ error: "Failed to create shop" }, 500);
  }
}
