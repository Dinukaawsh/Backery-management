import { NextRequest } from "next/server";

import { requireAuth } from "@/lib/api-auth";
import {
  listMessages,
  markConversationRead,
  sendMessage,
} from "@/lib/chat";
import { corsOptionsResponse, corsResponse } from "@/lib/cors";
import { FEATURE_DISABLED_MESSAGE, features } from "@/lib/features";

type RouteContext = { params: Promise<{ deliveryGuyId: string }> };

function parseDeliveryGuyId(id: string) {
  const deliveryGuyId = Number(id);
  if (!Number.isInteger(deliveryGuyId) || deliveryGuyId <= 0) return null;
  return deliveryGuyId;
}

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function GET(request: NextRequest, context: RouteContext) {
  if (!features.messages) {
    return corsResponse({ error: FEATURE_DISABLED_MESSAGE }, 403);
  }

  const auth = await requireAuth(request);
  if (auth.error || !auth.session) return auth.error;

  try {
    const { deliveryGuyId: raw } = await context.params;
    const deliveryGuyId = parseDeliveryGuyId(raw);
    if (!deliveryGuyId) {
      return corsResponse({ error: "Invalid delivery partner id" }, 400);
    }

    const { searchParams } = new URL(request.url);
    const afterIdRaw = searchParams.get("afterId");
    const afterId =
      afterIdRaw != null && Number.isInteger(Number(afterIdRaw))
        ? Number(afterIdRaw)
        : undefined;

    const result = await listMessages({
      deliveryGuyId,
      viewerId: auth.session.id,
      viewerRole: auth.session.role,
      afterId,
    });

    if (result.error === "Forbidden") {
      return corsResponse({ error: result.error }, 403);
    }
    if (result.error) {
      return corsResponse({ error: result.error }, 404);
    }

    // Mark as read when opening the thread
    await markConversationRead({
      deliveryGuyId,
      viewerId: auth.session.id,
      viewerRole: auth.session.role,
    });

    return corsResponse({ messages: result.messages });
  } catch (error) {
    console.error("GET /api/conversations/[deliveryGuyId] failed:", error);
    return corsResponse({ error: "Failed to fetch messages" }, 500);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  if (!features.messages) {
    return corsResponse({ error: FEATURE_DISABLED_MESSAGE }, 403);
  }

  const auth = await requireAuth(request);
  if (auth.error || !auth.session) return auth.error;

  try {
    const { deliveryGuyId: raw } = await context.params;
    const deliveryGuyId = parseDeliveryGuyId(raw);
    if (!deliveryGuyId) {
      return corsResponse({ error: "Invalid delivery partner id" }, 400);
    }

    const body = await request.json();
    const result = await sendMessage({
      deliveryGuyId,
      senderId: auth.session.id,
      senderRole: auth.session.role,
      body: String(body.body ?? ""),
      imageUrl:
        body.imageUrl != null && String(body.imageUrl).trim()
          ? String(body.imageUrl).trim()
          : null,
    });

    if (result.error === "Forbidden") {
      return corsResponse({ error: result.error }, 403);
    }
    if (result.error) {
      return corsResponse({ error: result.error }, 400);
    }

    return corsResponse({ message: result.message });
  } catch (error) {
    console.error("POST /api/conversations/[deliveryGuyId] failed:", error);
    return corsResponse({ error: "Failed to send message" }, 500);
  }
}
