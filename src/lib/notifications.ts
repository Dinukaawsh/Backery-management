import { and, desc, eq, gte, lt, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { notifications, users } from "@/db/schema";
import { sevenDaysAgo } from "@/lib/dates";

export type NotificationType = "sale" | "assignment";

export async function notifyAdmins(input: {
  type: NotificationType;
  title: string;
  body: string;
  href?: string | null;
}) {
  const db = getDb();
  const admins = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.isActive, true)));

  if (admins.length === 0) return;

  await db.insert(notifications).values(
    admins.map((admin) => ({
      userId: admin.id,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href ?? null,
    })),
  );
}

export async function notifyUser(input: {
  userId: number;
  type: NotificationType;
  title: string;
  body: string;
  href?: string | null;
}) {
  const db = getDb();
  await db.insert(notifications).values({
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    href: input.href ?? null,
  });
}

/** Drop delivery notifications older than 7 Sri Lanka calendar days. */
export async function purgeExpiredDeliveryNotifications(userId: number) {
  const db = getDb();
  await db
    .delete(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        lt(notifications.createdAt, sevenDaysAgo()),
      ),
    );
}

export async function listNotifications(input: {
  userId: number;
  role: "admin" | "delivery";
  page?: number;
  limit?: number;
}) {
  const db = getDb();
  const page = Math.max(1, input.page ?? 1);
  const limit = Math.min(50, Math.max(1, input.limit ?? 20));
  const offset = (page - 1) * limit;

  if (input.role === "delivery") {
    await purgeExpiredDeliveryNotifications(input.userId);
  }

  const conditions = [eq(notifications.userId, input.userId)];
  if (input.role === "delivery") {
    conditions.push(gte(notifications.createdAt, sevenDaysAgo()));
  }

  const whereClause = and(...conditions);

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(whereClause);

  const rows = await db
    .select()
    .from(notifications)
    .where(whereClause)
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset(offset);

  const [unreadRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(...conditions, eq(notifications.isRead, false)));

  return {
    notifications: rows,
    page,
    limit,
    total: Number(countRow?.count ?? 0),
    unreadCount: Number(unreadRow?.count ?? 0),
  };
}

export async function markNotificationsRead(input: {
  userId: number;
  ids?: number[];
  all?: boolean;
}) {
  const db = getDb();

  if (input.all) {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(eq(notifications.userId, input.userId), eq(notifications.isRead, false)),
      );
    return;
  }

  if (!input.ids?.length) return;

  for (const id of input.ids) {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, input.userId)));
  }
}
