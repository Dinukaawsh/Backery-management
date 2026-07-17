import { NextRequest } from "next/server";

import { requireAuth } from "@/lib/api-auth";
import { corsOptionsResponse, corsResponse } from "@/lib/cors";
import {
  deleteSaleComment,
  updateSaleComment,
} from "@/lib/sale-comments";

type RouteContext = { params: Promise<{ id: string }> };

function parseId(id: string) {
  const commentId = Number(id);
  if (!Number.isInteger(commentId) || commentId <= 0) return null;
  return commentId;
}

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth.error || !auth.session) return auth.error;

  try {
    const { id } = await context.params;
    const commentId = parseId(id);
    if (!commentId) return corsResponse({ error: "Invalid comment id" }, 400);

    const body = await request.json();
    const result = await updateSaleComment({
      commentId,
      userId: auth.session.id,
      role: auth.session.role,
      body: String(body.body ?? ""),
    });

    if (result.error === "Comment not found") {
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
    console.error("PATCH /api/comments/[id] failed:", error);
    return corsResponse({ error: "Failed to update comment" }, 500);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth.error || !auth.session) return auth.error;

  try {
    const { id } = await context.params;
    const commentId = parseId(id);
    if (!commentId) return corsResponse({ error: "Invalid comment id" }, 400);

    const result = await deleteSaleComment({
      commentId,
      userId: auth.session.id,
      role: auth.session.role,
    });

    if (result.error === "Comment not found") {
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
    console.error("DELETE /api/comments/[id] failed:", error);
    return corsResponse({ error: "Failed to delete comment" }, 500);
  }
}
