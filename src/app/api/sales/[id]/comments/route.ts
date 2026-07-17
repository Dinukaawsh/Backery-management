import { NextRequest } from "next/server";

import { requireAuth } from "@/lib/api-auth";
import { corsOptionsResponse, corsResponse } from "@/lib/cors";
import {
  createSaleComment,
  listSaleComments,
} from "@/lib/sale-comments";

type RouteContext = { params: Promise<{ id: string }> };

function parseSaleId(id: string) {
  const saleId = Number(id);
  if (!Number.isInteger(saleId) || saleId <= 0) return null;
  return saleId;
}

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth.error || !auth.session) return auth.error;

  try {
    const { id } = await context.params;
    const saleId = parseSaleId(id);
    if (!saleId) return corsResponse({ error: "Invalid sale id" }, 400);

    const result = await listSaleComments({
      saleId,
      viewerId: auth.session.id,
      viewerRole: auth.session.role,
    });

    if (result.error === "Sale not found") {
      return corsResponse({ error: result.error }, 404);
    }
    if (result.error === "Forbidden") {
      return corsResponse({ error: result.error }, 403);
    }
    if (result.error) {
      return corsResponse({ error: result.error }, 400);
    }

    return corsResponse({ comments: result.comments });
  } catch (error) {
    console.error("GET /api/sales/[id]/comments failed:", error);
    return corsResponse({ error: "Failed to fetch comments" }, 500);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth.error || !auth.session) return auth.error;

  try {
    const { id } = await context.params;
    const saleId = parseSaleId(id);
    if (!saleId) return corsResponse({ error: "Invalid sale id" }, 400);

    const body = await request.json();
    const result = await createSaleComment({
      saleId,
      userId: auth.session.id,
      role: auth.session.role,
      body: String(body.body ?? ""),
      parentId:
        body.parentId != null && Number.isInteger(Number(body.parentId))
          ? Number(body.parentId)
          : null,
    });

    if (result.error === "Sale not found") {
      return corsResponse({ error: result.error }, 404);
    }
    if (result.error === "Forbidden") {
      return corsResponse({ error: result.error }, 403);
    }
    if (result.error) {
      return corsResponse({ error: result.error }, 400);
    }

    return corsResponse({ comments: result.comments, comment: result.comment });
  } catch (error) {
    console.error("POST /api/sales/[id]/comments failed:", error);
    return corsResponse({ error: "Failed to create comment" }, 500);
  }
}
