import { count, eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "@/db";
import { products, saleItems } from "@/db/schema";
import { requireAuth } from "@/lib/api-auth";
import { corsOptionsResponse, corsResponse } from "@/lib/cors";
import { validateProductInput } from "@/lib/validators";
import { upsertProductCategory } from "@/lib/product-categories";

type RouteContext = { params: Promise<{ id: string }> };

function parseId(id: string) {
  const productId = Number(id);
  if (!Number.isInteger(productId) || productId <= 0) return null;
  return productId;
}

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const { id } = await context.params;
    const productId = parseId(id);
    if (!productId) return corsResponse({ error: "Invalid product id" }, 400);

    const [product] = await getDb()
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product) return corsResponse({ error: "Product not found" }, 404);
    return corsResponse({ product });
  } catch (error) {
    console.error("GET /api/products/[id] failed:", error);
    return corsResponse({ error: "Failed to fetch product" }, 500);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request, ["admin"]);
  if (auth.error) return auth.error;

  try {
    const { id } = await context.params;
    const productId = parseId(id);
    if (!productId) return corsResponse({ error: "Invalid product id" }, 400);

    const body = await request.json();
    const updates: Partial<{
      name: string;
      description: string | null;
      price: string;
      category: string;
      stockAvailable: number;
      imageUrl: string | null;
      isActive: boolean;
    }> = {};

    const validated = validateProductInput(body);
    if (validated) {
      Object.assign(updates, validated);
    }

    if (typeof body.isActive === "boolean") {
      updates.isActive = body.isActive;
    }

    if (Object.keys(updates).length === 0) {
      return corsResponse({ error: "No changes provided" }, 400);
    }

    if (updates.category) {
      await upsertProductCategory(updates.category);
    }

    const [product] = await getDb()
      .update(products)
      .set(updates)
      .where(eq(products.id, productId))
      .returning();

    if (!product) return corsResponse({ error: "Product not found" }, 404);
    return corsResponse({ product });
  } catch (error) {
    console.error("PUT /api/products/[id] failed:", error);
    return corsResponse({ error: "Failed to update product" }, 500);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request, ["admin"]);
  if (auth.error) return auth.error;

  try {
    const { id } = await context.params;
    const productId = parseId(id);
    if (!productId) return corsResponse({ error: "Invalid product id" }, 400);

    const db = getDb();

    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product) return corsResponse({ error: "Product not found" }, 404);

    if (product.isActive) {
      return corsResponse({ error: "Disable the product before deleting" }, 400);
    }

    const [saleItemCount] = await db
      .select({ count: count() })
      .from(saleItems)
      .where(eq(saleItems.productId, productId));

    if (saleItemCount.count > 0) {
      return corsResponse(
        { error: "Cannot delete a product that has sales records" },
        400,
      );
    }

    await db.delete(products).where(eq(products.id, productId));

    return corsResponse({ ok: true });
  } catch (error) {
    console.error("DELETE /api/products/[id] failed:", error);
    return corsResponse({ error: "Failed to delete product" }, 500);
  }
}
