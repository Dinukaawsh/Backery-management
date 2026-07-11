import { and, eq, gte, lt, sql } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "@/db";
import { deliveryAllocations, products, saleItems, sales } from "@/db/schema";
import { requireAuth } from "@/lib/api-auth";
import { corsOptionsResponse, corsResponse } from "@/lib/cors";
import { dayRange } from "@/lib/dates";

type RouteContext = { params: Promise<{ id: string }> };

function parseId(id: string) {
  const allocationId = Number(id);
  if (!Number.isInteger(allocationId) || allocationId <= 0) return null;
  return allocationId;
}

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request, ["admin"]);
  if (auth.error) return auth.error;

  try {
    const { id } = await context.params;
    const allocationId = parseId(id);
    if (!allocationId) return corsResponse({ error: "Invalid id" }, 400);

    const db = getDb();
    const [allocation] = await db
      .select()
      .from(deliveryAllocations)
      .where(eq(deliveryAllocations.id, allocationId))
      .limit(1);

    if (!allocation) {
      return corsResponse({ error: "Allocation not found" }, 404);
    }

    const { start, end } = dayRange(allocation.allocationDate);

    const [allocatedRow] = await db
      .select({
        total: sql<number>`coalesce(sum(${deliveryAllocations.quantity}), 0)`,
      })
      .from(deliveryAllocations)
      .where(
        and(
          eq(deliveryAllocations.deliveryGuyId, allocation.deliveryGuyId),
          eq(deliveryAllocations.productId, allocation.productId),
          gte(deliveryAllocations.allocationDate, start),
          lt(deliveryAllocations.allocationDate, end),
        ),
      );

    const [soldRow] = await db
      .select({
        total: sql<number>`coalesce(sum(${saleItems.quantity}), 0)`,
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .where(
        and(
          eq(sales.deliveryGuyId, allocation.deliveryGuyId),
          eq(saleItems.productId, allocation.productId),
          gte(sales.saleDate, start),
          lt(sales.saleDate, end),
        ),
      );

    const totalAllocated = Number(allocatedRow?.total ?? 0);
    const totalSold = Number(soldRow?.total ?? 0);
    const remaining = totalAllocated - totalSold;

    if (remaining < allocation.quantity) {
      return corsResponse(
        {
          error:
            "Cannot remove this assignment because the delivery guy already sold part of it",
        },
        400,
      );
    }

    await db
      .delete(deliveryAllocations)
      .where(eq(deliveryAllocations.id, allocationId));

    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, allocation.productId))
      .limit(1);

    if (product) {
      await db
        .update(products)
        .set({
          stockAvailable: product.stockAvailable + allocation.quantity,
        })
        .where(eq(products.id, allocation.productId));
    }

    return corsResponse({ ok: true });
  } catch (error) {
    console.error("DELETE /api/allocations/[id] failed:", error);
    return corsResponse({ error: "Failed to delete allocation" }, 500);
  }
}
