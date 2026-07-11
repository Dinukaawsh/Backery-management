import { NextRequest } from "next/server";

import { requireAuth } from "@/lib/api-auth";
import { corsOptionsResponse, corsResponse } from "@/lib/cors";
import {
  listProductCategories,
  renameProductCategory,
} from "@/lib/product-categories";

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const categories = await listProductCategories();
    return corsResponse({ categories });
  } catch (error) {
    console.error("GET /api/products/categories failed:", error);
    return corsResponse({ error: "Failed to fetch categories" }, 500);
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request, ["admin"]);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const oldName =
      typeof body.oldName === "string" ? body.oldName.trim() : "";
    const newName =
      typeof body.newName === "string" ? body.newName.trim() : "";

    if (!oldName || !newName) {
      return corsResponse({ error: "Old and new category names are required" }, 400);
    }

    const categories = await renameProductCategory(oldName, newName);
    return corsResponse({ categories });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to rename category";
    console.error("PATCH /api/products/categories failed:", error);
    return corsResponse({ error: message }, 400);
  }
}
