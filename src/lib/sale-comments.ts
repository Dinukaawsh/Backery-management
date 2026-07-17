import { asc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { saleComments, sales, users } from "@/db/schema";
import type { UserRole } from "@/lib/auth";

export type SaleCommentDto = {
  id: number;
  saleId: number;
  userId: number;
  parentId: number | null;
  body: string;
  createdAt: string;
  updatedAt: string;
  isEdited: boolean;
  userName: string;
  userRole: UserRole;
  userImageUrl: string | null;
  canEdit: boolean;
  canDelete: boolean;
  replies: SaleCommentDto[];
};

async function assertCanAccessSale(input: {
  saleId: number;
  userId: number;
  role: UserRole;
}) {
  const [sale] = await getDb()
    .select({
      id: sales.id,
      deliveryGuyId: sales.deliveryGuyId,
    })
    .from(sales)
    .where(eq(sales.id, input.saleId))
    .limit(1);

  if (!sale) return { error: "Sale not found" as const, sale: null };
  if (input.role === "delivery" && sale.deliveryGuyId !== input.userId) {
    return { error: "Forbidden" as const, sale: null };
  }
  return { error: null, sale };
}

function mapComment(
  row: {
    id: number;
    saleId: number;
    userId: number;
    parentId: number | null;
    body: string;
    createdAt: Date;
    updatedAt: Date;
    userName: string;
    userRole: UserRole;
    userImageUrl: string | null;
  },
  viewerId: number,
  replies: SaleCommentDto[] = [],
): SaleCommentDto {
  const isOwner = row.userId === viewerId;
  return {
    id: row.id,
    saleId: row.saleId,
    userId: row.userId,
    parentId: row.parentId,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    isEdited: row.updatedAt.getTime() > row.createdAt.getTime(),
    userName: row.userName,
    userRole: row.userRole,
    userImageUrl: row.userImageUrl,
    canEdit: isOwner,
    canDelete: isOwner,
    replies,
  };
}

export async function listSaleComments(input: {
  saleId: number;
  viewerId: number;
  viewerRole: UserRole;
}) {
  const access = await assertCanAccessSale({
    saleId: input.saleId,
    userId: input.viewerId,
    role: input.viewerRole,
  });
  if (access.error || !access.sale) {
    return { error: access.error ?? "Sale not found", comments: [] as SaleCommentDto[] };
  }

  const rows = await getDb()
    .select({
      id: saleComments.id,
      saleId: saleComments.saleId,
      userId: saleComments.userId,
      parentId: saleComments.parentId,
      body: saleComments.body,
      createdAt: saleComments.createdAt,
      updatedAt: saleComments.updatedAt,
      userName: users.name,
      userRole: users.role,
      userImageUrl: users.imageUrl,
    })
    .from(saleComments)
    .innerJoin(users, eq(users.id, saleComments.userId))
    .where(eq(saleComments.saleId, input.saleId))
    .orderBy(asc(saleComments.createdAt));

  const roots = rows.filter((r) => r.parentId == null);
  const byParent = new Map<number, typeof rows>();
  for (const row of rows) {
    if (row.parentId == null) continue;
    const list = byParent.get(row.parentId) ?? [];
    list.push(row);
    byParent.set(row.parentId, list);
  }

  const comments = roots.map((root) =>
    mapComment(
      rowAs(root),
      input.viewerId,
      (byParent.get(root.id) ?? []).map((reply) =>
        mapComment(rowAs(reply), input.viewerId),
      ),
    ),
  );

  return { error: null, comments };
}

function rowAs(row: {
  id: number;
  saleId: number;
  userId: number;
  parentId: number | null;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  userName: string;
  userRole: "admin" | "delivery";
  userImageUrl: string | null;
}) {
  return {
    ...row,
    userRole: row.userRole as UserRole,
  };
}

export async function createSaleComment(input: {
  saleId: number;
  userId: number;
  role: UserRole;
  body: string;
  parentId?: number | null;
}) {
  const body = input.body.trim();
  if (!body) return { error: "Comment cannot be empty" as const, comment: null };
  if (body.length > 2000) {
    return { error: "Comment is too long" as const, comment: null };
  }

  const access = await assertCanAccessSale({
    saleId: input.saleId,
    userId: input.userId,
    role: input.role,
  });
  if (access.error || !access.sale) {
    return { error: access.error ?? "Sale not found", comment: null };
  }

  let parentId: number | null = input.parentId ?? null;
  if (parentId != null) {
    const [parent] = await getDb()
      .select({
        id: saleComments.id,
        saleId: saleComments.saleId,
        parentId: saleComments.parentId,
      })
      .from(saleComments)
      .where(eq(saleComments.id, parentId))
      .limit(1);
    if (!parent || parent.saleId !== input.saleId) {
      return { error: "Parent comment not found" as const, comment: null };
    }
    // Flatten nested replies under the root comment.
    if (parent.parentId != null) parentId = parent.parentId;
  }

  const [inserted] = await getDb()
    .insert(saleComments)
    .values({
      saleId: input.saleId,
      userId: input.userId,
      parentId,
      body,
    })
    .returning({ id: saleComments.id });

  const listed = await listSaleComments({
    saleId: input.saleId,
    viewerId: input.userId,
    viewerRole: input.role,
  });
  const flat = [
    ...listed.comments,
    ...listed.comments.flatMap((c) => c.replies),
  ];
  const comment = flat.find((c) => c.id === inserted.id) ?? null;
  return { error: null, comment, comments: listed.comments };
}

export async function updateSaleComment(input: {
  commentId: number;
  userId: number;
  role: UserRole;
  body: string;
}) {
  const body = input.body.trim();
  if (!body) return { error: "Comment cannot be empty" as const };
  if (body.length > 2000) return { error: "Comment is too long" as const };

  const [existing] = await getDb()
    .select({
      id: saleComments.id,
      saleId: saleComments.saleId,
      userId: saleComments.userId,
    })
    .from(saleComments)
    .where(eq(saleComments.id, input.commentId))
    .limit(1);

  if (!existing) return { error: "Comment not found" as const };
  if (existing.userId !== input.userId) return { error: "Forbidden" as const };

  const access = await assertCanAccessSale({
    saleId: existing.saleId,
    userId: input.userId,
    role: input.role,
  });
  if (access.error) return { error: access.error };

  await getDb()
    .update(saleComments)
    .set({ body, updatedAt: new Date() })
    .where(eq(saleComments.id, input.commentId));

  const listed = await listSaleComments({
    saleId: existing.saleId,
    viewerId: input.userId,
    viewerRole: input.role,
  });
  return { error: null, comments: listed.comments, saleId: existing.saleId };
}

export async function deleteSaleComment(input: {
  commentId: number;
  userId: number;
  role: UserRole;
}) {
  const [existing] = await getDb()
    .select({
      id: saleComments.id,
      saleId: saleComments.saleId,
      userId: saleComments.userId,
      parentId: saleComments.parentId,
    })
    .from(saleComments)
    .where(eq(saleComments.id, input.commentId))
    .limit(1);

  if (!existing) return { error: "Comment not found" as const };
  if (existing.userId !== input.userId) return { error: "Forbidden" as const };

  const access = await assertCanAccessSale({
    saleId: existing.saleId,
    userId: input.userId,
    role: input.role,
  });
  if (access.error) return { error: access.error };

  // Delete replies if this is a root comment.
  if (existing.parentId == null) {
    await getDb()
      .delete(saleComments)
      .where(eq(saleComments.parentId, existing.id));
  }
  await getDb().delete(saleComments).where(eq(saleComments.id, existing.id));

  const listed = await listSaleComments({
    saleId: existing.saleId,
    viewerId: input.userId,
    viewerRole: input.role,
  });
  return { error: null, comments: listed.comments, saleId: existing.saleId };
}
