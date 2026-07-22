import { and, eq, gte, inArray, lte } from "drizzle-orm";

import { getDb } from "@/db";
import { products, saleItems, sales, shops, users } from "@/db/schema";
import { dayRange, localDateString, parseDateInput } from "@/lib/dates";

export type ShopDropItem = {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: string;
};

export type ShopDropSale = {
  id: number;
  saleDate: string;
  totalAmount: string;
  returnsAmount: string;
  billPrinted: boolean;
  items: ShopDropItem[];
};

export type ShopDropSummary = {
  shopId: number;
  shopName: string;
  shopOwner: string;
  shopAddress: string;
  deliveryGuyId: number;
  deliveryGuyName: string;
  dropDate: string;
  totalQuantity: number;
  totalAmount: string;
  returnsAmount: string;
  saleCount: number;
  items: ShopDropItem[];
  sales: ShopDropSale[];
};

/** Calendar day key in Sri Lanka business time (Asia/Colombo). */
function toDayKey(date: Date) {
  return localDateString(date);
}

export async function getShopDrops(params: {
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  deliveryGuyId?: number;
  shopId?: number;
}) {
  const conditions = [];

  if (params.date) {
    const parsed = parseDateInput(params.date);
    if (!parsed) {
      throw new Error("Invalid date");
    }
    const { start, end } = dayRange(parsed);
    conditions.push(gte(sales.saleDate, start), lte(sales.saleDate, end));
  } else if (params.dateFrom || params.dateTo) {
    const from = params.dateFrom ? parseDateInput(params.dateFrom) : null;
    const to = params.dateTo ? parseDateInput(params.dateTo) : null;
    if (params.dateFrom && !from) throw new Error("Invalid dateFrom");
    if (params.dateTo && !to) throw new Error("Invalid dateTo");

    if (from) {
      const { start } = dayRange(from);
      conditions.push(gte(sales.saleDate, start));
    }
    if (to) {
      const { end } = dayRange(to);
      conditions.push(lte(sales.saleDate, end));
    }
  }
  // No date filters → return all drops.

  if (params.deliveryGuyId) {
    conditions.push(eq(sales.deliveryGuyId, params.deliveryGuyId));
  }
  if (params.shopId) {
    conditions.push(eq(sales.shopId, params.shopId));
  }

  const salesRows = await getDb()
    .select({
      saleId: sales.id,
      shopId: sales.shopId,
      shopName: shops.name,
      shopOwner: shops.ownerName,
      shopAddress: shops.address,
      deliveryGuyId: sales.deliveryGuyId,
      deliveryGuyName: users.name,
      saleDate: sales.saleDate,
      totalAmount: sales.totalAmount,
      returnsAmount: sales.returnsAmount,
      billPrinted: sales.billPrinted,
    })
    .from(sales)
    .innerJoin(shops, eq(sales.shopId, shops.id))
    .innerJoin(users, eq(sales.deliveryGuyId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sales.saleDate);

  if (salesRows.length === 0) {
    return [] as ShopDropSummary[];
  }

  const saleIds = salesRows.map((row) => row.saleId);
  const itemRows = await getDb()
    .select({
      saleId: saleItems.saleId,
      productId: saleItems.productId,
      productName: products.name,
      quantity: saleItems.quantity,
      unitPrice: saleItems.unitPrice,
    })
    .from(saleItems)
    .innerJoin(products, eq(saleItems.productId, products.id))
    .where(inArray(saleItems.saleId, saleIds));

  const itemsBySale = new Map<number, ShopDropItem[]>();
  for (const item of itemRows) {
    const list = itemsBySale.get(item.saleId) ?? [];
    list.push({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    });
    itemsBySale.set(item.saleId, list);
  }

  const grouped = new Map<string, ShopDropSummary>();

  for (const sale of salesRows) {
    const dropDate = toDayKey(new Date(sale.saleDate));
    const key = `${sale.shopId}-${sale.deliveryGuyId}-${dropDate}`;
    const saleItemsList = itemsBySale.get(sale.saleId) ?? [];
    const saleQty = saleItemsList.reduce((sum, item) => sum + item.quantity, 0);
    const saleEntry: ShopDropSale = {
      id: sale.saleId,
      saleDate: new Date(sale.saleDate).toISOString(),
      totalAmount: sale.totalAmount,
      returnsAmount: sale.returnsAmount ?? "0.00",
      billPrinted: sale.billPrinted,
      items: [...saleItemsList],
    };

    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, {
        shopId: sale.shopId,
        shopName: sale.shopName,
        shopOwner: sale.shopOwner,
        shopAddress: sale.shopAddress,
        deliveryGuyId: sale.deliveryGuyId,
        deliveryGuyName: sale.deliveryGuyName,
        dropDate,
        totalQuantity: saleQty,
        totalAmount: sale.totalAmount,
        returnsAmount: sale.returnsAmount ?? "0.00",
        saleCount: 1,
        items: [...saleItemsList],
        sales: [saleEntry],
      });
      continue;
    }

    existing.totalQuantity += saleQty;
    existing.totalAmount = String(
      Number(existing.totalAmount) + Number(sale.totalAmount),
    );
    existing.returnsAmount = String(
      Number(existing.returnsAmount) + Number(sale.returnsAmount ?? 0),
    );
    existing.saleCount += 1;
    existing.sales.push(saleEntry);

    for (const item of saleItemsList) {
      const match = existing.items.find(
        (entry) => entry.productId === item.productId,
      );
      if (match) {
        match.quantity += item.quantity;
      } else {
        existing.items.push({ ...item });
      }
    }
  }

  return Array.from(grouped.values()).sort((a, b) => {
    if (a.dropDate !== b.dropDate) {
      return b.dropDate.localeCompare(a.dropDate);
    }
    if (a.shopName !== b.shopName) {
      return a.shopName.localeCompare(b.shopName);
    }
    return a.deliveryGuyName.localeCompare(b.deliveryGuyName);
  });
}
