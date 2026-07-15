"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { HiOutlineBell } from "react-icons/hi2";

import {
  fetchNotifications,
  markNotificationsRead,
  type AppNotification,
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

export function NotificationsBell() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchNotifications({ page: 1, limit: 5 });
      setItems(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // Ignore transient fetch errors in the header bell.
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 45000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", onClickOutside);
    }
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function handleMarkAllRead() {
    try {
      await markNotificationsRead({ all: true });
      await load();
    } catch {
      // Ignore.
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-label={t("shell.notificationsAria")}
        onClick={() => {
          setOpen((value) => !value);
          void load();
        }}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-amber-200 text-stone-800 hover:bg-amber-50"
      >
        <HiOutlineBell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-amber-200 bg-white shadow-lg shadow-amber-900/10 sm:w-96">
          <div className="flex items-center justify-between border-b border-amber-100 px-3 py-2">
            <p className="text-sm font-semibold text-stone-900">
              {t("nav.notifications")}
            </p>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => void handleMarkAllRead()}
                className="text-xs font-medium text-amber-700 hover:underline"
              >
                {t("shell.markAllRead")}
              </button>
            ) : null}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-stone-500">
                {t("shell.noRecentNotifications")}
              </p>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className={`border-b border-amber-50 px-3 py-2.5 last:border-b-0 ${
                    item.isRead ? "bg-white" : "bg-amber-50/70"
                  }`}
                >
                  <p className="text-sm font-semibold text-stone-900">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-stone-600">
                    {item.body}
                  </p>
                  <p className="mt-1 text-[11px] text-stone-400">
                    {timeLabel(item.createdAt)}
                  </p>
                </div>
              ))
            )}
          </div>
          <div className="border-t border-amber-100 bg-amber-50/40 px-3 py-2">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-sm font-semibold text-amber-800 hover:underline"
            >
              {t("shell.viewAllNotifications")}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
