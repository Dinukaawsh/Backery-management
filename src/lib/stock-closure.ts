import { and, eq, lt } from "drizzle-orm";

import { getDb } from "@/db";
import {
  deliveryAllocations,
  driverStockClosures,
  products,
  users,
} from "@/db/schema";
import { getAssignmentSummary } from "@/lib/allocations";
import { dayRange, localDateString, parseDateInput } from "@/lib/dates";

export type PendingUnsoldLine = {
  businessDate: string;
  productId: number;
  productName: string;
  quantity: number;
};

export type PendingDriverStock = {
  deliveryGuyId: number;
  deliveryGuyName: string;
  dates: string[];
  items: PendingUnsoldLine[];
  totalRemaining: number;
};

async function getClosedDateSet(deliveryGuyId: number) {
  const rows = await getDb()
    .select({ businessDate: driverStockClosures.businessDate })
    .from(driverStockClosures)
    .where(eq(driverStockClosures.deliveryGuyId, deliveryGuyId));

  return new Set(rows.map((row) => row.businessDate));
}

async function getPastAllocationDates(deliveryGuyId: number) {
  const today = localDateString();
  const todayStart = parseDateInput(today);
  if (!todayStart) return [];

  const rows = await getDb()
    .select({ allocationDate: deliveryAllocations.allocationDate })
    .from(deliveryAllocations)
    .where(
      and(
        eq(deliveryAllocations.deliveryGuyId, deliveryGuyId),
        lt(deliveryAllocations.allocationDate, todayStart),
      ),
    );

  const dateKeys = new Set<string>();
  for (const row of rows) {
    dateKeys.add(localDateString(row.allocationDate));
  }
  return [...dateKeys].sort();
}

/** Past business days with allocations that are not yet closed. */
export async function getUnclosedPastDates(deliveryGuyId: number) {
  const closed = await getClosedDateSet(deliveryGuyId);
  const pastDates = await getPastAllocationDates(deliveryGuyId);
  return pastDates.filter((dateKey) => !closed.has(dateKey));
}

export async function getPendingUnsoldForDriver(
  deliveryGuyId: number,
): Promise<PendingDriverStock | null> {
  const unclosedDates = await getUnclosedPastDates(deliveryGuyId);
  if (unclosedDates.length === 0) return null;

  const [partner] = await getDb()
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, deliveryGuyId))
    .limit(1);

  const items: PendingUnsoldLine[] = [];
  let totalRemaining = 0;

  for (const dateKey of unclosedDates) {
    const date = parseDateInput(dateKey);
    if (!date) continue;

    const summary = await getAssignmentSummary(date, deliveryGuyId);
    for (const row of summary) {
      if (row.remaining <= 0) continue;
      items.push({
        businessDate: dateKey,
        productId: row.productId,
        productName: row.productName,
        quantity: row.remaining,
      });
      totalRemaining += row.remaining;
    }
  }

  if (totalRemaining === 0) return null;

  return {
    deliveryGuyId,
    deliveryGuyName: partner?.name ?? `Partner #${deliveryGuyId}`,
    dates: unclosedDates,
    items,
    totalRemaining,
  };
}

export async function getAllPendingUnsold(): Promise<PendingDriverStock[]> {
  const today = localDateString();
  const todayStart = parseDateInput(today);
  if (!todayStart) return [];

  const partners = await getDb()
    .selectDistinct({ deliveryGuyId: deliveryAllocations.deliveryGuyId })
    .from(deliveryAllocations)
    .where(lt(deliveryAllocations.allocationDate, todayStart));

  const pending: PendingDriverStock[] = [];
  for (const row of partners) {
    const stock = await getPendingUnsoldForDriver(row.deliveryGuyId);
    if (stock) pending.push(stock);
  }

  return pending.sort((a, b) =>
    a.deliveryGuyName.localeCompare(b.deliveryGuyName),
  );
}

export async function driverHasPendingUnsold(deliveryGuyId: number) {
  const pending = await getPendingUnsoldForDriver(deliveryGuyId);
  return pending !== null;
}

/** Close past days and return unsold qty to bakery inventory. */
export async function resetDriverStock(
  deliveryGuyId: number,
  closedById: number,
) {
  const unclosedDates = await getUnclosedPastDates(deliveryGuyId);
  if (unclosedDates.length === 0) {
    return { returnedByProduct: [] as Array<{ productId: number; productName: string; quantity: number }>, datesClosed: [] as string[] };
  }

  const db = getDb();
  const returnTotals = new Map<
    number,
    { productName: string; quantity: number }
  >();

  for (const dateKey of unclosedDates) {
    const date = parseDateInput(dateKey);
    if (!date) continue;

    const summary = await getAssignmentSummary(date, deliveryGuyId);
    for (const row of summary) {
      if (row.remaining <= 0) continue;
      const existing = returnTotals.get(row.productId);
      if (existing) {
        existing.quantity += row.remaining;
      } else {
        returnTotals.set(row.productId, {
          productName: row.productName,
          quantity: row.remaining,
        });
      }
    }
  }

  for (const [productId, { quantity }] of returnTotals) {
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product) continue;

    await db
      .update(products)
      .set({ stockAvailable: product.stockAvailable + quantity })
      .where(eq(products.id, productId));
  }

  for (const dateKey of unclosedDates) {
    await db.insert(driverStockClosures).values({
      deliveryGuyId,
      businessDate: dateKey,
      closedById,
    });
  }

  return {
    returnedByProduct: [...returnTotals.entries()].map(
      ([productId, { productName, quantity }]) => ({
        productId,
        productName,
        quantity,
      }),
    ),
    datesClosed: unclosedDates,
  };
}
