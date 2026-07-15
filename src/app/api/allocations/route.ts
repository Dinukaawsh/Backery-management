import { and, desc, eq, gte, lt } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "@/db";
import { deliveryAllocations, products, users } from "@/db/schema";
import { getAssignmentSummary } from "@/lib/allocations";
import { requireAuth } from "@/lib/api-auth";
import { corsOptionsResponse, corsResponse } from "@/lib/cors";
import { dayRange, localDateString, parseDateInput } from "@/lib/dates";
import { notifyUser } from "@/lib/notifications";

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error || !auth.session) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const dateInput = searchParams.get("date") ?? localDateString();
    const date = parseDateInput(dateInput);
    if (!date) return corsResponse({ error: "Invalid date" }, 400);

    const historyDate = searchParams.get("historyDate") ?? undefined;
    const historyDateFrom = searchParams.get("historyDateFrom") ?? undefined;
    const historyDateTo = searchParams.get("historyDateTo") ?? undefined;

    let deliveryGuyId: number | undefined;
    if (auth.session.role === "delivery") {
      deliveryGuyId = auth.session.id;
    } else {
      const param = searchParams.get("deliveryGuyId");
      if (param) {
        deliveryGuyId = Number(param);
        if (!Number.isInteger(deliveryGuyId) || deliveryGuyId <= 0) {
          return corsResponse({ error: "Invalid delivery partner id" }, 400);
        }
      }
    }

    const summary = await getAssignmentSummary(date, deliveryGuyId);

    if (auth.session.role === "admin") {
      // History: all rows by default; optional history date / range + partner.
      const historyConditions = [];
      if (deliveryGuyId) {
        historyConditions.push(
          eq(deliveryAllocations.deliveryGuyId, deliveryGuyId),
        );
      }

      if (historyDate) {
        const parsed = parseDateInput(historyDate);
        if (!parsed) return corsResponse({ error: "Invalid historyDate" }, 400);
        const { start, end } = dayRange(parsed);
        historyConditions.push(
          gte(deliveryAllocations.allocationDate, start),
          lt(deliveryAllocations.allocationDate, end),
        );
      } else if (historyDateFrom || historyDateTo) {
        if (historyDateFrom) {
          const from = parseDateInput(historyDateFrom);
          if (!from) {
            return corsResponse({ error: "Invalid historyDateFrom" }, 400);
          }
          historyConditions.push(
            gte(deliveryAllocations.allocationDate, dayRange(from).start),
          );
        }
        if (historyDateTo) {
          const to = parseDateInput(historyDateTo);
          if (!to) {
            return corsResponse({ error: "Invalid historyDateTo" }, 400);
          }
          historyConditions.push(
            lt(deliveryAllocations.allocationDate, dayRange(to).end),
          );
        }
      }

      const rows = await getDb()
        .select({
          id: deliveryAllocations.id,
          deliveryGuyId: deliveryAllocations.deliveryGuyId,
          deliveryGuyName: users.name,
          productId: deliveryAllocations.productId,
          productName: products.name,
          quantity: deliveryAllocations.quantity,
          allocationDate: deliveryAllocations.allocationDate,
          createdAt: deliveryAllocations.createdAt,
        })
        .from(deliveryAllocations)
        .innerJoin(users, eq(deliveryAllocations.deliveryGuyId, users.id))
        .innerJoin(products, eq(deliveryAllocations.productId, products.id))
        .where(
          historyConditions.length > 0 ? and(...historyConditions) : undefined,
        )
        .orderBy(desc(deliveryAllocations.createdAt));

      return corsResponse({ summary, allocations: rows });
    }

    return corsResponse({ summary });
  } catch (error) {
    console.error("GET /api/allocations failed:", error);
    return corsResponse({ error: "Failed to fetch allocations" }, 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ["admin"]);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const deliveryGuyId = Number(body.deliveryGuyId);
    const allocationDate =
      typeof body.allocationDate === "string"
        ? parseDateInput(body.allocationDate)
        : null;
    const items = body.items;

    if (!Number.isInteger(deliveryGuyId) || deliveryGuyId <= 0) {
      return corsResponse({ error: "Invalid delivery partner" }, 400);
    }
    if (!allocationDate) {
      return corsResponse({ error: "Invalid allocation date" }, 400);
    }
    if (!Array.isArray(items) || items.length === 0) {
      return corsResponse({ error: "Add at least one product" }, 400);
    }

    const db = getDb();

    const [deliveryGuy] = await db
      .select()
      .from(users)
      .where(eq(users.id, deliveryGuyId))
      .limit(1);

    if (!deliveryGuy || deliveryGuy.role !== "delivery" || !deliveryGuy.isActive) {
      return corsResponse({ error: "Delivery partner not found or inactive" }, 400);
    }

    const created = [];
    const assignedLines: string[] = [];

    for (const item of items) {
      const productId = Number(item.productId);
      const quantity = Number(item.quantity);

      if (!Number.isInteger(productId) || productId <= 0) {
        return corsResponse({ error: "Invalid product id" }, 400);
      }
      if (!Number.isInteger(quantity) || quantity <= 0) {
        return corsResponse({ error: "Invalid quantity" }, 400);
      }

      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);

      if (!product) {
        return corsResponse({ error: `Product ${productId} not found` }, 400);
      }

      if (!product.isActive) {
        return corsResponse(
          { error: `Product ${product.name} is disabled` },
          400,
        );
      }

      if (product.stockAvailable < quantity) {
        return corsResponse(
          { error: `Not enough bakery stock for ${product.name}` },
          400,
        );
      }

      await db
        .update(products)
        .set({ stockAvailable: product.stockAvailable - quantity })
        .where(eq(products.id, productId));

      const [allocation] = await db
        .insert(deliveryAllocations)
        .values({
          deliveryGuyId,
          productId,
          quantity,
          allocationDate,
        })
        .returning();

      created.push(allocation);
      assignedLines.push(`${product.name} × ${quantity}`);
    }

    try {
      await notifyUser({
        userId: deliveryGuyId,
        type: "assignment",
        title: "New stock assigned",
        body: assignedLines.join(", "),
        href: null,
      });
    } catch (notifyError) {
      console.error("Failed to create assignment notification:", notifyError);
    }

    const summary = await getAssignmentSummary(allocationDate, deliveryGuyId);
    return corsResponse({ allocations: created, summary }, 201);
  } catch (error) {
    console.error("POST /api/allocations failed:", error);
    return corsResponse({ error: "Failed to create allocation" }, 500);
  }
}
