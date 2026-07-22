import { eq, inArray } from "drizzle-orm";

import { getDb } from "@/db";
import { products, saleItems, saleReturns, sales, shops, users } from "@/db/schema";
import { formatMoney, parseMoney } from "@/lib/money";

export function saleAmountDue(
  previousBalance: number,
  totalAmount: number,
  returnsAmount: number,
) {
  return parseMoney(previousBalance + totalAmount - returnsAmount);
}

export function saleNetToday(totalAmount: number, returnsAmount: number) {
  return parseMoney(totalAmount - returnsAmount);
}

export async function getSaleWithDetails(saleId: number) {
  const [sale] = await getDb()
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
      productImageUrl: products.imageUrl,
    })
    .from(saleItems)
    .innerJoin(products, eq(saleItems.productId, products.id))
    .where(eq(saleItems.saleId, saleId));

  const returns = await getDb()
    .select({
      id: saleReturns.id,
      productId: saleReturns.productId,
      quantity: saleReturns.quantity,
      unitPrice: saleReturns.unitPrice,
      productName: products.name,
      productImageUrl: products.imageUrl,
    })
    .from(saleReturns)
    .innerJoin(products, eq(saleReturns.productId, products.id))
    .where(eq(saleReturns.saleId, saleId));

  const previousBalance = parseMoney(sale.previousBalance);
  const totalAmount = parseMoney(sale.totalAmount);
  const returnsAmount = parseMoney(sale.returnsAmount);
  const paidAmount = parseMoney(sale.paidAmount);
  const amountDue = saleAmountDue(previousBalance, totalAmount, returnsAmount);
  const netToday = saleNetToday(totalAmount, returnsAmount);

  return {
    ...sale,
    items,
    returns,
    amountDue: formatMoney(amountDue),
    netToday: formatMoney(netToday),
    paidAmount: formatMoney(paidAmount),
    previousBalance: formatMoney(previousBalance),
    returnsAmount: formatMoney(returnsAmount),
    remainingAfter: formatMoney(parseMoney(sale.remainingAfter)),
  };
}

export async function getReturnsBySaleIds(saleIds: number[]) {
  if (saleIds.length === 0) return [];

  return getDb()
    .select({
      id: saleReturns.id,
      saleId: saleReturns.saleId,
      productId: saleReturns.productId,
      quantity: saleReturns.quantity,
      unitPrice: saleReturns.unitPrice,
      productName: products.name,
      productImageUrl: products.imageUrl,
    })
    .from(saleReturns)
    .innerJoin(products, eq(saleReturns.productId, products.id))
    .where(inArray(saleReturns.saleId, saleIds));
}
