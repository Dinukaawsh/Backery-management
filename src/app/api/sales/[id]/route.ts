import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "@/db";
import { products, saleItems, sales, shops, users } from "@/db/schema";
import { requireAuth } from "@/lib/api-auth";
import { corsOptionsResponse, corsResponse } from "@/lib/cors";

type RouteContext = { params: Promise<{ id: string }> };

function parseId(id: string) {
  const saleId = Number(id);
  if (!Number.isInteger(saleId) || saleId <= 0) return null;
  return saleId;
}

async function getSaleWithDetails(saleId: number) {
  const [sale] = await getDb()
    .select({
      id: sales.id,
      deliveryGuyId: sales.deliveryGuyId,
      shopId: sales.shopId,
      saleDate: sales.saleDate,
      totalAmount: sales.totalAmount,
      notes: sales.notes,
      billPrinted: sales.billPrinted,
      createdAt: sales.createdAt,
      shopName: shops.name,
      shopOwner: shops.ownerName,
      shopAddress: shops.address,
      shopPhone: shops.phone,
      deliveryGuyName: users.name,
    })
    .from(sales)
    .innerJoin(shops, eq(sales.shopId, shops.id))
    .innerJoin(users, eq(sales.deliveryGuyId, users.id))
    .where(eq(sales.id, saleId))
    .limit(1);

  if (!sale) return null;

  const items = await getDb()
    .select({
      id: saleItems.id,
      productId: saleItems.productId,
      quantity: saleItems.quantity,
      unitPrice: saleItems.unitPrice,
      productName: products.name,
    })
    .from(saleItems)
    .innerJoin(products, eq(saleItems.productId, products.id))
    .where(eq(saleItems.saleId, saleId));

  return { ...sale, items };
}

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth.error || !auth.session) return auth.error;

  try {
    const { id } = await context.params;
    const saleId = parseId(id);
    if (!saleId) return corsResponse({ error: "Invalid sale id" }, 400);

    const sale = await getSaleWithDetails(saleId);
    if (!sale) return corsResponse({ error: "Sale not found" }, 404);

    if (
      auth.session.role === "delivery" &&
      sale.deliveryGuyId !== auth.session.id
    ) {
      return corsResponse({ error: "Forbidden" }, 403);
    }

    return corsResponse({ sale });
  } catch (error) {
    console.error("GET /api/sales/[id] failed:", error);
    return corsResponse({ error: "Failed to fetch sale" }, 500);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth.error || !auth.session) return auth.error;

  try {
    const { id } = await context.params;
    const saleId = parseId(id);
    if (!saleId) return corsResponse({ error: "Invalid sale id" }, 400);

    const [existing] = await getDb()
      .select()
      .from(sales)
      .where(eq(sales.id, saleId))
      .limit(1);

    if (!existing) return corsResponse({ error: "Sale not found" }, 404);

    if (
      auth.session.role === "delivery" &&
      existing.deliveryGuyId !== auth.session.id
    ) {
      return corsResponse({ error: "Forbidden" }, 403);
    }

    const body = await request.json();
    const updates: Partial<{ billPrinted: boolean; notes: string | null }> = {};

    if (typeof body.billPrinted === "boolean") {
      updates.billPrinted = body.billPrinted;
    }
    if (typeof body.notes === "string") {
      updates.notes = body.notes.trim();
    }

    await getDb().update(sales).set(updates).where(eq(sales.id, saleId));

    const sale = await getSaleWithDetails(saleId);
    return corsResponse({ sale });
  } catch (error) {
    console.error("PATCH /api/sales/[id] failed:", error);
    return corsResponse({ error: "Failed to update sale" }, 500);
  }
}
