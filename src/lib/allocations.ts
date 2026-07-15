import { and, eq, gte, lt, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  deliveryAllocations,
  products,
  saleItems,
  sales,
  users,
} from "@/db/schema";
import { dayRange } from "@/lib/dates";

export async function getAllocatedByProduct(
  deliveryGuyId: number,
  start: Date,
  end: Date,
) {
  const rows = await getDb()
    .select({
      productId: deliveryAllocations.productId,
      total: sql<number>`coalesce(sum(${deliveryAllocations.quantity}), 0)`,
    })
    .from(deliveryAllocations)
    .where(
      and(
        eq(deliveryAllocations.deliveryGuyId, deliveryGuyId),
        gte(deliveryAllocations.allocationDate, start),
        lt(deliveryAllocations.allocationDate, end),
      ),
    )
    .groupBy(deliveryAllocations.productId);

  return new Map(rows.map((row) => [row.productId, Number(row.total)]));
}

export async function getSoldByProduct(
  deliveryGuyId: number,
  start: Date,
  end: Date,
) {
  const rows = await getDb()
    .select({
      productId: saleItems.productId,
      total: sql<number>`coalesce(sum(${saleItems.quantity}), 0)`,
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(
      and(
        eq(sales.deliveryGuyId, deliveryGuyId),
        gte(sales.saleDate, start),
        lt(sales.saleDate, end),
      ),
    )
    .groupBy(saleItems.productId);

  return new Map(rows.map((row) => [row.productId, Number(row.total)]));
}

export async function getRemainingStock(
  deliveryGuyId: number,
  productId: number,
  date: Date,
) {
  const { start, end } = dayRange(date);
  const allocated = await getAllocatedByProduct(deliveryGuyId, start, end);
  const sold = await getSoldByProduct(deliveryGuyId, start, end);
  const totalAllocated = allocated.get(productId) ?? 0;
  const totalSold = sold.get(productId) ?? 0;
  return Math.max(0, totalAllocated - totalSold);
}

export async function getAssignmentSummary(date: Date, deliveryGuyId?: number) {
  const { start, end } = dayRange(date);
  const db = getDb();

  const allocationConditions = [
    gte(deliveryAllocations.allocationDate, start),
    lt(deliveryAllocations.allocationDate, end),
  ];

  if (deliveryGuyId) {
    allocationConditions.push(eq(deliveryAllocations.deliveryGuyId, deliveryGuyId));
  }

  const allocations = await db
    .select({
      deliveryGuyId: deliveryAllocations.deliveryGuyId,
      deliveryGuyName: users.name,
      productId: deliveryAllocations.productId,
      productName: products.name,
      productDescription: products.description,
      productPrice: products.price,
      productCategory: products.category,
      productImageUrl: products.imageUrl,
      allocated: sql<number>`coalesce(sum(${deliveryAllocations.quantity}), 0)`,
    })
    .from(deliveryAllocations)
    .innerJoin(users, eq(deliveryAllocations.deliveryGuyId, users.id))
    .innerJoin(products, eq(deliveryAllocations.productId, products.id))
    .where(and(...allocationConditions))
    .groupBy(
      deliveryAllocations.deliveryGuyId,
      users.name,
      deliveryAllocations.productId,
      products.name,
      products.description,
      products.price,
      products.category,
      products.imageUrl,
    );

  const soldConditions = [
    gte(sales.saleDate, start),
    lt(sales.saleDate, end),
  ];

  if (deliveryGuyId) {
    soldConditions.push(eq(sales.deliveryGuyId, deliveryGuyId));
  }

  const soldRows = await db
    .select({
      deliveryGuyId: sales.deliveryGuyId,
      productId: saleItems.productId,
      sold: sql<number>`coalesce(sum(${saleItems.quantity}), 0)`,
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(and(...soldConditions))
    .groupBy(sales.deliveryGuyId, saleItems.productId);

  const soldMap = new Map<string, number>();
  for (const row of soldRows) {
    soldMap.set(`${row.deliveryGuyId}-${row.productId}`, Number(row.sold));
  }

  return allocations.map((row) => {
    const sold =
      soldMap.get(`${row.deliveryGuyId}-${row.productId}`) ?? 0;
    const allocated = Number(row.allocated);
    return {
      deliveryGuyId: row.deliveryGuyId,
      deliveryGuyName: row.deliveryGuyName,
      productId: row.productId,
      productName: row.productName,
      productDescription: row.productDescription,
      productPrice: row.productPrice,
      productCategory: row.productCategory,
      productImageUrl: row.productImageUrl,
      allocated,
      sold,
      remaining: Math.max(0, allocated - sold),
    };
  });
}
