import { NextRequest } from "next/server";

import { requireAuth } from "@/lib/api-auth";
import { listConversations, unreadChatTotal } from "@/lib/chat";
import { corsOptionsResponse, corsResponse } from "@/lib/cors";

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error || !auth.session) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get("unreadOnly") === "true") {
      const unreadCount = await unreadChatTotal({
        viewerId: auth.session.id,
        viewerRole: auth.session.role,
      });
      return corsResponse({ unreadCount });
    }

    const conversations = await listConversations({
      viewerId: auth.session.id,
      viewerRole: auth.session.role,
    });
    const unreadCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
    return corsResponse({ conversations, unreadCount });
  } catch (error) {
    console.error("GET /api/conversations failed:", error);
    return corsResponse({ error: "Failed to fetch conversations" }, 500);
  }
}
