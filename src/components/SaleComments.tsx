"use client";

import { useCallback, useEffect, useState } from "react";
import {
  HiOutlineChatBubbleLeft,
  HiOutlineEllipsisVertical,
  HiOutlinePencilSquare,
  HiOutlineTrash,
} from "react-icons/hi2";

import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/ToastProvider";
import {
  createSaleComment,
  deleteSaleComment,
  fetchSaleComments,
  updateSaleComment,
  type SaleComment,
} from "@/lib/api";
import { useT } from "@/lib/i18n";

function timeLabel(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: "Asia/Colombo",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function Avatar({
  name,
  imageUrl,
  size = "md",
}: {
  name: string;
  imageUrl: string | null;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={imageUrl}
        alt={name}
        className={`${dim} shrink-0 rounded-full object-cover ring-2 ring-amber-100`}
      />
    );
  }
  return (
    <div
      className={`${dim} flex shrink-0 items-center justify-center rounded-full bg-amber-100 font-bold text-amber-800`}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </div>
  );
}

type SaleCommentsProps = {
  saleId: number;
};

export function SaleComments({ saleId }: SaleCommentsProps) {
  const t = useT();
  const toast = useToast();
  const [comments, setComments] = useState<SaleComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<SaleComment | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [actionMenuId, setActionMenuId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);

  const load = useCallback(async () => {
    try {
      const data = await fetchSaleComments(saleId);
      setComments(data);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("comments.failedLoad"),
      );
    } finally {
      setLoading(false);
    }
  }, [saleId, toast, t]);

  useEffect(() => {
    setLoading(true);
    void load();
    const timer = window.setInterval(() => void load(), 4000);
    return () => window.clearInterval(timer);
  }, [load]);

  async function handleSubmit() {
    const body = draft.trim();
    if (!body || saving) return;
    setSaving(true);
    try {
      const next = await createSaleComment(saleId, {
        body,
        parentId: replyTo?.id ?? null,
      });
      setComments(next);
      setDraft("");
      setReplyTo(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("comments.failedSave"),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit(commentId: number) {
    const body = editDraft.trim();
    if (!body || saving) return;
    setSaving(true);
    try {
      const next = await updateSaleComment(commentId, body);
      setComments(next);
      setEditingId(null);
      setEditDraft("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("comments.failedSave"),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(commentId: number) {
    if (saving) return;
    setSaving(true);
    try {
      const next = await deleteSaleComment(commentId);
      setComments(next);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("comments.failedDelete"),
      );
    } finally {
      setSaving(false);
      setDeleteTargetId(null);
    }
  }

  function renderComment(comment: SaleComment, isReply = false) {
    const editing = editingId === comment.id;
    return (
      <div
        key={comment.id}
        className={`${isReply ? "ml-10 mt-3" : "mt-4"} flex gap-3`}
      >
        <Avatar
          name={comment.userName}
          imageUrl={comment.userImageUrl}
          size={isReply ? "sm" : "md"}
        />
        <div className="min-w-0 flex-1">
          <div className="group relative rounded-2xl bg-stone-100 px-3.5 py-2.5">
            {(comment.canEdit || comment.canDelete) && !editing ? (
              <div className="absolute right-2 top-2">
                <button
                  type="button"
                  aria-label={t("comments.actions")}
                  onClick={() =>
                    setActionMenuId((current) =>
                      current === comment.id ? null : comment.id,
                    )
                  }
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-stone-500 transition hover:bg-white ${
                    actionMenuId === comment.id
                      ? "bg-white opacity-100 shadow"
                      : "opacity-0 group-hover:opacity-100 focus:opacity-100"
                  }`}
                >
                  <HiOutlineEllipsisVertical className="h-5 w-5" />
                </button>
                {actionMenuId === comment.id ? (
                  <div className="absolute right-0 top-8 z-20 min-w-32 overflow-hidden rounded-xl border border-stone-200 bg-white py-1 shadow-xl">
                    {comment.canEdit ? (
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-stone-700 hover:bg-amber-50"
                        onClick={() => {
                          setEditingId(comment.id);
                          setEditDraft(comment.body);
                          setReplyTo(null);
                          setActionMenuId(null);
                        }}
                      >
                        <HiOutlinePencilSquare className="h-4 w-4" />
                        {t("common.edit")}
                      </button>
                    ) : null}
                    {comment.canDelete ? (
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                        onClick={() => {
                          setActionMenuId(null);
                          setDeleteTargetId(comment.id);
                        }}
                      >
                        <HiOutlineTrash className="h-4 w-4" />
                        {t("common.delete")}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-sm font-semibold text-stone-900">
                {comment.userName}
              </span>
              <span className="text-[11px] uppercase tracking-wide text-stone-400">
                {comment.userRole === "admin"
                  ? t("common.admin")
                  : t("common.delivery")}
              </span>
              <span className="text-[11px] text-stone-400">
                {timeLabel(comment.createdAt)}
              </span>
              {comment.isEdited ? (
                <span className="text-[11px] text-stone-400">
                  {t("comments.edited")}
                </span>
              ) : null}
            </div>
            {editing ? (
              <div className="mt-2 space-y-2">
                <textarea
                  value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => void handleSaveEdit(comment.id)}
                    disabled={saving}
                  >
                    {t("common.saveChanges")}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setEditingId(null);
                      setEditDraft("");
                    }}
                  >
                    {t("common.cancel")}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-1 whitespace-pre-wrap text-sm text-stone-800">
                {comment.body}
              </p>
            )}
          </div>
          {!editing ? (
            <div className="mt-1 flex flex-wrap items-center gap-3 px-1 text-xs font-semibold text-stone-500">
              {!isReply ? (
                <button
                  type="button"
                  className="hover:text-amber-700"
                  onClick={() => {
                    setReplyTo(comment);
                    setEditingId(null);
                  }}
                >
                  {t("comments.reply")}
                </button>
              ) : null}
            </div>
          ) : null}
          {comment.replies?.map((reply) => renderComment(reply, true))}
        </div>
      </div>
    );
  }

  return (
    <div className="print:hidden border-t border-amber-100 pt-4">
      <div className="mb-3 flex items-center gap-2">
        <HiOutlineChatBubbleLeft className="h-5 w-5 text-amber-700" />
        <h3 className="text-base font-semibold text-stone-900">
          {t("comments.title")}
        </h3>
        <span className="text-xs text-stone-400">
          {t("comments.count", {
            count: comments.reduce(
              (total, comment) => total + 1 + comment.replies.length,
              0,
            ),
          })}
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-stone-500">{t("common.loading")}</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-stone-500">{t("comments.empty")}</p>
      ) : (
        <div>
          {comments.slice(0, visibleCount).map((c) => renderComment(c))}
          {visibleCount < comments.length ? (
            <button
              type="button"
              className="mt-4 w-full rounded-xl border border-amber-200 px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-50"
              onClick={() => setVisibleCount((count) => count + 10)}
            >
              {t("comments.loadMore", {
                count: Math.min(10, comments.length - visibleCount),
              })}
            </button>
          ) : null}
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/40 p-3">
        {replyTo ? (
          <div className="mb-2 flex items-center justify-between text-xs text-amber-800">
            <span>
              {t("comments.replyingTo", { name: replyTo.userName })}
            </span>
            <button
              type="button"
              className="font-semibold hover:underline"
              onClick={() => setReplyTo(null)}
            >
              {t("common.cancel")}
            </button>
          </div>
        ) : null}
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          placeholder={t("comments.placeholder")}
          className="w-full resize-none rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500"
        />
        <div className="mt-2 flex justify-end">
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving || !draft.trim()}
          >
            {saving ? t("common.pleaseWait") : t("comments.post")}
          </Button>
        </div>
      </div>
      <ConfirmModal
        open={deleteTargetId !== null}
        title={t("common.delete")}
        message={t("comments.deleteConfirm")}
        confirmLabel={t("common.delete")}
        variant="danger"
        loading={saving}
        onConfirm={() => {
          if (deleteTargetId !== null) void handleDelete(deleteTargetId);
        }}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
