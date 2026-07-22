import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "@/db";
import { sales, shops } from "@/db/schema";
import { requireAuth } from "@/lib/api-auth";
import { corsOptionsResponse, corsResponse } from "@/lib/cors";
import { formatMoney, parseMoney } from "@/lib/money";
import { getSaleWithDetails, saleAmountDue } from "@/lib/sales";

type RouteContext = { params: Promise<{ id: string }> };

function parseId(id: string) {
  const saleId = Number(id);
  if (!Number.isInteger(saleId) || saleId <= 0) return null;
  return saleId;
}

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth.error || !auth.session) return auth.error;

  try {
    const { id } = await context.params;
    const saleId = parseId(id);
    if (!saleId) return corsResponse({ error: "Invalid sale id" }, 400);

    const sale = await getSaleWithDetails(saleId);
    if (!sale) return corsResponse({ error: "Sale not found" }, 404);

    if (
      auth.session.role === "delivery" &&
      sale.deliveryGuyId !== auth.session.id
    ) {
      return corsResponse({ error: "Forbidden" }, 403);
    }

    return corsResponse({ sale });
  } catch (error) {
    console.error("GET /api/sales/[id] failed:", error);
    return corsResponse({ error: "Failed to fetch sale" }, 500);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth.error || !auth.session) return auth.error;

  try {
    const { id } = await context.params;
    const saleId = parseId(id);
    if (!saleId) return corsResponse({ error: "Invalid sale id" }, 400);

    const [existing] = await getDb()
      .select()
      .from(sales)
      .where(eq(sales.id, saleId))
      .limit(1);

    if (!existing) return corsResponse({ error: "Sale not found" }, 404);

    if (
      auth.session.role === "delivery" &&
      existing.deliveryGuyId !== auth.session.id
    ) {
      return corsResponse({ error: "Forbidden" }, 403);
    }

    const body = await request.json();
    const updates: Partial<{
      billPrinted: boolean;
      notes: string | null;
      paidAmount: string;
      remainingAfter: string;
    }> = {};

    if (typeof body.billPrinted === "boolean") {
      updates.billPrinted = body.billPrinted;
    }
    if (typeof body.notes === "string") {
      updates.notes = body.notes.trim();
    }

    if (body.paidAmount !== undefined && body.paidAmount !== null) {
      const previousBalance = parseMoney(existing.previousBalance);
      const todayTotal = parseMoney(existing.totalAmount);
      const returnsAmount = parseMoney(existing.returnsAmount ?? "0");
      const amountDue = saleAmountDue(
        previousBalance,
        todayTotal,
        returnsAmount,
      );
      let paidAmount = parseMoney(body.paidAmount);

      if (paidAmount < 0) {
        return corsResponse({ error: "Paid amount cannot be negative" }, 400);
      }
      if (paidAmount > amountDue) {
        paidAmount = amountDue;
      }

      const remainingAfter = parseMoney(amountDue - paidAmount);
      updates.paidAmount = formatMoney(paidAmount);
      updates.remainingAfter = formatMoney(remainingAfter);

      await getDb()
        .update(shops)
        .set({ outstandingBalance: formatMoney(remainingAfter) })
        .where(eq(shops.id, existing.shopId));
    }

    if (Object.keys(updates).length === 0) {
      return corsResponse({ error: "No changes provided" }, 400);
    }

    await getDb().update(sales).set(updates).where(eq(sales.id, saleId));

    const sale = await getSaleWithDetails(saleId);
    return corsResponse({ sale });
  } catch (error) {
    console.error("PATCH /api/sales/[id] failed:", error);
    return corsResponse({ error: "Failed to update sale" }, 500);
  }
}
