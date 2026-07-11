import { and, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "@/db";
import { products, sales, shops, users } from "@/db/schema";
import { requireAuth } from "@/lib/api-auth";
import { corsOptionsResponse, corsResponse } from "@/lib/cors";

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function defaultRange() {
  const end = startOfDay(new Date());
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  return { start, end: endOfDay(new Date()) };
}

function parseRange(dateFrom: string | null, dateTo: string | null) {
  if (!dateFrom && !dateTo) {
    return defaultRange();
  }

  const end = dateTo ? endOfDay(new Date(dateTo)) : endOfDay(new Date());
  const start = dateFrom
    ? startOfDay(new Date(dateFrom))
    : (() => {
        const fallback = new Date(end);
        fallback.setDate(fallback.getDate() - 6);
        return startOfDay(fallback);
      })();

  return { start, end };
}

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["admin"]);
  if (auth.error) return auth.error;

  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const { start, end } = parseRange(
      searchParams.get("dateFrom"),
      searchParams.get("dateTo"),
    );

    const [periodStats] = await db
      .select({
        count: count(),
        total: sql<string>`coalesce(sum(${sales.totalAmount}), 0)`,
      })
      .from(sales)
      .where(and(gte(sales.saleDate, start), lte(sales.saleDate, end)));

    const [productStats] = await db.select({ count: count() }).from(products);
    const [deliveryStats] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.role, "delivery"));
    const [shopStats] = await db.select({ count: count() }).from(shops);

    const recentSales = await db
      .select({
        id: sales.id,
        totalAmount: sales.totalAmount,
        saleDate: sales.saleDate,
        shopName: shops.name,
        deliveryGuyName: users.name,
      })
      .from(sales)
      .innerJoin(shops, eq(sales.shopId, shops.id))
      .innerJoin(users, eq(sales.deliveryGuyId, users.id))
      .where(and(gte(sales.saleDate, start), lte(sales.saleDate, end)))
      .orderBy(desc(sales.saleDate))
      .limit(8);

    const dailySales = await db
      .select({
        day: sql<string>`to_char(${sales.saleDate}, 'YYYY-MM-DD')`,
        total: sql<string>`coalesce(sum(${sales.totalAmount}), 0)`,
        count: count(),
      })
      .from(sales)
      .where(and(gte(sales.saleDate, start), lte(sales.saleDate, end)))
      .groupBy(sql`to_char(${sales.saleDate}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${sales.saleDate}, 'YYYY-MM-DD')`);

    const topDeliveryGuys = await db
      .select({
        name: users.name,
        total: sql<string>`coalesce(sum(${sales.totalAmount}), 0)`,
        count: count(),
      })
      .from(sales)
      .innerJoin(users, eq(sales.deliveryGuyId, users.id))
      .where(and(gte(sales.saleDate, start), lte(sales.saleDate, end)))
      .groupBy(users.id, users.name)
      .orderBy(sql`coalesce(sum(${sales.totalAmount}), 0) desc`)
      .limit(5);

    const salesByShop = await db
      .select({
        name: shops.name,
        total: sql<string>`coalesce(sum(${sales.totalAmount}), 0)`,
      })
      .from(sales)
      .innerJoin(shops, eq(sales.shopId, shops.id))
      .where(and(gte(sales.saleDate, start), lte(sales.saleDate, end)))
      .groupBy(shops.id, shops.name)
      .orderBy(sql`coalesce(sum(${sales.totalAmount}), 0) desc`)
      .limit(5);

    return corsResponse({
      stats: {
        periodSalesCount: periodStats.count,
        periodSalesTotal: periodStats.total,
        totalProducts: productStats.count,
        totalDeliveryGuys: deliveryStats.count,
        totalShops: shopStats.count,
      },
      recentSales,
      dailySales,
      topDeliveryGuys,
      salesByShop,
    });
  } catch (error) {
    console.error("GET /api/dashboard failed:", error);
    return corsResponse({ error: "Failed to load dashboard" }, 500);
  }
}
