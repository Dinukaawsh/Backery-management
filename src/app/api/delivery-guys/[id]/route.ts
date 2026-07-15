import { count, eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "@/db";
import { deliveryAllocations, sales, users } from "@/db/schema";
import { requireAuth } from "@/lib/api-auth";
import { hashPassword } from "@/lib/auth";
import { corsOptionsResponse, corsResponse } from "@/lib/cors";

type RouteContext = { params: Promise<{ id: string }> };

function parseId(id: string) {
  const userId = Number(id);
  if (!Number.isInteger(userId) || userId <= 0) return null;
  return userId;
}

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request, ["admin"]);
  if (auth.error) return auth.error;

  try {
    const { id } = await context.params;
    const userId = parseId(id);
    if (!userId) return corsResponse({ error: "Invalid id" }, 400);

    const [row] = await getDb()
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        phone: users.phone,
        imageUrl: users.imageUrl,
        isActive: users.isActive,
        createdAt: users.createdAt,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!row || row.role !== "delivery") {
      return corsResponse({ error: "Delivery partner not found" }, 404);
    }

    const { role: _role, ...deliveryGuyData } = row;
    return corsResponse({ deliveryGuy: deliveryGuyData });
  } catch (error) {
    console.error("GET /api/delivery-guys/[id] failed:", error);
    return corsResponse({ error: "Failed to fetch delivery partner" }, 500);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request, ["admin"]);
  if (auth.error) return auth.error;

  try {
    const { id } = await context.params;
    const userId = parseId(id);
    if (!userId) return corsResponse({ error: "Invalid id" }, 400);

    const body = await request.json();
    const updates: Partial<{
      name: string;
      email: string;
      phone: string | null;
      imageUrl: string | null;
      isActive: boolean;
      passwordHash: string;
    }> = {};

    if (typeof body.name === "string" && body.name.trim()) {
      updates.name = body.name.trim();
    }
    if (typeof body.email === "string" && body.email.trim()) {
      updates.email = body.email.trim().toLowerCase();
    }
    if (typeof body.phone === "string") {
      updates.phone = body.phone.trim();
    }
    if (body.imageUrl === null) {
      updates.imageUrl = null;
    } else if (typeof body.imageUrl === "string") {
      updates.imageUrl = body.imageUrl.trim() || null;
    }
    if (typeof body.isActive === "boolean") {
      updates.isActive = body.isActive;
    }
    if (typeof body.password === "string" && body.password.length >= 6) {
      updates.passwordHash = await hashPassword(body.password);
    }

    if (Object.keys(updates).length === 0) {
      return corsResponse({ error: "No changes provided" }, 400);
    }

    if (updates.email) {
      const [existing] = await getDb()
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, updates.email))
        .limit(1);

      if (existing && existing.id !== userId) {
        return corsResponse({ error: "Email already in use" }, 400);
      }
    }

    const [deliveryGuy] = await getDb()
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        phone: users.phone,
        imageUrl: users.imageUrl,
        isActive: users.isActive,
        createdAt: users.createdAt,
        role: users.role,
      });

    if (!deliveryGuy || deliveryGuy.role !== "delivery") {
      return corsResponse({ error: "Delivery partner not found" }, 404);
    }

    const { role: _role, ...data } = deliveryGuy;
    return corsResponse({ deliveryGuy: data });
  } catch (error) {
    console.error("PUT /api/delivery-guys/[id] failed:", error);
    return corsResponse({ error: "Failed to update delivery partner" }, 500);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request, ["admin"]);
  if (auth.error) return auth.error;

  try {
    const { id } = await context.params;
    const userId = parseId(id);
    if (!userId) return corsResponse({ error: "Invalid id" }, 400);

    const db = getDb();

    const [deliveryGuy] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!deliveryGuy || deliveryGuy.role !== "delivery") {
      return corsResponse({ error: "Delivery partner not found" }, 404);
    }

    if (deliveryGuy.isActive) {
      return corsResponse(
        { error: "Disable the delivery partner before deleting" },
        400,
      );
    }

    const [saleCount] = await db
      .select({ count: count() })
      .from(sales)
      .where(eq(sales.deliveryGuyId, userId));

    if (saleCount.count > 0) {
      return corsResponse(
        { error: "Cannot delete a delivery partner who has sales records" },
        400,
      );
    }

    await db
      .delete(deliveryAllocations)
      .where(eq(deliveryAllocations.deliveryGuyId, userId));

    await db.delete(users).where(eq(users.id, userId));

    return corsResponse({ ok: true });
  } catch (error) {
    console.error("DELETE /api/delivery-guys/[id] failed:", error);
    return corsResponse({ error: "Failed to delete delivery partner" }, 500);
  }
}
