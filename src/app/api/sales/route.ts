import { and, desc, eq, gte, lte } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "@/db";
import { products, saleItems, sales, shops, users } from "@/db/schema";
import { getRemainingStock } from "@/lib/allocations";
import { requireAuth } from "@/lib/api-auth";
import { corsOptionsResponse, corsResponse } from "@/lib/cors";
import { parseDateInput, sevenDaysAgo } from "@/lib/dates";
import { validateSaleInput } from "@/lib/validators";

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

async function getSaleWithDetails(saleId: number) {
  const [sale] = await getDb()
    .select({
      id: sales.id,
      deliveryGuyId: sales.deliveryGuyId,
      shopId: sales.shopId,
      saleDate: sales.saleDate,
      totalAmount: sales.totalAmount,
      notes: sales.notes,
      billPrinted: sales.billPrinted,
      createdAt: sales.createdAt,
      shopName: shops.name,
      shopOwner: shops.ownerName,
      shopAddress: shops.address,
      shopPhone: shops.phone,
      deliveryGuyName: users.name,
    })
    .from(sales)
    .innerJoin(shops, eq(sales.shopId, shops.id))
    .innerJoin(users, eq(sales.deliveryGuyId, users.id))
    .where(eq(sales.id, saleId))
    .limit(1);

  if (!sale) return null;

  const items = await getDb()
    .select({
      id: saleItems.id,
      productId: saleItems.productId,
      quantity: saleItems.quantity,
      unitPrice: saleItems.unitPrice,
      productName: products.name,
    })
    .from(saleItems)
    .innerJoin(products, eq(saleItems.productId, products.id))
    .where(eq(saleItems.saleId, saleId));

  return { ...sale, items };
}

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error || !auth.session) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const deliveryGuyIdParam = searchParams.get("deliveryGuyId");
    const todayOnly = searchParams.get("today") === "true";

    const conditions = [];

    if (auth.session.role === "delivery") {
      conditions.push(eq(sales.deliveryGuyId, auth.session.id));
      conditions.push(gte(sales.saleDate, sevenDaysAgo()));
    }

    if (todayOnly) {
      const today = startOfToday();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      conditions.push(gte(sales.saleDate, today));
      conditions.push(lte(sales.saleDate, tomorrow));
    }

    if (dateFrom) {
      conditions.push(gte(sales.saleDate, new Date(dateFrom)));
    }

    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(sales.saleDate, end));
    }

    if (deliveryGuyIdParam && auth.session.role === "admin") {
      const deliveryGuyId = Number(deliveryGuyIdParam);
      if (Number.isInteger(deliveryGuyId) && deliveryGuyId > 0) {
        conditions.push(eq(sales.deliveryGuyId, deliveryGuyId));
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await getDb()
      .select({
        id: sales.id,
        deliveryGuyId: sales.deliveryGuyId,
        shopId: sales.shopId,
        saleDate: sales.saleDate,
        totalAmount: sales.totalAmount,
        notes: sales.notes,
        billPrinted: sales.billPrinted,
        createdAt: sales.createdAt,
        shopName: shops.name,
        deliveryGuyName: users.name,
      })
      .from(sales)
      .innerJoin(shops, eq(sales.shopId, shops.id))
      .innerJoin(users, eq(sales.deliveryGuyId, users.id))
      .where(whereClause)
      .orderBy(desc(sales.saleDate));

    return corsResponse({ sales: rows });
  } catch (error) {
    console.error("GET /api/sales failed:", error);
    return corsResponse({ error: "Failed to fetch sales" }, 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error || !auth.session) return auth.error;

  try {
    const body = await request.json();
    const input = validateSaleInput(body);
    if (!input) return corsResponse({ error: "Invalid sale data" }, 400);

    const db = getDb();
    let totalAmount = 0;
    const lineItems: Array<{
      productId: number;
      quantity: number;
      unitPrice: string;
    }> = [];

    const deliveryGuyId =
      auth.session.role === "admin" && body.deliveryGuyId
        ? Number(body.deliveryGuyId)
        : auth.session.id;

    if (!Number.isInteger(deliveryGuyId) || deliveryGuyId <= 0) {
      return corsResponse({ error: "Invalid delivery guy" }, 400);
    }

    const [shop] = await db
      .select({ id: shops.id, isActive: shops.isActive })
      .from(shops)
      .where(eq(shops.id, input.shopId))
      .limit(1);

    if (!shop) {
      return corsResponse({ error: "Shop not found" }, 400);
    }

    if (!shop.isActive) {
      return corsResponse({ error: "This shop is disabled" }, 400);
    }

    const saleDate = parseDateInput(input.saleDate.slice(0, 10)) ?? new Date();

    for (const item of input.items) {
      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, item.productId))
        .limit(1);

      if (!product) {
        return corsResponse(
          { error: `Product ${item.productId} not found` },
          400,
        );
      }

      if (!product.isActive) {
        return corsResponse(
          { error: `Product ${product.name} is disabled` },
          400,
        );
      }

      const remaining = await getRemainingStock(
        deliveryGuyId,
        item.productId,
        saleDate,
      );

      if (remaining < item.quantity) {
        return corsResponse(
          {
            error: `Not enough assigned stock for ${product.name}. Remaining: ${remaining}`,
          },
          400,
        );
      }

      const unitPrice = product.price;
      totalAmount += Number(unitPrice) * item.quantity;
      lineItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
      });
    }

    const [sale] = await db
      .insert(sales)
      .values({
        deliveryGuyId,
        shopId: input.shopId,
        saleDate: new Date(input.saleDate),
        totalAmount: totalAmount.toFixed(2),
        notes: input.notes,
      })
      .returning();

    for (const item of lineItems) {
      await db.insert(saleItems).values({
        saleId: sale.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      });
    }

    const fullSale = await getSaleWithDetails(sale.id);
    return corsResponse({ sale: fullSale }, 201);
  } catch (error) {
    console.error("POST /api/sales failed:", error);
    return corsResponse({ error: "Failed to create sale" }, 500);
  }
}
