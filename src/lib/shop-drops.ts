import { and, eq, gte, inArray, lte } from "drizzle-orm";

import { getDb } from "@/db";
import { products, saleItems, sales, shops, users } from "@/db/schema";
import { dayRange, parseDateInput, todayRange } from "@/lib/dates";

export type ShopDropItem = {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: string;
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
  items: ShopDropItem[];
};

function toDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function getShopDrops(params: {
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  deliveryGuyId?: number;
  shopId?: number;
}) {
  let start: Date;
  let end: Date;

  if (params.date) {
    const parsed = parseDateInput(params.date);
    if (!parsed) {
      throw new Error("Invalid date");
    }
    ({ start, end } = dayRange(parsed));
  } else if (params.dateFrom || params.dateTo) {
    const from = params.dateFrom ? parseDateInput(params.dateFrom) : null;
    const to = params.dateTo ? parseDateInput(params.dateTo) : null;
    if (params.dateFrom && !from) throw new Error("Invalid dateFrom");
    if (params.dateTo && !to) throw new Error("Invalid dateTo");

    start = from ?? new Date(0);
    start.setHours(0, 0, 0, 0);
    if (to) {
      ({ end } = dayRange(to));
    } else {
      end = new Date();
      end.setHours(23, 59, 59, 999);
    }
  } else {
    ({ start, end } = todayRange());
  }

  const conditions = [gte(sales.saleDate, start), lte(sales.saleDate, end)];

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
    })
    .from(sales)
    .innerJoin(shops, eq(sales.shopId, shops.id))
    .innerJoin(users, eq(sales.deliveryGuyId, users.id))
    .where(and(...conditions))
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
        items: [...saleItemsList],
      });
      continue;
    }

    existing.totalQuantity += saleQty;
    existing.totalAmount = String(
      Number(existing.totalAmount) + Number(sale.totalAmount),
    );

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
