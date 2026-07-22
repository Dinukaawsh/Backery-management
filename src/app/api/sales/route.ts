import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "@/db";
import {
  products,
  saleItems,
  saleReturns,
  sales,
  shops,
  users,
} from "@/db/schema";
import { getRemainingStock } from "@/lib/allocations";
import { requireAuth } from "@/lib/api-auth";
import { corsOptionsResponse, corsResponse } from "@/lib/cors";
import {
  localDateString,
  parseDateInput,
  parseSaleTimestamp,
  sevenDaysAgo,
} from "@/lib/dates";
import { formatMoney, parseMoney } from "@/lib/money";
import { notifyAdmins } from "@/lib/notifications";
import {
  getReturnsBySaleIds,
  getSaleWithDetails,
  saleAmountDue,
} from "@/lib/sales";
import { getShopReturnableQty } from "@/lib/shop-returns";
import { validateSaleInput } from "@/lib/validators";

function startOfToday() {
  return parseDateInput(localDateString())!;
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
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
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
        previousBalance: sales.previousBalance,
        paidAmount: sales.paidAmount,
        remainingAfter: sales.remainingAfter,
        returnsAmount: sales.returnsAmount,
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
      .where(whereClause)
      .orderBy(desc(sales.saleDate));

    const saleIds = rows.map((row) => row.id);
    const itemRows =
      saleIds.length === 0
        ? []
        : await getDb()
            .select({
              id: saleItems.id,
              saleId: saleItems.saleId,
              productId: saleItems.productId,
              quantity: saleItems.quantity,
              unitPrice: saleItems.unitPrice,
              productName: products.name,
              productImageUrl: products.imageUrl,
            })
            .from(saleItems)
            .innerJoin(products, eq(saleItems.productId, products.id))
            .where(inArray(saleItems.saleId, saleIds));

    const returnRows = await getReturnsBySaleIds(saleIds);

    const itemsBySale = new Map<number, typeof itemRows>();
    for (const item of itemRows) {
      const list = itemsBySale.get(item.saleId) ?? [];
      list.push(item);
      itemsBySale.set(item.saleId, list);
    }

    const returnsBySale = new Map<number, typeof returnRows>();
    for (const item of returnRows) {
      const list = returnsBySale.get(item.saleId) ?? [];
      list.push(item);
      returnsBySale.set(item.saleId, list);
    }

    return corsResponse({
      sales: rows.map((row) => {
        const previousBalance = parseMoney(row.previousBalance);
        const totalAmount = parseMoney(row.totalAmount);
        const returnsAmount = parseMoney(row.returnsAmount);
        return {
          ...row,
          items: (itemsBySale.get(row.id) ?? []).map(
            ({ saleId: _saleId, ...item }) => item,
          ),
          returns: (returnsBySale.get(row.id) ?? []).map(
            ({ saleId: _saleId, ...item }) => item,
          ),
          returnsAmount: formatMoney(returnsAmount),
          amountDue: formatMoney(
            saleAmountDue(previousBalance, totalAmount, returnsAmount),
          ),
          netToday: formatMoney(totalAmount - returnsAmount),
        };
      }),
    });
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
    let returnsTotal = 0;
    const lineItems: Array<{
      productId: number;
      quantity: number;
      unitPrice: string;
    }> = [];
    const returnItems: Array<{
      productId: number;
      quantity: number;
      unitPrice: string;
    }> = [];

    const deliveryGuyId =
      auth.session.role === "admin" && body.deliveryGuyId
        ? Number(body.deliveryGuyId)
        : auth.session.id;

    if (!Number.isInteger(deliveryGuyId) || deliveryGuyId <= 0) {
      return corsResponse({ error: "Invalid delivery partner" }, 400);
    }

    const [shop] = await db
      .select({
        id: shops.id,
        isActive: shops.isActive,
        outstandingBalance: shops.outstandingBalance,
      })
      .from(shops)
      .where(eq(shops.id, input.shopId))
      .limit(1);

    if (!shop) {
      return corsResponse({ error: "Shop not found" }, 400);
    }

    if (!shop.isActive) {
      return corsResponse({ error: "This shop is disabled" }, 400);
    }

    const saleDay =
      parseDateInput(input.saleDate.slice(0, 10)) ??
      parseDateInput(localDateString())!;

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
        saleDay,
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

    for (const item of input.returns ?? []) {
      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, item.productId))
        .limit(1);

      if (!product) {
        return corsResponse(
          { error: `Return product ${item.productId} not found` },
          400,
        );
      }

      const returnable = await getShopReturnableQty(
        input.shopId,
        item.productId,
      );
      if (returnable <= 0) {
        return corsResponse(
          {
            error: `${product.name} was never dropped at this shop, so it cannot be returned.`,
          },
          400,
        );
      }
      if (item.quantity > returnable) {
        return corsResponse(
          {
            error: `Cannot return ${item.quantity} × ${product.name}. Only ${returnable} left returnable at this shop.`,
          },
          400,
        );
      }

      const unitPrice = product.price;
      returnsTotal += Number(unitPrice) * item.quantity;
      returnItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
      });
    }

    const previousBalance = parseMoney(shop.outstandingBalance);
    const todayTotal = parseMoney(totalAmount);
    const returnsAmount = parseMoney(returnsTotal);
    const amountDue = saleAmountDue(previousBalance, todayTotal, returnsAmount);

    let paidAmount = 0;
    if (body.paidAmount !== undefined && body.paidAmount !== null) {
      paidAmount = parseMoney(body.paidAmount);
      if (paidAmount < 0) {
        return corsResponse({ error: "Paid amount cannot be negative" }, 400);
      }
      if (paidAmount > amountDue) {
        paidAmount = amountDue;
      }
    }

    const remainingAfter = parseMoney(amountDue - paidAmount);

    const [sale] = await db
      .insert(sales)
      .values({
        deliveryGuyId,
        shopId: input.shopId,
        saleDate: parseSaleTimestamp(input.saleDate),
        totalAmount: formatMoney(todayTotal),
        previousBalance: formatMoney(previousBalance),
        paidAmount: formatMoney(paidAmount),
        remainingAfter: formatMoney(remainingAfter),
        returnsAmount: formatMoney(returnsAmount),
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

    for (const item of returnItems) {
      await db.insert(saleReturns).values({
        saleId: sale.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      });
    }

    await db
      .update(shops)
      .set({ outstandingBalance: formatMoney(remainingAfter) })
      .where(eq(shops.id, input.shopId));

    const fullSale = await getSaleWithDetails(sale.id);

    try {
      const itemSummary = (fullSale?.items ?? [])
        .map((item) => `${item.productName} × ${item.quantity}`)
        .join(", ");
      const lossNote =
        returnsAmount > 0
          ? ` · returns/loss ${formatMoney(returnsAmount)}`
          : "";
      await notifyAdmins({
        type: "sale",
        title: "New sale recorded",
        body: `${fullSale?.deliveryGuyName ?? "Partner"} → ${fullSale?.shopName ?? "Shop"} · ${formatMoney(todayTotal)}${lossNote}${itemSummary ? ` · ${itemSummary}` : ""}`,
        href: "/sales",
      });
    } catch (notifyError) {
      console.error("Failed to create sale notification:", notifyError);
    }

    return corsResponse({ sale: fullSale }, 201);
  } catch (error) {
    console.error("POST /api/sales failed:", error);
    return corsResponse({ error: "Failed to create sale" }, 500);
  }
}
