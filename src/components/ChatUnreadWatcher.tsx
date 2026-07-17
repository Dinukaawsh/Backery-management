"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { useToast } from "@/components/ui/ToastProvider";
import { fetchChatUnreadCount } from "@/lib/api";
import { useT } from "@/lib/i18n";

/** Polls unread chat count and toasts when new messages arrive. */
export function ChatUnreadWatcher({
  onCount,
}: {
  onCount?: (count: number) => void;
}) {
  const t = useT();
  const toast = useToast();
  const pathname = usePathname();
  const prevRef = useRef<number | null>(null);
  const [ready, setReady] = useState(false);

  const poll = useCallback(async () => {
    try {
      const count = await fetchChatUnreadCount();
      onCount?.(count);
      if (ready && prevRef.current != null && count > prevRef.current) {
        const added = count - prevRef.current;
        if (!pathname.startsWith("/conversations")) {
          toast.success(
            added === 1
              ? t("chat.newMessageToast")
              : t("chat.newMessagesToast", { count: added }),
          );
        }
      }
      prevRef.current = count;
      setReady(true);
    } catch {
      // Ignore transient errors.
    }
  }, [onCount, pathname, ready, t, toast]);

  useEffect(() => {
    void poll();
    const timer = window.setInterval(() => void poll(), 5000);
    function onUpdated() {
      void poll();
    }
    window.addEventListener("bakery:chat-updated", onUpdated);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("bakery:chat-updated", onUpdated);
    };
  }, [poll]);

  return null;
}
