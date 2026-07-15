"use client";

import type { BusinessSettings } from "@/lib/api";
import { useT } from "@/lib/i18n";

type BillBusinessHeaderProps = {
  settings: BusinessSettings;
  subtitle?: string;
};

export function BillBusinessHeader({
  settings,
  subtitle,
}: BillBusinessHeaderProps) {
  const t = useT();
  return (
    <div className="text-center">
      <h1 className="text-2xl font-bold">{settings.businessName}</h1>
      {settings.ownerName ? (
        <p className="mt-1 text-sm text-stone-600">{settings.ownerName}</p>
      ) : null}
      {settings.address ? (
        <p className="mt-2 text-sm text-stone-600">{settings.address}</p>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-stone-600">
        {settings.phone ? (
          <span>{t("bill.tel", { phone: settings.phone })}</span>
        ) : null}
        {settings.email ? <span>{settings.email}</span> : null}
      </div>
      {subtitle ? (
        <p className="mt-3 text-sm font-medium text-stone-700">{subtitle}</p>
      ) : null}
    </div>
  );
}
