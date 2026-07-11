import { desc, eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "@/db";
import { products } from "@/db/schema";
import { requireAuth } from "@/lib/api-auth";
import { corsOptionsResponse, corsResponse } from "@/lib/cors";
import { validateProductInput } from "@/lib/validators";
import { upsertProductCategory } from "@/lib/product-categories";

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const conditions =
      auth.session.role === "delivery"
        ? eq(products.isActive, true)
        : undefined;

    const allProducts = await getDb()
      .select()
      .from(products)
      .where(conditions)
      .orderBy(desc(products.createdAt));

    return corsResponse({ products: allProducts });
  } catch (error) {
    console.error("GET /api/products failed:", error);
    return corsResponse({ error: "Failed to fetch products" }, 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ["admin"]);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const input = validateProductInput(body);

    if (!input) {
      return corsResponse({ error: "Invalid product data" }, 400);
    }

    await upsertProductCategory(input.category);

    const [product] = await getDb()
      .insert(products)
      .values({
        name: input.name,
        description: input.description,
        price: input.price,
        category: input.category,
        stockAvailable: input.stockAvailable ?? 0,
        imageUrl: input.imageUrl,
      })
      .returning();

    return corsResponse({ product }, 201);
  } catch (error) {
    console.error("POST /api/products failed:", error);
    return corsResponse({ error: "Failed to create product" }, 500);
  }
}
