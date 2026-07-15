import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "@/db";
import { users } from "@/db/schema";
import {
  clearTokenCookie,
  createToken,
  setTokenCookie,
  verifyPassword,
} from "@/lib/auth";
import { corsOptionsResponse, corsResponse } from "@/lib/cors";

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return corsResponse({ error: "Email and password are required" }, 400);
    }

    const [user] = await getDb()
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return corsResponse({ error: "Invalid credentials" }, 401);
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

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return corsResponse({ error: "Invalid credentials" }, 401);
    }

    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const token = await createToken(sessionUser);
    const response = corsResponse({ user: sessionUser, token });

    response.cookies.set(setTokenCookie(token));
    return response;
  } catch (error) {
    console.error("POST /api/auth/login failed:", error);
    return corsResponse({ error: "Login failed" }, 500);
  }
}

export async function DELETE() {
  const response = corsResponse({ ok: true });
  response.cookies.set(clearTokenCookie());
  return response;
}
