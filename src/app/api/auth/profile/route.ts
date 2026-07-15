import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "@/db";
import { users } from "@/db/schema";
import { requireAuth } from "@/lib/api-auth";
import {
  createToken,
  hashPassword,
  setTokenCookie,
  verifyPassword,
} from "@/lib/auth";
import { corsOptionsResponse, corsResponse } from "@/lib/cors";

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error || !auth.session) return auth.error;

  try {
    const body = await request.json();
    const currentPassword =
      typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newEmail =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : null;
    const newPassword =
      typeof body.password === "string" ? body.password : null;
    const newName = typeof body.name === "string" ? body.name.trim() : null;
    const newPhone =
      typeof body.phone === "string" ? body.phone.trim() : undefined;
    const newImageUrl =
      body.imageUrl === null
        ? null
        : typeof body.imageUrl === "string"
          ? body.imageUrl.trim() || null
          : undefined;

    const changingEmail = newEmail !== null && newEmail !== auth.session.email;
    const changingPassword = newPassword !== null && newPassword.length > 0;

    if (changingEmail || changingPassword) {
      if (!currentPassword) {
        return corsResponse(
          { error: "Current password is required to change email or password" },
          400,
        );
      }
    }

    if (changingPassword && newPassword!.length < 6) {
      return corsResponse(
        { error: "New password must be at least 6 characters" },
        400,
      );
    }

    if (changingEmail && !newEmail) {
      return corsResponse({ error: "Email cannot be empty" }, 400);
    }

    const db = getDb();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, auth.session.id))
      .limit(1);

    if (!user || !user.isActive) {
      return corsResponse({ error: "Unauthorized" }, 401);
    }

    if (changingEmail || changingPassword) {
      const valid = await verifyPassword(currentPassword, user.passwordHash);
      if (!valid) {
        return corsResponse({ error: "Current password is incorrect" }, 400);
      }
    }

    if (changingEmail && newEmail !== user.email) {
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, newEmail!))
        .limit(1);

      if (existing) {
        return corsResponse({ error: "Email already in use" }, 400);
      }
    }

    const updates: Partial<{
      email: string;
      passwordHash: string;
      name: string;
      phone: string | null;
      imageUrl: string | null;
    }> = {};

    if (changingEmail) updates.email = newEmail!;
    if (changingPassword) {
      updates.passwordHash = await hashPassword(newPassword!);
    }
    if (newName) updates.name = newName;
    if (newPhone !== undefined) updates.phone = newPhone || null;
    if (newImageUrl !== undefined) updates.imageUrl = newImageUrl;

    if (Object.keys(updates).length === 0) {
      return corsResponse({ error: "No changes provided" }, 400);
    }

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, user.id))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        phone: users.phone,
        imageUrl: users.imageUrl,
      });

    const sessionUser = {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      phone: updated.phone,
      imageUrl: updated.imageUrl,
    };

    const token = await createToken({
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
    });
    const response = corsResponse({
      user: sessionUser,
      token,
      phone: updated.phone,
      imageUrl: updated.imageUrl,
    });
    response.cookies.set(setTokenCookie(token));
    return response;
  } catch (error) {
    console.error("PATCH /api/auth/profile failed:", error);
    return corsResponse({ error: "Failed to update profile" }, 500);
  }
}
