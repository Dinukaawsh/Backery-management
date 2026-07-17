import { and, asc, desc, eq, ne, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { chatMessages, users } from "@/db/schema";
import type { UserRole } from "@/lib/auth";
import { notifyAdmins, notifyUser } from "@/lib/notifications";

export type ChatMessageDto = {
  id: number;
  deliveryGuyId: number;
  senderId: number;
  body: string;
  imageUrl: string | null;
  isDeleted: boolean;
  isRead: boolean;
  editedAt: string | null;
  createdAt: string;
  senderName: string;
  senderRole: UserRole;
  senderImageUrl: string | null;
  mine: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

export type ConversationDto = {
  deliveryGuyId: number;
  deliveryGuyName: string;
  deliveryGuyImageUrl: string | null;
  deliveryGuyPhone: string | null;
  lastMessage: string | null;
  lastMessageType: "text" | "image" | "deleted" | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

function previewFromRow(row: {
  body: string;
  imageUrl: string | null;
  isDeleted: boolean;
}): { lastMessage: string | null; lastMessageType: ConversationDto["lastMessageType"] } {
  if (row.isDeleted) {
    return { lastMessage: null, lastMessageType: "deleted" };
  }
  if (row.imageUrl && !row.body.trim()) {
    return { lastMessage: null, lastMessageType: "image" };
  }
  if (row.imageUrl && row.body.trim()) {
    return { lastMessage: row.body.trim(), lastMessageType: "image" };
  }
  if (row.body.trim()) {
    return { lastMessage: row.body.trim(), lastMessageType: "text" };
  }
  return { lastMessage: null, lastMessageType: null };
}

function mapMessage(
  row: {
    id: number;
    deliveryGuyId: number;
    senderId: number;
    body: string;
    imageUrl: string | null;
    isDeleted: boolean;
    isRead: boolean;
    editedAt: Date | null;
    createdAt: Date;
    senderName: string;
    senderRole: UserRole;
    senderImageUrl: string | null;
  },
  viewerId: number,
): ChatMessageDto {
  const mine = row.senderId === viewerId;
  const isDeleted = row.isDeleted;
  return {
    id: row.id,
    deliveryGuyId: row.deliveryGuyId,
    senderId: row.senderId,
    body: isDeleted ? "" : row.body,
    imageUrl: isDeleted ? null : row.imageUrl,
    isDeleted,
    isRead: row.isRead,
    editedAt: row.editedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    senderName: row.senderName,
    senderRole: row.senderRole,
    senderImageUrl: row.senderImageUrl,
    mine,
    canEdit: mine && !isDeleted,
    canDelete: mine && !isDeleted,
  };
}

export async function listConversations(input: {
  viewerId: number;
  viewerRole: UserRole;
}): Promise<ConversationDto[]> {
  const db = getDb();

  if (input.viewerRole === "delivery") {
    const [me] = await db
      .select({
        id: users.id,
        name: users.name,
        imageUrl: users.imageUrl,
        phone: users.phone,
      })
      .from(users)
      .where(eq(users.id, input.viewerId))
      .limit(1);
    if (!me) return [];

    const [last] = await db
      .select({
        body: chatMessages.body,
        imageUrl: chatMessages.imageUrl,
        isDeleted: chatMessages.isDeleted,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .where(eq(chatMessages.deliveryGuyId, input.viewerId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(1);

    const [unread] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.deliveryGuyId, input.viewerId),
          eq(chatMessages.isRead, false),
          eq(chatMessages.isDeleted, false),
          ne(chatMessages.senderId, input.viewerId),
        ),
      );

    const preview = last
      ? previewFromRow(last)
      : {
          lastMessage: null,
          lastMessageType: null as ConversationDto["lastMessageType"],
        };

    return [
      {
        deliveryGuyId: me.id,
        deliveryGuyName: "Admin",
        deliveryGuyImageUrl: null,
        deliveryGuyPhone: me.phone,
        lastMessage: preview.lastMessage,
        lastMessageType: preview.lastMessageType,
        lastMessageAt: last?.createdAt.toISOString() ?? null,
        unreadCount: unread?.count ?? 0,
      },
    ];
  }

  const partners = await db
    .select({
      id: users.id,
      name: users.name,
      imageUrl: users.imageUrl,
      phone: users.phone,
    })
    .from(users)
    .where(and(eq(users.role, "delivery"), eq(users.isActive, true)))
    .orderBy(asc(users.name));

  const conversations: ConversationDto[] = [];

  for (const partner of partners) {
    const [last] = await db
      .select({
        body: chatMessages.body,
        imageUrl: chatMessages.imageUrl,
        isDeleted: chatMessages.isDeleted,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .where(eq(chatMessages.deliveryGuyId, partner.id))
      .orderBy(desc(chatMessages.createdAt))
      .limit(1);

    const [unread] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.deliveryGuyId, partner.id),
          eq(chatMessages.isRead, false),
          eq(chatMessages.isDeleted, false),
          eq(chatMessages.senderId, partner.id),
        ),
      );

    if (!last && (unread?.count ?? 0) === 0) continue;

    const preview = last
      ? previewFromRow(last)
      : { lastMessage: null, lastMessageType: null as ConversationDto["lastMessageType"] };

    conversations.push({
      deliveryGuyId: partner.id,
      deliveryGuyName: partner.name,
      deliveryGuyImageUrl: partner.imageUrl,
      deliveryGuyPhone: partner.phone,
      lastMessage: preview.lastMessage,
      lastMessageType: preview.lastMessageType,
      lastMessageAt: last?.createdAt.toISOString() ?? null,
      unreadCount: unread?.count ?? 0,
    });
  }

  conversations.sort((a, b) => {
    const at = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0;
    const bt = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0;
    return bt - at;
  });

  return conversations;
}

export async function listMessages(input: {
  deliveryGuyId: number;
  viewerId: number;
  viewerRole: UserRole;
  afterId?: number;
}): Promise<{ error: string | null; messages: ChatMessageDto[] }> {
  if (input.viewerRole === "delivery" && input.deliveryGuyId !== input.viewerId) {
    return { error: "Forbidden", messages: [] };
  }

  const [partner] = await getDb()
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, input.deliveryGuyId))
    .limit(1);

  if (!partner || partner.role !== "delivery") {
    return { error: "Delivery partner not found", messages: [] };
  }

  const conditions = [eq(chatMessages.deliveryGuyId, input.deliveryGuyId)];
  if (input.afterId != null && Number.isInteger(input.afterId)) {
    conditions.push(sql`${chatMessages.id} > ${input.afterId}`);
  }

  const rows = await getDb()
    .select({
      id: chatMessages.id,
      deliveryGuyId: chatMessages.deliveryGuyId,
      senderId: chatMessages.senderId,
      body: chatMessages.body,
      imageUrl: chatMessages.imageUrl,
      isDeleted: chatMessages.isDeleted,
      isRead: chatMessages.isRead,
      editedAt: chatMessages.editedAt,
      createdAt: chatMessages.createdAt,
      senderName: users.name,
      senderRole: users.role,
      senderImageUrl: users.imageUrl,
    })
    .from(chatMessages)
    .innerJoin(users, eq(users.id, chatMessages.senderId))
    .where(and(...conditions))
    .orderBy(asc(chatMessages.createdAt))
    .limit(500);

  return {
    error: null,
    messages: rows.map((row) =>
      mapMessage(
        {
          ...row,
          senderRole: row.senderRole as UserRole,
        },
        input.viewerId,
      ),
    ),
  };
}

export async function sendMessage(input: {
  deliveryGuyId: number;
  senderId: number;
  senderRole: UserRole;
  body?: string;
  imageUrl?: string | null;
}) {
  const body = (input.body ?? "").trim();
  const imageUrl = input.imageUrl?.trim() || null;

  if (!body && !imageUrl) {
    return { error: "Message cannot be empty" as const, message: null };
  }
  if (body.length > 4000) {
    return { error: "Message is too long" as const, message: null };
  }

  if (input.senderRole === "delivery" && input.deliveryGuyId !== input.senderId) {
    return { error: "Forbidden" as const, message: null };
  }

  const [partner] = await getDb()
    .select({ id: users.id, role: users.role, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, input.deliveryGuyId))
    .limit(1);

  if (!partner || partner.role !== "delivery") {
    return { error: "Delivery partner not found" as const, message: null };
  }
  if (!partner.isActive) {
    return { error: "Delivery partner is inactive" as const, message: null };
  }

  const [sender] = await getDb()
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, input.senderId))
    .limit(1);

  const [inserted] = await getDb()
    .insert(chatMessages)
    .values({
      deliveryGuyId: input.deliveryGuyId,
      senderId: input.senderId,
      body,
      imageUrl,
      isRead: false,
      isDeleted: false,
    })
    .returning({ id: chatMessages.id });

  const preview =
    body || (imageUrl ? "📷 Photo" : "New message");

  try {
    if (input.senderRole === "admin") {
      await notifyUser({
        userId: input.deliveryGuyId,
        type: "chat",
        title: "New message",
        body: `${sender?.name ?? "Admin"}: ${preview}`,
        href: "/conversations",
      });
    } else {
      await notifyAdmins({
        type: "chat",
        title: "New message",
        body: `${sender?.name ?? "Delivery"}: ${preview}`,
        href: `/conversations?with=${input.deliveryGuyId}`,
      });
    }
  } catch (error) {
    console.error("Chat notification failed:", error);
  }

  const listed = await listMessages({
    deliveryGuyId: input.deliveryGuyId,
    viewerId: input.senderId,
    viewerRole: input.senderRole,
    afterId: inserted.id - 1,
  });

  const message = listed.messages.find((m) => m.id === inserted.id) ?? null;
  return { error: null, message };
}

