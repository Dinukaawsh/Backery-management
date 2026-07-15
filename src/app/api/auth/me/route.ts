import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "@/db";
import { users } from "@/db/schema";
import { getSessionFromRequest } from "@/lib/auth";
import { corsOptionsResponse, corsResponse } from "@/lib/cors";

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return corsResponse({ error: "Unauthorized" }, 401);
  }

  const [user] = await getDb()
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      phone: users.phone,
      imageUrl: users.imageUrl,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.id, session.id))
    .limit(1);

  if (!user) {
    return corsResponse({ error: "Unauthorized" }, 401);
  }

  if (!user.isActive) {
    return corsResponse(
      {
        error: "ACCOUNT_SUSPENDED",
        code: "ACCOUNT_SUSPENDED",
        message: "Your account is currently suspended",
      },
      403,
    );
  }

  return corsResponse({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      imageUrl: user.imageUrl,
    },
    phone: user.phone,
    imageUrl: user.imageUrl,
  });
}
