"use client";

import { useEffect, useState } from "react";
import { HiOutlinePrinter } from "react-icons/hi2";

import { BillBusinessHeader } from "@/components/BillBusinessHeader";
import { useBusinessSettings } from "@/components/BusinessSettingsProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { getSale, markBillPrinted, type Sale } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { useT } from "@/lib/i18n";

export default function BillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { settings } = useBusinessSettings();
  const toast = useToast();
  const t = useT();
  const [saleId, setSaleId] = useState<string | null>(null);
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void params.then((value) => setSaleId(value.id));
  }, [params]);

  useEffect(() => {
    if (!saleId) return;

    void getSale(Number(saleId))
      .then(async (data) => {
        setSale(data);
        if (!data.billPrinted) {
          const updated = await markBillPrinted(data.id);
          setSale(updated);
        }
        setLoading(false);
      })
      .catch((err) => {
        toast.error(
          err instanceof Error ? err.message : t("bill.failedToLoad"),
        );
        setLoading(false);
      });
  }, [saleId]);

  if (loading) {
    return <p className="p-8">{t("bill.loading")}</p>;
  }

  if (!sale) {
    return <p className="p-8 text-stone-600">{t("bill.notAvailable")}</p>;
  }

  return (
    <div className="mx-auto max-w-2xl bg-white p-8 print:p-4">
      <div className="mb-6 flex items-start justify-between gap-4">
        <BillBusinessHeader
          settings={settings}
          subtitle={t("bill.titleWithId", { id: sale.id })}
        />
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-amber-700 px-4 py-2 text-sm text-white print:hidden"
        >
          <HiOutlinePrinter className="h-4 w-4" />
          {t("bill.print")}
        </button>
      </div>

      <div className="grid gap-4 border-t border-amber-100 pt-6 text-sm sm:grid-cols-2">
        <div>
          <p className="font-semibold">{t("bill.shop")}</p>
          <p>{sale.shopName}</p>
          {sale.shopOwner ? <p>{sale.shopOwner}</p> : null}
          {sale.shopAddress ? <p>{sale.shopAddress}</p> : null}
          {sale.shopPhone ? <p>{sale.shopPhone}</p> : null}
        </div>
        <div>
          <p className="font-semibold">{t("bill.delivery")}</p>
          <p>{sale.deliveryGuyName}</p>
          <p>{new Date(sale.saleDate).toLocaleString()}</p>
        </div>
      </div>

      <table className="mt-8 w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2 text-left">{t("bill.product")}</th>
            <th className="py-2 text-right">{t("bill.qty")}</th>
            <th className="py-2 text-right">{t("bill.priceRs")}</th>
            <th className="py-2 text-right">{t("bill.totalRs")}</th>
          </tr>
        </thead>
        <tbody>
          {sale.items?.map((item) => (
            <tr key={item.id} className="border-b border-gray-100">
              <td className="py-2">
                <div>{item.productName}</div>
                <div className="mt-0.5 text-xs text-stone-500">
                  {t("bill.itemCalculation", {
                    price: formatCurrency(item.unitPrice),
                    qty: item.quantity,
                    total: formatCurrency(
                      Number(item.unitPrice) * item.quantity,
                    ),
                  })}
                </div>
              </td>
              <td className="py-2 text-right align-top">{item.quantity}</td>
              <td className="py-2 text-right align-top">
                {formatCurrency(item.unitPrice)}
              </td>
              <td className="py-2 text-right align-top">
                {formatCurrency(Number(item.unitPrice) * item.quantity)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 flex justify-end text-lg font-bold">
        {t("bill.totalRsLabel", { amount: formatCurrency(sale.totalAmount) })}
      </div>

      {sale.notes ? (
        <p className="mt-4 text-sm text-gray-600">
          {t("common.notes", { notes: sale.notes })}
        </p>
      ) : null}

      <p className="mt-8 text-center text-xs text-stone-500">
        {t("bill.thankYou")}
      </p>
    </div>
  );
}
