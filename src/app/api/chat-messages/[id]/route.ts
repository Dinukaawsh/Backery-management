import { NextRequest } from "next/server";

import { requireAuth } from "@/lib/api-auth";
import { softDeleteMessage, updateMessage } from "@/lib/chat";
import { corsOptionsResponse, corsResponse } from "@/lib/cors";

type RouteContext = { params: Promise<{ id: string }> };

function parseId(id: string) {
  const messageId = Number(id);
  if (!Number.isInteger(messageId) || messageId <= 0) return null;
  return messageId;
}

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth.error || !auth.session) return auth.error;

  try {
    const { id } = await context.params;
    const messageId = parseId(id);
    if (!messageId) return corsResponse({ error: "Invalid message id" }, 400);

    const body = await request.json();
    const result = await updateMessage({
      messageId,
      viewerId: auth.session.id,
      viewerRole: auth.session.role,
      body: String(body.body ?? ""),
    });

    if (result.error === "Message not found") {
      return corsResponse({ error: result.error }, 404);
    }
    if (result.error === "Forbidden") {
      return corsResponse({ error: result.error }, 403);
    }
    if (result.error) {
      return corsResponse({ error: result.error }, 400);
    }

    return corsResponse({ message: result.message });
  } catch (error) {
    console.error("PATCH /api/chat-messages/[id] failed:", error);
    return corsResponse({ error: "Failed to update message" }, 500);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth.error || !auth.session) return auth.error;

  try {
    const { id } = await context.params;
    const messageId = parseId(id);
    if (!messageId) return corsResponse({ error: "Invalid message id" }, 400);

    const result = await softDeleteMessage({
      messageId,
      viewerId: auth.session.id,
      viewerRole: auth.session.role,
    });

    if (result.error === "Message not found") {
      return corsResponse({ error: result.error }, 404);
    }
    if (result.error === "Forbidden") {
      return corsResponse({ error: result.error }, 403);
    }
    if (result.error) {
      return corsResponse({ error: result.error }, 400);
    }

    return corsResponse({ message: result.message, ok: true });
  } catch (error) {
    console.error("DELETE /api/chat-messages/[id] failed:", error);
    return corsResponse({ error: "Failed to delete message" }, 500);
  }
}
