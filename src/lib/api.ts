export type User = {
  id: number;
  email: string;
  name: string;
  role: "admin" | "delivery";
};

export type Product = {
  id: number;
  name: string;
  description: string | null;
  price: string;
  category: string;
  stockAvailable: number;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
};

export type ProductCategory = {
  id: number;
  name: string;
  createdAt: string;
};

export type Shop = {
  id: number;
  name: string;
  ownerName: string;
  address: string;
  phone: string | null;
  route: string | null;
  outstandingBalance: string;
  isActive: boolean;
  createdById?: number | null;
  createdAt: string;
  addedByName?: string | null;
  addedByRole?: "admin" | "delivery" | null;
};

export type ShopDropSale = {
  id: number;
  saleDate: string;
  totalAmount: string;
  returnsAmount?: string;
  billPrinted: boolean;
  items: Array<{
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: string;
  }>;
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
  returnsAmount?: string;
  saleCount: number;
  items: Array<{
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: string;
  }>;
  sales: ShopDropSale[];
};

export type DeliveryGuy = {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  imageUrl?: string | null;
  isActive: boolean;
  createdAt: string;
};

export type BusinessSettings = {
  businessName: string;
  address: string;
  phone: string;
  email: string | null;
  ownerName: string | null;
};

export type Sale = {
  id: number;
  deliveryGuyId: number;
  shopId: number;
  saleDate: string;
  totalAmount: string;
  previousBalance?: string;
  paidAmount?: string;
  remainingAfter?: string;
  returnsAmount?: string;
  netToday?: string;
  amountDue?: string;
  notes: string | null;
  billPrinted: boolean;
  createdAt: string;
  shopName: string;
  deliveryGuyName: string;
  shopOwner?: string;
  shopAddress?: string;
  shopPhone?: string | null;
  items?: Array<{
    id: number;
    productId: number;
    quantity: number;
    unitPrice: string;
    productName: string;
  }>;
  returns?: Array<{
    id: number;
    productId: number;
    quantity: number;
    unitPrice: string;
    productName: string;
  }>;
};

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error ?? "Request failed");
  }

  return data as T;
}

