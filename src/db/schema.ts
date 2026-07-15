import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["admin", "delivery"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  imageUrl: text("image_url"),
  role: userRoleEnum("role").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(),
  stockAvailable: integer("stock_available").notNull().default(0),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const productCategories = pgTable("product_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const shops = pgTable("shops", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ownerName: text("owner_name").notNull(),
  address: text("address").notNull(),
  phone: text("phone"),
  route: text("route"),
  outstandingBalance: numeric("outstanding_balance", {
    precision: 10,
    scale: 2,
  })
    .notNull()
    .default("0.00"),
  isActive: boolean("is_active").notNull().default(true),
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  deliveryGuyId: integer("delivery_guy_id")
    .notNull()
    .references(() => users.id),
  shopId: integer("shop_id")
    .notNull()
    .references(() => shops.id),
  saleDate: timestamp("sale_date").notNull(),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  previousBalance: numeric("previous_balance", { precision: 10, scale: 2 })
    .notNull()
    .default("0.00"),
  paidAmount: numeric("paid_amount", { precision: 10, scale: 2 })
    .notNull()
    .default("0.00"),
  remainingAfter: numeric("remaining_after", { precision: 10, scale: 2 })
    .notNull()
    .default("0.00"),
  notes: text("notes"),
  billPrinted: boolean("bill_printed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const saleItems = pgTable("sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id")
    .notNull()
    .references(() => sales.id, { onDelete: "cascade" }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
});

export const deliveryAllocations = pgTable("delivery_allocations", {
  id: serial("id").primaryKey(),
  deliveryGuyId: integer("delivery_guy_id")
    .notNull()
    .references(() => users.id),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  quantity: integer("quantity").notNull(),
  allocationDate: timestamp("allocation_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notificationTypeEnum = pgEnum("notification_type", [
  "sale",
  "assignment",
]);

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  href: text("href"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const businessSettings = pgTable("business_settings", {
  id: integer("id").primaryKey().default(1),
  businessName: text("business_name").notNull().default("Bakery"),
  address: text("address").notNull().default(""),
  phone: text("phone").notNull().default(""),
  email: text("email"),
  ownerName: text("owner_name"),
  appDownloadUsername: text("app_download_username"),
  appDownloadPasswordHash: text("app_download_password_hash"),
  appDownloadUrl: text("app_download_url"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type BusinessSettings = typeof businessSettings.$inferSelect;
export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductCategory = typeof productCategories.$inferSelect;
export type Shop = typeof shops.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type SaleItem = typeof saleItems.$inferSelect;
export type DeliveryAllocation = typeof deliveryAllocations.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
