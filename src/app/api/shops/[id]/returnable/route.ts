import { NextRequest } from "next/server";

import { corsOptionsResponse, corsResponse } from "@/lib/cors";
import { requireAuth } from "@/lib/api-auth";
import { getShopReturnableProducts } from "@/lib/shop-returns";

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request);
  if (auth.error || !auth.session) return auth.error;

  try {
    const { id } = await context.params;
    const shopId = Number(id);
    if (!Number.isInteger(shopId) || shopId <= 0) {
      return corsResponse({ error: "Invalid shop id" }, 400);
    }

    const products = await getShopReturnableProducts(shopId);
    return corsResponse({ products });
  } catch (error) {
    console.error("GET /api/shops/[id]/returnable failed:", error);
    return corsResponse({ error: "Failed to load returnable products" }, 500);
  }
}
