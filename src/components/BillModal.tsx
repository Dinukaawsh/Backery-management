"use client";

import { useEffect, useMemo, useState } from "react";
import { HiOutlinePrinter } from "react-icons/hi2";

import { BillBusinessHeader } from "@/components/BillBusinessHeader";
import { useBusinessSettings } from "@/components/BusinessSettingsProvider";
import { SaleComments } from "@/components/SaleComments";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import {
  getSale,
  markBillPrinted,
  settleSalePayment,
  type Sale,
} from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { useT } from "@/lib/i18n";

type BillModalProps = {
  saleId: number | null;
  onClose: () => void;
};

export function BillModal({ saleId, onClose }: BillModalProps) {
  const { settings } = useBusinessSettings();
  const toast = useToast();
  const t = useT();
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [paidInput, setPaidInput] = useState("");

  useEffect(() => {
    if (!saleId) {
      setSale(null);
      setPaidInput("");
      return;
    }

    setLoading(true);
    void getSale(saleId)
      .then((data) => {
        setSale(data);
        setPaidInput(data.paidAmount ?? "0");
      })
      .catch((err) => {
        toast.error(
          err instanceof Error ? err.message : t("bill.failedToLoad"),
        );
        onClose();
      })
      .finally(() => setLoading(false));
  }, [saleId, onClose, toast, t]);

  const previousBalance = Number(sale?.previousBalance ?? 0);
  const todayTotal = Number(sale?.totalAmount ?? 0);
  const amountDue = Number(sale?.amountDue ?? previousBalance + todayTotal);
  const remainingAfter = Number(sale?.remainingAfter ?? amountDue);

  const paidPreview = useMemo(() => {
    const paid = Number(paidInput);
    if (!Number.isFinite(paid) || paid < 0) return 0;
    return Math.min(paid, amountDue);
  }, [paidInput, amountDue]);

  const remainingPreview = Math.max(0, amountDue - paidPreview);

  async function handleSavePayment() {
    if (!sale) return;
    setSavingPayment(true);
    try {
      const updated = await settleSalePayment(sale.id, paidPreview);
      setSale(updated);
      setPaidInput(updated.paidAmount ?? String(paidPreview));
      toast.success(t("bill.paymentSavedToast"));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("bill.failedToSavePayment"),
      );
    } finally {
      setSavingPayment(false);
    }
  }

  async function handlePrint() {
    if (!sale) return;

    try {
      if (Number(paidInput) !== Number(sale.paidAmount ?? 0)) {
        const updated = await settleSalePayment(sale.id, paidPreview);
        setSale(updated);
        setPaidInput(updated.paidAmount ?? String(paidPreview));
      }
      if (!sale.billPrinted) {
        const updated = await markBillPrinted(sale.id);
        setSale(updated);
      }
      window.print();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("bill.failedToUpdate"),
      );
    }
  }

  return (
    <Modal
      open={saleId !== null}
      title={
        sale
          ? t("bill.titleWithId", { id: sale.id })
          : t("bill.title")
      }
      onClose={onClose}
      size="lg"
      footer={
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Button variant="secondary" fullWidth onClick={onClose}>
            {t("bill.close")}
          </Button>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => void handleSavePayment()}
            disabled={!sale || loading || savingPayment}
          >
            {savingPayment ? t("bill.saving") : t("bill.savePayment")}
          </Button>
          <Button
            fullWidth
            onClick={() => void handlePrint()}
            disabled={!sale || loading}
            className="sm:col-span-1 col-span-2"
          >
            <span className="inline-flex items-center gap-2">
              <HiOutlinePrinter className="h-4 w-4" aria-hidden />
              {t("bill.printBill")}
            </span>
          </Button>
        </div>
      }
    >
      {loading ? (
        <p className="text-sm text-stone-600">{t("bill.loading")}</p>
      ) : !sale ? (
        <p className="text-sm text-stone-600">{t("bill.notAvailable")}</p>
      ) : (
        <div className="space-y-4">
          <div className="bill-print-area rounded-2xl border border-amber-100 bg-white p-5">
            <BillBusinessHeader
              settings={settings}
              subtitle={t("bill.titleWithId", { id: sale.id })}
            />

            <div className="mt-6 grid gap-4 border-t border-amber-100 pt-4 text-sm sm:grid-cols-2">
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

            <table className="mt-6 w-full text-sm">
              <thead>
                <tr className="border-b border-amber-100">
                  <th className="py-2 text-left">{t("bill.product")}</th>
                  <th className="py-2 text-right">{t("bill.qty")}</th>
                  <th className="py-2 text-right">{t("bill.priceRs")}</th>
                  <th className="py-2 text-right">{t("bill.totalRs")}</th>
                </tr>
              </thead>
              <tbody>
                {sale.items?.map((item) => (
                  <tr key={item.id} className="border-b border-amber-50">
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

            <div className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span>{t("bill.todaysDrop")}</span>
                <span>{formatCurrency(todayTotal)}</span>
              </div>
              {previousBalance > 0 ? (
                <div className="flex justify-between text-amber-800">
                  <span>{t("bill.previousUnpaidBalance")}</span>
                  <span>{formatCurrency(previousBalance)}</span>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-amber-100 pt-2 font-bold">
                <span>{t("bill.totalDue")}</span>
                <span>{formatCurrency(amountDue)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("bill.paid")}</span>
                <span>{formatCurrency(paidPreview)}</span>
              </div>
              <div className="flex justify-between font-semibold text-red-700">
                <span>{t("bill.remainingCarryForward")}</span>
                <span>{formatCurrency(remainingPreview)}</span>
              </div>
            </div>

            {sale.notes ? (
              <p className="mt-3 text-sm text-stone-600">
                {t("common.notes", { notes: sale.notes })}
              </p>
            ) : null}

            <p className="mt-6 text-center text-xs text-stone-500">
              {t("bill.thankYou")}
            </p>
          </div>

          <Input
            label={t("bill.amountPaidRs")}
            type="number"
            min="0"
            step="0.01"
            value={paidInput}
            onChange={(e) => setPaidInput(e.target.value)}
          />
          <p className="text-xs text-stone-500">
            {t("bill.savedRemaining", {
              amount: formatCurrency(remainingAfter),
            })}
          </p>

          <SaleComments saleId={sale.id} />
        </div>
      )}
    </Modal>
  );
}