export async function login(email: string, password: string) {
  return apiFetch<{ user: User; token: string }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function logout() {
  return apiFetch<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
}

export async function getMe() {
  return apiFetch<{
    user: User;
    phone?: string | null;
    imageUrl?: string | null;
  }>("/api/auth/me");
}

export type AppNotification = {
  id: number;
  userId: number;
  type: "sale" | "assignment" | "chat";
  title: string;
  body: string;
  href: string | null;
  isRead: boolean;
  createdAt: string;
};

export async function fetchNotifications(params?: {
  page?: number;
  limit?: number;
}) {
  const search = new URLSearchParams();
  if (params?.page) search.set("page", String(params.page));
  if (params?.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  return apiFetch<{
    notifications: AppNotification[];
    page: number;
    limit: number;
    total: number;
    unreadCount: number;
  }>(`/api/notifications${qs ? `?${qs}` : ""}`);
}

export async function markNotificationsRead(input: {
  all?: boolean;
  ids?: number[];
}) {
  return apiFetch<{ ok: boolean }>("/api/notifications", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function getBusinessSettings() {
  const data = await apiFetch<{ settings: BusinessSettings }>(
    "/api/settings/business",
  );
  return data.settings;
}

export async function updateBusinessSettings(input: {
  businessName: string;
  address: string;
  phone: string;
  email?: string | null;
  ownerName?: string | null;
}) {
  const data = await apiFetch<{ settings: BusinessSettings }>(
    "/api/settings/business",
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
  return data.settings;
}

export type AppDownloadSettings = {
  username: string | null;
  hasPassword: boolean;
  downloadUrl: string | null;
  enabled: boolean;
  shareUrl: string;
};

export type AppDownloadPublicInfo = {
  businessName: string;
  enabled: boolean;
};

export async function getAppDownloadSettings() {
  const data = await apiFetch<{ settings: AppDownloadSettings }>(
    "/api/settings/app-download",
  );
  return data.settings;
}

export async function updateAppDownloadSettings(input: {
  username: string;
  password?: string;
  downloadUrl: string;
}) {
  const data = await apiFetch<{ settings: AppDownloadSettings }>(
    "/api/settings/app-download",
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
  return data.settings;
}

export async function getAppDownloadInfo() {
  const response = await fetch("/api/app-download/info");
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error ?? "Failed to load download info");
  }
  return data.info as AppDownloadPublicInfo;
}

export async function loginAppDownload(username: string, password: string) {
  const response = await fetch("/api/app-download/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error ?? "Login failed");
  }
  return data as { ok: boolean };
}

export async function updateProfile(input: {
  currentPassword?: string;
  email?: string;
  password?: string;
  name?: string;
  phone?: string;
  imageUrl?: string | null;
}) {
  return apiFetch<{
    user: User;
    token: string;
    phone?: string | null;
    imageUrl?: string | null;
  }>("/api/auth/profile", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function getDashboard(params?: {
  dateFrom?: string;
  dateTo?: string;
}) {
  const query = new URLSearchParams();
  if (params?.dateFrom) query.set("dateFrom", params.dateFrom);
  if (params?.dateTo) query.set("dateTo", params.dateTo);
  const suffix = query.toString() ? `?${query.toString()}` : "";

  return apiFetch<{
    stats: {
      periodSalesCount: number;
      periodSalesTotal: string;
      periodReturnsTotal: string;
      periodEstimatedLoss: string;
      periodNetSales: string;
      totalProducts: number;
      totalDeliveryGuys: number;
      totalShops: number;
    };
    recentSales: Sale[];
    dailySales: Array<{ day: string; total: string; count: number }>;
    topDeliveryGuys: Array<{ name: string; total: string; count: number }>;
    salesByShop: Array<{ name: string; total: string }>;
  }>(`/api/dashboard${suffix}`);
}

export async function fetchProducts() {
  const data = await apiFetch<{ products: Product[] }>("/api/products");
  return data.products;
}

export async function fetchProductCategories() {
  const data = await apiFetch<{ categories: ProductCategory[] }>(
    "/api/products/categories",
  );
  return data.categories;
}

export async function renameProductCategory(oldName: string, newName: string) {
  const data = await apiFetch<{ categories: ProductCategory[] }>(
    "/api/products/categories",
    {
      method: "PATCH",
      body: JSON.stringify({ oldName, newName }),
    },
  );
  return data.categories;
}

export async function createProduct(input: {
  name: string;
  description?: string;
  price: string;
  category: string;
  stockAvailable?: number;
  imageUrl?: string | null;
}) {
  const data = await apiFetch<{ product: Product }>("/api/products", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.product;
}

export async function updateProduct(
  id: number,
  input: Partial<{
    name: string;
    description?: string;
    price: string;
    category: string;
    stockAvailable?: number;
    imageUrl?: string | null;
    isActive: boolean;
  }>,
) {
  const data = await apiFetch<{ product: Product }>(`/api/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  return data.product;
}

export async function deleteProduct(id: number) {
  await apiFetch(`/api/products/${id}`, { method: "DELETE" });
}

export async function fetchDeliveryGuys() {
  const data = await apiFetch<{ deliveryGuys: DeliveryGuy[] }>(
    "/api/delivery-guys",
  );
  return data.deliveryGuys;
}

export async function createDeliveryGuy(input: {
  email: string;
  password: string;
  name: string;
  phone?: string;
}) {
  const data = await apiFetch<{ deliveryGuy: DeliveryGuy }>(
    "/api/delivery-guys",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return data.deliveryGuy;
}

export async function updateDeliveryGuy(
  id: number,
  input: Partial<{
    name: string;
    email: string;
    phone: string;
    password: string;
    imageUrl: string | null;
    isActive: boolean;
  }>,
) {
  const data = await apiFetch<{ deliveryGuy: DeliveryGuy }>(
    `/api/delivery-guys/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );
  return data.deliveryGuy;
}

export async function deleteDeliveryGuy(id: number) {
  await apiFetch(`/api/delivery-guys/${id}`, { method: "DELETE" });
}

export type AllocationSummary = {
  deliveryGuyId: number;
  deliveryGuyName: string;
  productId: number;
  productName: string;
  allocated: number;
  sold: number;
  remaining: number;
};

export type AllocationRecord = {
  id: number;
  deliveryGuyId: number;
  deliveryGuyName: string;
  productId: number;
  productName: string;
  quantity: number;
  allocationDate: string;
  createdAt: string;
};

export async function fetchAllocations(params?: {
  date?: string;
  deliveryGuyId?: number;
  historyDate?: string;
  historyDateFrom?: string;
  historyDateTo?: string;
}) {
  const search = new URLSearchParams();
  if (params?.date) search.set("date", params.date);
  if (params?.deliveryGuyId) {
    search.set("deliveryGuyId", String(params.deliveryGuyId));
  }
  if (params?.historyDate) search.set("historyDate", params.historyDate);
  if (params?.historyDateFrom) {
    search.set("historyDateFrom", params.historyDateFrom);
  }
  if (params?.historyDateTo) search.set("historyDateTo", params.historyDateTo);
  const query = search.toString();
  return apiFetch<{
    summary: AllocationSummary[];
    allocations: AllocationRecord[];
  }>(`/api/allocations${query ? `?${query}` : ""}`);
}

export async function createAllocation(input: {
  deliveryGuyId: number;
  allocationDate: string;
  items: Array<{ productId: number; quantity: number }>;
}) {
  return apiFetch<{
    allocations: AllocationRecord[];
    summary: AllocationSummary[];
  }>("/api/allocations", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteAllocation(id: number) {
  await apiFetch(`/api/allocations/${id}`, { method: "DELETE" });
}

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

export async function fetchPendingUnsoldStock() {
  const data = await apiFetch<{ pending: PendingDriverStock[] }>(
    "/api/stock-closures/pending",
  );
  return data.pending;
}

export async function resetDriverUnsoldStock(deliveryGuyId: number) {
  return apiFetch<{
    deliveryGuyId: number;
    deliveryGuyName: string;
    returnedByProduct: Array<{
      productId: number;
      productName: string;
      quantity: number;
    }>;
    datesClosed: string[];
  }>("/api/stock-closures", {
    method: "POST",
    body: JSON.stringify({ deliveryGuyId }),
  });
}

export async function fetchShops() {
  const data = await apiFetch<{ shops: Shop[] }>("/api/shops");
  return data.shops;
}

export async function createShop(input: {
  name: string;
  ownerName: string;
  address: string;
  phone?: string;
  route?: string | null;
}) {
  const data = await apiFetch<{ shop: Shop }>("/api/shops", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.shop;
}

export async function updateShop(
  id: number,
  input: Partial<{
    name: string;
    ownerName: string;
    address: string;
    phone: string;
    route: string | null;
    isActive: boolean;
  }>,
) {
  const data = await apiFetch<{ shop: Shop }>(`/api/shops/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  return data.shop;
}

export async function deleteShop(id: number) {
  await apiFetch(`/api/shops/${id}`, { method: "DELETE" });
}

export async function fetchShopDrops(params?: {
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  deliveryGuyId?: number;
  shopId?: number;
}) {
  const search = new URLSearchParams();
  if (params?.date) search.set("date", params.date);
  if (params?.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params?.dateTo) search.set("dateTo", params.dateTo);
  if (params?.deliveryGuyId) {
    search.set("deliveryGuyId", String(params.deliveryGuyId));
  }
  if (params?.shopId) search.set("shopId", String(params.shopId));

  const query = search.toString();
  const data = await apiFetch<{ drops: ShopDropSummary[] }>(
    `/api/shops/drops${query ? `?${query}` : ""}`,
  );
  return data.drops;
}

export async function fetchSales(params?: {
  dateFrom?: string;
  dateTo?: string;
  deliveryGuyId?: number;
  today?: boolean;
}) {
  const search = new URLSearchParams();
  if (params?.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params?.dateTo) search.set("dateTo", params.dateTo);
  if (params?.deliveryGuyId)
    search.set("deliveryGuyId", String(params.deliveryGuyId));
  if (params?.today) search.set("today", "true");

  const query = search.toString();
  const data = await apiFetch<{ sales: Sale[] }>(
    `/api/sales${query ? `?${query}` : ""}`,
  );
  return data.sales;
}

export async function getSale(id: number) {
  const data = await apiFetch<{ sale: Sale }>(`/api/sales/${id}`);
  return data.sale;
}

export async function markBillPrinted(id: number) {
  const data = await apiFetch<{ sale: Sale }>(`/api/sales/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ billPrinted: true }),
  });
  return data.sale;
}

export async function settleSalePayment(id: number, paidAmount: number) {
  const data = await apiFetch<{ sale: Sale }>(`/api/sales/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ paidAmount }),
  });
  return data.sale;
}

export async function createSale(input: {
  shopId: number;
  saleDate: string;
  notes?: string;
  deliveryGuyId?: number;
  items: Array<{ productId: number; quantity: number }>;
}) {
  const data = await apiFetch<{ sale: Sale }>("/api/sales", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.sale;
}

export type DeliveryLocationPin = {
  deliveryGuyId: number;
  name: string;
  phone: string | null;
  imageUrl: string | null;
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  isTracking: boolean;
  isLive: boolean;
  updatedAt: string;
};

export async function fetchDeliveryLocations() {
  const data = await apiFetch<{ locations: DeliveryLocationPin[] }>(
    "/api/locations",
  );
  return data.locations;
}

export type SaleComment = {
  id: number;
  saleId: number;
  userId: number;
  parentId: number | null;
  body: string;
  createdAt: string;
  updatedAt: string;
  isEdited: boolean;
  userName: string;
  userRole: "admin" | "delivery";
  userImageUrl: string | null;
  canEdit: boolean;
  canDelete: boolean;
  replies: SaleComment[];
};

export async function fetchSaleComments(saleId: number) {
  const data = await apiFetch<{ comments: SaleComment[] }>(
    `/api/sales/${saleId}/comments`,
  );
  return data.comments;
}

export async function createSaleComment(
  saleId: number,
  input: { body: string; parentId?: number | null },
) {
  const data = await apiFetch<{ comments: SaleComment[] }>(
    `/api/sales/${saleId}/comments`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return data.comments;
}

export async function updateSaleComment(commentId: number, body: string) {
  const data = await apiFetch<{ comments: SaleComment[] }>(
    `/api/comments/${commentId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ body }),
    },
  );
  return data.comments;
}

export async function deleteSaleComment(commentId: number) {
  const data = await apiFetch<{ comments: SaleComment[] }>(
    `/api/comments/${commentId}`,
    { method: "DELETE" },
  );
  return data.comments;
}

export type Conversation = {
  deliveryGuyId: number;
  deliveryGuyName: string;
  deliveryGuyImageUrl: string | null;
  deliveryGuyPhone?: string | null;
  lastMessage: string | null;
  lastMessageType?: "text" | "image" | "deleted" | null;
  lastMessageAt: string | null;
  unreadCount: number;
  isOnline?: boolean;
  lastSeenAt?: string | null;
};

export type ChatMessage = {
  id: number;
  deliveryGuyId: number;
  senderId: number;
  body: string;
  imageUrl?: string | null;
  isDeleted?: boolean;
  isRead: boolean;
  editedAt?: string | null;
  createdAt: string;
  senderName: string;
  senderRole: "admin" | "delivery";
  senderImageUrl: string | null;
  mine: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
};

export async function pingPresence() {
  await apiFetch<{ ok: boolean }>("/api/presence", { method: "POST" });
}

export async function fetchConversations() {
  const data = await apiFetch<{
    conversations: Conversation[];
    unreadCount: number;
  }>("/api/conversations");
  return data;
}

export async function fetchChatUnreadCount() {
  const data = await apiFetch<{ unreadCount: number }>(
    "/api/conversations?unreadOnly=true",
  );
  return data.unreadCount;
}

export async function fetchChatMessages(
  deliveryGuyId: number,
  options?: { afterId?: number; beforeId?: number; limit?: number },
) {
  const search = new URLSearchParams();
  if (options?.afterId != null) search.set("afterId", String(options.afterId));
  if (options?.beforeId != null) {
    search.set("beforeId", String(options.beforeId));
  }
  if (options?.limit != null) search.set("limit", String(options.limit));
  const query = search.toString();
  const data = await apiFetch<{ messages: ChatMessage[]; hasMore: boolean }>(
    `/api/conversations/${deliveryGuyId}${query ? `?${query}` : ""}`,
  );
  return data;
}

export async function sendChatMessage(
  deliveryGuyId: number,
  input: { body?: string; imageUrl?: string | null },
) {
  const data = await apiFetch<{ message: ChatMessage }>(
    `/api/conversations/${deliveryGuyId}`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return data.message;
}

export async function updateChatMessage(messageId: number, body: string) {
  const data = await apiFetch<{ message: ChatMessage }>(
    `/api/chat-messages/${messageId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ body }),
    },
  );
  return data.message;
}

export async function deleteChatMessage(messageId: number) {
  const data = await apiFetch<{ message: ChatMessage | null }>(
    `/api/chat-messages/${messageId}`,
    { method: "DELETE" },
  );
  return data.message;
}