export async function updateMessage(input: {
  messageId: number;
  viewerId: number;
  viewerRole: UserRole;
  body: string;
}) {
  const body = input.body.trim();
  if (!body) return { error: "Message cannot be empty" as const, message: null };
  if (body.length > 4000) {
    return { error: "Message is too long" as const, message: null };
  }

  const [existing] = await getDb()
    .select({
      id: chatMessages.id,
      deliveryGuyId: chatMessages.deliveryGuyId,
      senderId: chatMessages.senderId,
      isDeleted: chatMessages.isDeleted,
      imageUrl: chatMessages.imageUrl,
    })
    .from(chatMessages)
    .where(eq(chatMessages.id, input.messageId))
    .limit(1);

  if (!existing) return { error: "Message not found" as const, message: null };
  if (existing.senderId !== input.viewerId) {
    return { error: "Forbidden" as const, message: null };
  }
  if (existing.isDeleted) {
    return { error: "Message was deleted" as const, message: null };
  }
  if (
    input.viewerRole === "delivery" &&
    existing.deliveryGuyId !== input.viewerId
  ) {
    return { error: "Forbidden" as const, message: null };
  }

  await getDb()
    .update(chatMessages)
    .set({ body, editedAt: new Date() })
    .where(eq(chatMessages.id, input.messageId));

  const listed = await listMessages({
    deliveryGuyId: existing.deliveryGuyId,
    viewerId: input.viewerId,
    viewerRole: input.viewerRole,
  });
  const message = listed.messages.find((m) => m.id === input.messageId) ?? null;
  return { error: null, message };
}

