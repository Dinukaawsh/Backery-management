"use client";

import { useEffect, useState } from "react";
import { HiOutlinePrinter } from "react-icons/hi2";

import { BillBusinessHeader } from "@/components/BillBusinessHeader";
import { useBusinessSettings } from "@/components/BusinessSettingsProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { getSale, markBillPrinted, type Sale } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";

export default function BillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { settings } = useBusinessSettings();
  const toast = useToast();
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
        toast.error(err instanceof Error ? err.message : "Failed to load bill");
        setLoading(false);
      });
  }, [saleId]);

  if (loading) {
    return <p className="p-8">Loading bill...</p>;
  }

  if (!sale) {
    return <p className="p-8 text-stone-600">Bill not available.</p>;
  }

  return (
    <div className="mx-auto max-w-2xl bg-white p-8 print:p-4">
      <div className="mb-6 flex items-start justify-between gap-4">
        <BillBusinessHeader
          settings={settings}
          subtitle={`Delivery Bill #${sale.id}`}
        />
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-amber-700 px-4 py-2 text-sm text-white print:hidden"
        >
          <HiOutlinePrinter className="h-4 w-4" />
          Print
        </button>
      </div>

      <div className="grid gap-4 border-t border-amber-100 pt-6 text-sm sm:grid-cols-2">
        <div>
          <p className="font-semibold">Shop</p>
          <p>{sale.shopName}</p>
          {sale.shopOwner ? <p>{sale.shopOwner}</p> : null}
          {sale.shopAddress ? <p>{sale.shopAddress}</p> : null}
          {sale.shopPhone ? <p>{sale.shopPhone}</p> : null}
        </div>
        <div>
          <p className="font-semibold">Delivery</p>
          <p>{sale.deliveryGuyName}</p>
          <p>{new Date(sale.saleDate).toLocaleString()}</p>
        </div>
      </div>

      <table className="mt-8 w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2 text-left">Product</th>
            <th className="py-2 text-right">Qty</th>
            <th className="py-2 text-right">Price (Rs)</th>
            <th className="py-2 text-right">Total (Rs)</th>
          </tr>
        </thead>
        <tbody>
          {sale.items?.map((item) => (
            <tr key={item.id} className="border-b border-gray-100">
              <td className="py-2">{item.productName}</td>
              <td className="py-2 text-right">{item.quantity}</td>
              <td className="py-2 text-right">
                {formatCurrency(item.unitPrice)}
              </td>
              <td className="py-2 text-right">
                {formatCurrency(Number(item.unitPrice) * item.quantity)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 flex justify-end text-lg font-bold">
        Total (Rs): {formatCurrency(sale.totalAmount)}
      </div>

      {sale.notes ? (
        <p className="mt-4 text-sm text-gray-600">Notes: {sale.notes}</p>
      ) : null}

      <p className="mt-8 text-center text-xs text-stone-500">
        Thank you for your business
      </p>
    </div>
  );
}
