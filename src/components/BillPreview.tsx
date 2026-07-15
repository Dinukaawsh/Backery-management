"use client";

import type { BusinessSettings } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { useT } from "@/lib/i18n";

const SAMPLE_ITEMS = [
  { name: "White Bread", quantity: 10, unitPrice: 1.5 },
  { name: "Butter Cake", quantity: 5, unitPrice: 2.0 },
] as const;

const SAMPLE_SHOP = {
  name: "Sunrise Corner Shop",
  owner: "Mr. Silva",
  address: "12 Main Street",
  phone: "077 123 4567",
};

const SAMPLE_DELIVERY = {
  name: "Kamal Perera",
};

type BillPreviewProps = {
  settings: BusinessSettings;
  className?: string;
};

export function BillPreview({ settings, className = "" }: BillPreviewProps) {
  const t = useT();
  const total = SAMPLE_ITEMS.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const sampleDate = new Date().toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div
      className={`overflow-hidden rounded-xl border border-stone-200 bg-white shadow-inner ${className}`}
    >
      <div className="border-b border-dashed border-stone-200 bg-stone-50 px-3 py-3 text-center">
        <p className="text-sm font-bold text-black">
          {settings.businessName || "Bakery"}
        </p>
        {settings.ownerName ? (
          <p className="text-[10px] text-stone-600">{settings.ownerName}</p>
        ) : null}
        {settings.address ? (
          <p className="mt-1 text-[10px] leading-snug text-stone-600">
            {settings.address}
          </p>
        ) : null}
        {settings.phone || settings.email ? (
          <p className="mt-1 text-[10px] text-stone-600">
            {[
              settings.phone ? t("bill.tel", { phone: settings.phone }) : null,
              settings.email,
            ]
              .filter(Boolean)
              .join(" • ")}
          </p>
        ) : null}
        <p className="mt-2 text-[10px] font-semibold text-stone-700">
          {t("bill.preview.sampleTitle")}
        </p>
      </div>

      <div className="space-y-2 border-b border-dashed border-stone-200 px-3 py-2 text-[10px] text-stone-700">
        <div>
          <p className="font-semibold text-black">{t("bill.shop")}</p>
          <p>{SAMPLE_SHOP.name}</p>
          <p>{SAMPLE_SHOP.owner}</p>
          <p>{SAMPLE_SHOP.address}</p>
        </div>
        <div>
          <p className="font-semibold text-black">{t("bill.delivery")}</p>
          <p>{SAMPLE_DELIVERY.name}</p>
          <p>{sampleDate}</p>
        </div>
      </div>

      <div className="px-3 py-2">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-stone-200 text-stone-600">
              <th className="py-1 text-left font-medium">{t("bill.product")}</th>
              <th className="py-1 text-right font-medium">{t("bill.qty")}</th>
              <th className="py-1 text-right font-medium">{t("bill.totalRs")}</th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_ITEMS.map((item) => (
              <tr key={item.name} className="border-b border-stone-100">
                <td className="py-1.5 text-black">{item.name}</td>
                <td className="py-1.5 text-right">{item.quantity}</td>
                <td className="py-1.5 text-right">
                  {formatCurrency(item.quantity * item.unitPrice)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-2 flex items-center justify-between border-t border-stone-200 pt-2 text-xs font-bold text-black">
          <span>{t("bill.totalRs")}</span>
          <span>{formatCurrency(total)}</span>
        </div>

        <p className="mt-3 text-center text-[9px] text-stone-500">
          {t("bill.thankYou")}
        </p>
      </div>
    </div>
  );
}
