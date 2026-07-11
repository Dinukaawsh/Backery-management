import { asc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { productCategories, products } from "@/db/schema";

function normalizeCategoryName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

export async function syncCategoriesFromProducts() {
  const db = getDb();
  const rows = await db
    .select({ category: products.category })
    .from(products)
    .groupBy(products.category);

  for (const row of rows) {
    const name = normalizeCategoryName(row.category);
    if (!name) continue;

    await db
      .insert(productCategories)
      .values({ name })
      .onConflictDoNothing({ target: productCategories.name });
  }
}

export async function listProductCategories() {
  const db = getDb();
  await syncCategoriesFromProducts();

  return db
    .select({
      id: productCategories.id,
      name: productCategories.name,
      createdAt: productCategories.createdAt,
    })
    .from(productCategories)
    .orderBy(asc(productCategories.name));
}

export async function upsertProductCategory(name: string) {
  const normalized = normalizeCategoryName(name);
  if (!normalized) {
    throw new Error("Category is required");
  }

  const db = getDb();
  const [existing] = await db
    .select({ id: productCategories.id })
    .from(productCategories)
    .where(eq(productCategories.name, normalized))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(productCategories)
    .values({ name: normalized })
    .returning({ id: productCategories.id });

  return created;
}

export async function renameProductCategory(oldName: string, newName: string) {
  const from = normalizeCategoryName(oldName);
  const to = normalizeCategoryName(newName);

  if (!from || !to) {
    throw new Error("Category name is required");
  }

  if (from.toLowerCase() === to.toLowerCase()) {
    return listProductCategories();
  }

  const db = getDb();

  const [target] = await db
    .select({ id: productCategories.id })
    .from(productCategories)
    .where(eq(productCategories.name, to))
    .limit(1);

  if (target) {
    throw new Error("A category with that name already exists");
  }

  const [source] = await db
    .select({ id: productCategories.id })
    .from(productCategories)
    .where(eq(productCategories.name, from))
    .limit(1);

  if (!source) {
    throw new Error("Category not found");
  }

  await db.update(products).set({ category: to }).where(eq(products.category, from));

  await db
    .update(productCategories)
    .set({ name: to })
    .where(eq(productCategories.id, source.id));

  return listProductCategories();
}
