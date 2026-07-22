import { and, eq, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { products, saleItems, saleReturns, sales } from "@/db/schema";

export type ShopReturnableProduct = {
  productId: number;
  productName: string;
  productPrice: string;
  productDescription: string | null;
  productCategory: string;
  productImageUrl: string | null;
  isActive: boolean;
  dropped: number;
  returned: number;
  returnable: number;
};

/** Net returnable qty per product for a shop (lifetime drops − lifetime returns). */
export async function getShopReturnableProducts(
  shopId: number,
): Promise<ShopReturnableProduct[]> {
  const db = getDb();

  const droppedRows = await db
    .select({
      productId: saleItems.productId,
      productName: products.name,
      productPrice: products.price,
      productDescription: products.description,
      productCategory: products.category,
      productImageUrl: products.imageUrl,
      isActive: products.isActive,
      dropped: sql<number>`coalesce(sum(${saleItems.quantity}), 0)`,
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .innerJoin(products, eq(saleItems.productId, products.id))
    .where(eq(sales.shopId, shopId))
    .groupBy(
      saleItems.productId,
      products.name,
      products.price,
      products.description,
      products.category,
      products.imageUrl,
      products.isActive,
    );

  const returnedRows = await db
    .select({
      productId: saleReturns.productId,
      returned: sql<number>`coalesce(sum(${saleReturns.quantity}), 0)`,
    })
    .from(saleReturns)
    .innerJoin(sales, eq(saleReturns.saleId, sales.id))
    .where(eq(sales.shopId, shopId))
    .groupBy(saleReturns.productId);

  const returnedMap = new Map(
    returnedRows.map((row) => [row.productId, Number(row.returned)]),
  );

  return droppedRows
    .map((row) => {
      const dropped = Number(row.dropped);
      const returned = returnedMap.get(row.productId) ?? 0;
      const returnable = Math.max(0, dropped - returned);
      return {
        productId: row.productId,
        productName: row.productName,
        productPrice: row.productPrice,
        productDescription: row.productDescription,
        productCategory: row.productCategory,
        productImageUrl: row.productImageUrl,
        isActive: row.isActive,
        dropped,
        returned,
        returnable,
      };
    })
    .filter((row) => row.dropped > 0)
    .sort((a, b) => a.productName.localeCompare(b.productName));
}

export async function getShopReturnableQty(
  shopId: number,
  productId: number,
): Promise<number> {
  const db = getDb();

  const [droppedRow] = await db
    .select({
      dropped: sql<number>`coalesce(sum(${saleItems.quantity}), 0)`,
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(and(eq(sales.shopId, shopId), eq(saleItems.productId, productId)));

  const [returnedRow] = await db
    .select({
      returned: sql<number>`coalesce(sum(${saleReturns.quantity}), 0)`,
    })
    .from(saleReturns)
    .innerJoin(sales, eq(saleReturns.saleId, sales.id))
    .where(
      and(eq(sales.shopId, shopId), eq(saleReturns.productId, productId)),
    );

  const dropped = Number(droppedRow?.dropped ?? 0);
  const returned = Number(returnedRow?.returned ?? 0);
  return Math.max(0, dropped - returned);
}
