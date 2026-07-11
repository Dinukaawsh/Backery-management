import { desc, eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "@/db";
import { users } from "@/db/schema";
import { requireAuth } from "@/lib/api-auth";
import { hashPassword } from "@/lib/auth";
import { corsOptionsResponse, corsResponse } from "@/lib/cors";
import { validateDeliveryGuyInput } from "@/lib/validators";

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["admin"]);
  if (auth.error) return auth.error;

  try {
    const deliveryGuys = await getDb()
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        phone: users.phone,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.role, "delivery"))
      .orderBy(desc(users.createdAt));

    return corsResponse({ deliveryGuys });
  } catch (error) {
    console.error("GET /api/delivery-guys failed:", error);
    return corsResponse({ error: "Failed to fetch delivery guys" }, 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ["admin"]);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const input = validateDeliveryGuyInput(body);

    if (!input) {
      return corsResponse({ error: "Invalid delivery guy data" }, 400);
    }

    const passwordHash = await hashPassword(input.password);

    const [deliveryGuy] = await getDb()
      .insert(users)
      .values({
        email: input.email,
        passwordHash,
        name: input.name,
        phone: input.phone,
        role: "delivery",
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        phone: users.phone,
        isActive: users.isActive,
        createdAt: users.createdAt,
      });

    return corsResponse({ deliveryGuy }, 201);
  } catch (error) {
    console.error("POST /api/delivery-guys failed:", error);
    const message =
      error instanceof Error && error.message.includes("unique")
        ? "Email already exists"
        : "Failed to create delivery guy";
    return corsResponse({ error: message }, 500);
  }
}
