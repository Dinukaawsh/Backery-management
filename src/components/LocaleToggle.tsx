"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { Locale } from "@/lib/i18n/types";

export function LocaleToggle({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useLocale();

  function select(next: Locale) {
    if (next !== locale) setLocale(next);
  }

  return (
    <div
      role="group"
      aria-label={t("locale.switchAria")}
      className={`inline-flex overflow-hidden rounded-lg border border-amber-200 bg-white text-sm font-medium ${className}`}
    >
      <button
        type="button"
        onClick={() => select("en")}
        className={`px-2.5 py-1.5 transition ${
          locale === "en"
            ? "bg-amber-600 text-white"
            : "text-stone-700 hover:bg-amber-50"
        }`}
      >
        {t("locale.en")}
      </button>
      <button
        type="button"
        onClick={() => select("si")}
        className={`px-2.5 py-1.5 transition ${
          locale === "si"
            ? "bg-amber-600 text-white"
            : "text-stone-700 hover:bg-amber-50"
        }`}
      >
        {t("locale.si")}
      </button>
    </div>
  );
}
