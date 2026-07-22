"use client";

import {
  HiOutlineCalendarDays,
  HiOutlineCube,
  HiOutlineCurrencyDollar,
  HiOutlineTag,
} from "react-icons/hi2";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { Product } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { useT } from "@/lib/i18n";

type ProductViewModalProps = {
  product: Product | null;
  onClose: () => void;
  onEdit?: (product: Product) => void;
};

export function ProductViewModal({
  product,
  onClose,
  onEdit,
}: ProductViewModalProps) {
  const t = useT();

  return (
    <Modal
      open={product !== null}
      title={t("products.viewTitle")}
      onClose={onClose}
      footer={
        product ? (
          <div className={`grid gap-3 ${onEdit ? "sm:grid-cols-2" : ""}`}>
            <Button variant="secondary" fullWidth onClick={onClose}>
              {t("common.close")}
            </Button>
            {onEdit ? (
              <Button
                fullWidth
                onClick={() => {
                  onEdit(product);
                  onClose();
                }}
              >
                {t("common.edit")}
              </Button>
            ) : null}
          </div>
        ) : null
      }
    >
      {product ? (
        <div className="space-y-6">
          <div className="flex flex-col items-center text-center">
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.imageUrl}
                alt={product.name}
                className="h-28 w-28 rounded-2xl object-cover ring-4 ring-amber-100"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-amber-100 text-4xl font-bold text-amber-800 ring-4 ring-amber-50">
                {product.name.trim().charAt(0).toUpperCase() || "?"}
              </div>
            )}
            <h3 className="mt-4 text-xl font-bold text-stone-900">
              {product.name}
            </h3>
            <span
              className={`mt-2 rounded-full px-3 py-1 text-xs font-semibold ${
                product.isActive
                  ? "bg-green-100 text-green-800"
                  : "bg-stone-200 text-stone-700"
              }`}
            >
              {product.isActive ? t("common.active") : t("common.disabled")}
            </span>
            {product.description ? (
              <p className="mt-3 max-w-md text-sm text-stone-600">
                {product.description}
              </p>
            ) : null}
          </div>

          <dl className="overflow-hidden rounded-xl border border-amber-100 bg-amber-50/30">
            <DetailRow
              icon={<HiOutlineTag className="h-5 w-5" />}
              label={t("common.category")}
              value={product.category}
            />
            <DetailRow
              icon={<HiOutlineCurrencyDollar className="h-5 w-5" />}
              label={t("products.colPriceRs")}
              value={formatCurrency(product.price)}
            />
            <DetailRow
              icon={<HiOutlineCube className="h-5 w-5" />}
              label={t("products.colStock")}
              value={String(product.stockAvailable)}
            />
            <DetailRow
              icon={<HiOutlineCalendarDays className="h-5 w-5" />}
              label={t("products.colCreated")}
              value={new Date(product.createdAt).toLocaleDateString()}
              last
            />
          </dl>
        </div>
      ) : null}
    </Modal>
  );
}

function DetailRow({
  icon,
  label,
  value,
  last = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 ${
        last ? "" : "border-b border-amber-100"
      }`}
    >
      <span className="mt-0.5 text-amber-700">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs font-medium text-stone-500">{label}</dt>
        <dd className="break-words text-sm font-semibold text-stone-900">
          {value}
        </dd>
      </div>
    </div>
  );
}