export async function softDeleteMessage(input: {
  messageId: number;
  viewerId: number;
  viewerRole: UserRole;
}) {
  const [existing] = await getDb()
    .select({
      id: chatMessages.id,
      deliveryGuyId: chatMessages.deliveryGuyId,
      senderId: chatMessages.senderId,
      isDeleted: chatMessages.isDeleted,
    })
    .from(chatMessages)
    .where(eq(chatMessages.id, input.messageId))
    .limit(1);

  if (!existing) return { error: "Message not found" as const, message: null };
  if (existing.senderId !== input.viewerId) {
    return { error: "Forbidden" as const, message: null };
  }
  if (existing.isDeleted) {
    return { error: null as string | null, message: null };
  }
  if (
    input.viewerRole === "delivery" &&
    existing.deliveryGuyId !== input.viewerId
  ) {
    return { error: "Forbidden" as const, message: null };
  }

  await getDb()
    .update(chatMessages)
    .set({
      isDeleted: true,
      body: "",
      imageUrl: null,
      editedAt: new Date(),
    })
    .where(eq(chatMessages.id, input.messageId));

  const listed = await listMessages({
    deliveryGuyId: existing.deliveryGuyId,
    viewerId: input.viewerId,
    viewerRole: input.viewerRole,
  });
  const message = listed.messages.find((m) => m.id === input.messageId) ?? null;
  return { error: null as string | null, message };
}

export async function markConversationRead(input: {
  deliveryGuyId: number;
  viewerId: number;
  viewerRole: UserRole;
}) {
  if (input.viewerRole === "delivery" && input.deliveryGuyId !== input.viewerId) {
    return { error: "Forbidden" as const };
  }

  await getDb()
    .update(chatMessages)
    .set({ isRead: true })
    .where(
      and(
        eq(chatMessages.deliveryGuyId, input.deliveryGuyId),
        eq(chatMessages.isRead, false),
        ne(chatMessages.senderId, input.viewerId),
      ),
    );

  return { error: null };
}

export async function unreadChatTotal(input: {
  viewerId: number;
  viewerRole: UserRole;
}) {
  if (input.viewerRole === "delivery") {
    const [row] = await getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.deliveryGuyId, input.viewerId),
          eq(chatMessages.isRead, false),
          eq(chatMessages.isDeleted, false),
          ne(chatMessages.senderId, input.viewerId),
        ),
      );
    return row?.count ?? 0;
  }

  const [row] = await getDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(chatMessages)
    .innerJoin(users, eq(users.id, chatMessages.senderId))
    .where(
      and(
        eq(chatMessages.isRead, false),
        eq(chatMessages.isDeleted, false),
        eq(users.role, "delivery"),
      ),
    );
  return row?.count ?? 0;
}
