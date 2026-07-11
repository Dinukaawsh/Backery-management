import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "@/db";
import { users } from "@/db/schema";
import { corsResponse } from "@/lib/cors";
import { getSessionFromRequest, SessionUser, UserRole } from "@/lib/auth";

export async function requireAuth(
  request: NextRequest,
  allowedRoles?: UserRole[],
) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return { error: corsResponse({ error: "Unauthorized" }, 401), session: null };
  }

  const [user] = await getDb()
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.id, session.id))
    .limit(1);

  if (!user || !user.isActive) {
    return { error: corsResponse({ error: "Unauthorized" }, 401), session: null };
  }

  const activeSession: SessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };

  if (allowedRoles && !allowedRoles.includes(activeSession.role)) {
    return { error: corsResponse({ error: "Forbidden" }, 403), session: null };
  }

  return { error: null, session: activeSession };
}
