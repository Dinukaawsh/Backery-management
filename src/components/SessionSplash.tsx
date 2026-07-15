"use client";

import { useEffect, useState } from "react";

import { getBusinessSettings } from "@/lib/api";
import { useT } from "@/lib/i18n";

const SPLASH_SESSION_KEY = "bakery_splash_seen";
const SPLASH_MIN_MS = 2000;

export function SessionSplash({ children }: { children: React.ReactNode }) {
  const t = useT();
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [businessName, setBusinessName] = useState("Bakery");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (typeof window === "undefined") return;

      const alreadySeen = window.sessionStorage.getItem(SPLASH_SESSION_KEY);
      if (alreadySeen) {
        if (!cancelled) setReady(true);
        return;
      }

      if (!cancelled) setVisible(true);

      const started = Date.now();
      try {
        const settings = await getBusinessSettings();
        if (!cancelled && settings.businessName) {
          setBusinessName(settings.businessName);
        }
      } catch {
        // Keep fallback name.
      }

      const elapsed = Date.now() - started;
      const wait = Math.max(0, SPLASH_MIN_MS - elapsed);
      await new Promise((resolve) => setTimeout(resolve, wait));

      if (cancelled) return;
      window.sessionStorage.setItem(SPLASH_SESSION_KEY, "1");
      setVisible(false);
      setReady(true);
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready && !visible) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-amber-50" />
    );
  }

  return (
    <>
      {ready ? children : null}
      {visible ? (
        <div className="fixed inset-0 z-[100] flex flex-col bg-gradient-to-b from-amber-50 via-amber-100/80 to-orange-50">
          <div className="flex flex-1 flex-col items-center justify-center px-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/app-icon.png"
              alt=""
              className="h-24 w-24 rounded-3xl shadow-lg shadow-amber-900/10"
            />
            <h1 className="mt-6 text-center text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
              {businessName}
            </h1>
            <div className="mt-8 flex flex-col items-center gap-3">
              <div
                className="h-9 w-9 animate-spin rounded-full border-[3px] border-amber-200 border-t-amber-700"
                aria-hidden
              />
              <p className="text-sm text-stone-600">{t("splash.loading")}</p>
            </div>
          </div>
          <div className="space-y-1 px-6 pb-8 text-center text-xs text-stone-500">
            <p>
              {t("splash.copyright", { year: new Date().getFullYear() })}
            </p>
            <a
              href="tel:+94718780945"
              className="inline-block text-stone-500 hover:text-amber-800"
            >
              {t("splash.phone")}
            </a>
          </div>
        </div>
      ) : null}
    </>
  );
}
