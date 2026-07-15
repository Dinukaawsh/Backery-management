export type ProductInput = {
  name: string;
  description?: string | null;
  price: string;
  category: string;
  stockAvailable?: number;
  imageUrl?: string | null;
};

export type ShopInput = {
  name: string;
  ownerName: string;
  address: string;
  phone?: string | null;
  route?: string | null;
};

export type DeliveryGuyInput = {
  email: string;
  password: string;
  name: string;
  phone?: string | null;
};

export type SaleItemInput = {
  productId: number;
  quantity: number;
};

export type SaleInput = {
  shopId: number;
  saleDate: string;
  notes?: string | null;
  items: SaleItemInput[];
};

export function validateProductInput(body: unknown): ProductInput | null {
  if (!body || typeof body !== "object") return null;
  const data = body as Record<string, unknown>;

  if (typeof data.name !== "string" || !data.name.trim()) return null;
  if (typeof data.price !== "string" && typeof data.price !== "number") return null;

  const price = String(data.price);
  if (Number.isNaN(Number(price)) || Number(price) < 0) return null;

  const stockAvailable =
    typeof data.stockAvailable === "number"
      ? data.stockAvailable
      : typeof data.stockAvailable === "string"
        ? Number(data.stockAvailable)
        : 0;

  if (Number.isNaN(stockAvailable) || stockAvailable < 0) return null;

  if (typeof data.category !== "string" || !data.category.trim()) return null;

  return {
    name: data.name.trim(),
    description:
      typeof data.description === "string" ? data.description.trim() : null,
    price,
    category: data.category.trim().replace(/\s+/g, " "),
    stockAvailable,
    imageUrl:
      typeof data.imageUrl === "string" && data.imageUrl.trim()
        ? data.imageUrl.trim()
        : null,
  };
}

export function validateShopInput(body: unknown): ShopInput | null {
  if (!body || typeof body !== "object") return null;
  const data = body as Record<string, unknown>;

  if (typeof data.name !== "string" || !data.name.trim()) return null;
  if (typeof data.ownerName !== "string" || !data.ownerName.trim()) return null;
  if (typeof data.address !== "string" || !data.address.trim()) return null;

  return {
    name: data.name.trim(),
    ownerName: data.ownerName.trim(),
    address: data.address.trim(),
    phone: typeof data.phone === "string" ? data.phone.trim() : null,
    route:
      typeof data.route === "string" && data.route.trim()
        ? data.route.trim().replace(/\s+/g, " ")
        : null,
  };
}

export function validateDeliveryGuyInput(body: unknown): DeliveryGuyInput | null {
  if (!body || typeof body !== "object") return null;
  const data = body as Record<string, unknown>;

  if (typeof data.email !== "string" || !data.email.trim()) return null;
  if (typeof data.password !== "string" || data.password.length < 6) return null;
  if (typeof data.name !== "string" || !data.name.trim()) return null;

  return {
    email: data.email.trim().toLowerCase(),
    password: data.password,
    name: data.name.trim(),
    phone: typeof data.phone === "string" ? data.phone.trim() : null,
  };
}

export function validateSaleInput(body: unknown): SaleInput | null {
  if (!body || typeof body !== "object") return null;
  const data = body as Record<string, unknown>;

  const shopId = Number(data.shopId);
  if (!Number.isInteger(shopId) || shopId <= 0) return null;
  if (typeof data.saleDate !== "string" || !data.saleDate.trim()) return null;
  if (!Array.isArray(data.items) || data.items.length === 0) return null;

  const items: SaleItemInput[] = [];

  for (const item of data.items) {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    const productId = Number(row.productId);
    const quantity = Number(row.quantity);

    if (!Number.isInteger(productId) || productId <= 0) return null;
    if (!Number.isInteger(quantity) || quantity <= 0) return null;

    items.push({ productId, quantity });
  }

  return {
    shopId,
    saleDate: data.saleDate.trim(),
    notes: typeof data.notes === "string" ? data.notes.trim() : null,
    items,
  };
}
