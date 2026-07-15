"use client";

import { useEffect, useMemo, useState } from "react";
import { HiOutlinePrinter } from "react-icons/hi2";

import { BillBusinessHeader } from "@/components/BillBusinessHeader";
import { useBusinessSettings } from "@/components/BusinessSettingsProvider";
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

type BillModalProps = {
  saleId: number | null;
  onClose: () => void;
};

export function BillModal({ saleId, onClose }: BillModalProps) {
  const { settings } = useBusinessSettings();
  const toast = useToast();
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
        toast.error(err instanceof Error ? err.message : "Failed to load bill");
        onClose();
      })
      .finally(() => setLoading(false));
  }, [saleId, onClose, toast]);

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
      toast.success("Payment saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save payment");
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
      toast.error(err instanceof Error ? err.message : "Failed to update bill");
    }
  }

  return (
    <Modal
      open={saleId !== null}
      title={sale ? `Delivery Bill #${sale.id}` : "Delivery bill"}
      onClose={onClose}
      size="lg"
      footer={
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Button variant="secondary" fullWidth onClick={onClose}>
            Close
          </Button>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => void handleSavePayment()}
            disabled={!sale || loading || savingPayment}
          >
            {savingPayment ? "Saving..." : "Save payment"}
          </Button>
          <Button
            fullWidth
            onClick={() => void handlePrint()}
            disabled={!sale || loading}
            className="sm:col-span-1 col-span-2"
          >
            <span className="inline-flex items-center gap-2">
              <HiOutlinePrinter className="h-4 w-4" aria-hidden />
              Print bill
            </span>
          </Button>
        </div>
      }
    >
      {loading ? (
        <p className="text-sm text-stone-600">Loading bill...</p>
      ) : !sale ? (
        <p className="text-sm text-stone-600">Bill not available.</p>
      ) : (
        <div className="space-y-4">
          <div className="bill-print-area rounded-2xl border border-amber-100 bg-white p-5">
            <BillBusinessHeader
              settings={settings}
              subtitle={`Delivery Bill #${sale.id}`}
            />

            <div className="mt-6 grid gap-4 border-t border-amber-100 pt-4 text-sm sm:grid-cols-2">
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

            <table className="mt-6 w-full text-sm">
              <thead>
                <tr className="border-b border-amber-100">
                  <th className="py-2 text-left">Product</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Price (Rs)</th>
                  <th className="py-2 text-right">Total (Rs)</th>
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
                <span>Today&apos;s drop</span>
                <span>{formatCurrency(todayTotal)}</span>
              </div>
              {previousBalance > 0 ? (
                <div className="flex justify-between text-amber-800">
                  <span>Previous unpaid balance</span>
                  <span>{formatCurrency(previousBalance)}</span>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-amber-100 pt-2 font-bold">
                <span>Total due</span>
                <span>{formatCurrency(amountDue)}</span>
              </div>
              <div className="flex justify-between">
                <span>Paid</span>
                <span>{formatCurrency(paidPreview)}</span>
              </div>
              <div className="flex justify-between font-semibold text-red-700">
                <span>Remaining (carry forward)</span>
                <span>{formatCurrency(remainingPreview)}</span>
              </div>
            </div>

            {sale.notes ? (
              <p className="mt-3 text-sm text-stone-600">Notes: {sale.notes}</p>
            ) : null}

            <p className="mt-6 text-center text-xs text-stone-500">
              Thank you for your business
            </p>
          </div>

          <Input
            label="Amount paid (Rs)"
            type="number"
            min="0"
            step="0.01"
            value={paidInput}
            onChange={(e) => setPaidInput(e.target.value)}
          />
          <p className="text-xs text-stone-500">
            Current saved remaining for this bill: {formatCurrency(remainingAfter)}
          </p>
        </div>
      )}
    </Modal>
  );
}
