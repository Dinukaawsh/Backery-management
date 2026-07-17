"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/ToastProvider";
import {
  fetchNotifications,
  markNotificationsRead,
  type AppNotification,
} from "@/lib/api";
import { useT } from "@/lib/i18n";

const PAGE_SIZE = 20;

function timeLabel(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: "Asia/Colombo",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function NotificationsPage() {
  const t = useT();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchNotifications({ page, limit: PAGE_SIZE });
      setItems(data.notifications);
      setTotal(data.total);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("notifications.failedLoad"),
      );
    } finally {
      setLoading(false);
    }
  }, [page, toast, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleMarkAllRead() {
    setMarking(true);
    try {
      await markNotificationsRead({ all: true });
      await load();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("notifications.failedLoad"),
      );
    } finally {
      setMarking(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("notifications.title")}
        description={t("notifications.description")}
        action={
          <Button
            variant="secondary"
            onClick={() => void handleMarkAllRead()}
            disabled={marking || loading}
          >
            {t("shell.markAllRead")}
          </Button>
        }
      />

      {loading ? (
        <LoadingSpinner label={t("common.loading")} />
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-amber-200 bg-white px-4 py-10 text-center text-stone-500">
          {t("notifications.empty")}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-amber-200 bg-white">
          <ul className="divide-y divide-amber-100">
            {items.map((item) => (
              <li
                key={item.id}
                className={`px-4 py-4 sm:px-5 ${
                  item.isRead ? "bg-white" : "bg-amber-50/60"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-stone-900">{item.title}</p>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                        {item.type === "sale"
                          ? t("notifications.typeSale")
                          : item.type === "chat"
                            ? t("notifications.typeChat")
                            : t("notifications.typeAssignment")}
                      </span>
                      {!item.isRead ? (
                        <span className="rounded-full bg-amber-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                          {t("notifications.unread")}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-stone-600">
                      {item.body}
                    </p>
                  </div>
                  <p className="shrink-0 text-xs text-stone-400">
                    {timeLabel(item.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          {total > PAGE_SIZE ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-amber-100 px-4 py-3">
              <p className="text-sm text-stone-500">
                {t("notifications.pageStatus", {
                  page,
                  totalPages,
                  total,
                })}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  {t("notifications.previous")}
                </Button>
                <Button
                  variant="secondary"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  {t("notifications.next")}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
