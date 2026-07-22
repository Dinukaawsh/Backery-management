"use client";

import { useCallback, useEffect, useState } from "react";

import { useBusinessSettings } from "@/components/BusinessSettingsProvider";
import { Button } from "@/components/ui/Button";
import { ClearFiltersButton } from "@/components/ui/ClearFiltersButton";
import { Column, DataTable } from "@/components/ui/DataTable";
import { DateInput } from "@/components/ui/DateInput";
import {
  DownloadPdfButton,
  PageHeaderActions,
} from "@/components/ui/DownloadPdfButton";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/ToastProvider";
import {
  createAllocation,
  fetchAllocations,
  fetchDeliveryGuys,
  fetchProducts,
  type AllocationSummary,
  type DeliveryGuy,
  type Product,
} from "@/lib/api";
import { downloadPdf } from "@/lib/export-pdf";
import { useT } from "@/lib/i18n";

type AssignLine = { productId: string; quantity: string };

function todayDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export default function AssignmentsPage() {
  const toast = useToast();
  const t = useT();
  const { settings } = useBusinessSettings();
  const [date, setDate] = useState(todayDateString);
  const [deliveryGuyId, setDeliveryGuyId] = useState("");
  const [summary, setSummary] = useState<AllocationSummary[]>([]);
  const [deliveryGuys, setDeliveryGuys] = useState<DeliveryGuy[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [assignGuyId, setAssignGuyId] = useState("");
  const [lines, setLines] = useState<AssignLine[]>([
    { productId: "", quantity: "" },
  ]);
  const [saving, setSaving] = useState(false);

  const filtersActive =
    deliveryGuyId !== "" || date !== todayDateString();

  function clearFilters() {
    setDate(todayDateString());
    setDeliveryGuyId("");
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllocations({
        date,
        deliveryGuyId: deliveryGuyId ? Number(deliveryGuyId) : undefined,
      });
      setSummary(data.summary);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.failedToLoad"));
    } finally {
      setLoading(false);
    }
  }, [date, deliveryGuyId, toast, t]);

  useEffect(() => {
    void fetchDeliveryGuys()
      .then(setDeliveryGuys)
      .catch((err) =>
        toast.error(
          err instanceof Error ? err.message : t("assignments.failedLoadPartners"),
        ),
      );
    void fetchProducts()
      .then(setProducts)
      .catch((err) =>
        toast.error(
          err instanceof Error ? err.message : t("assignments.failedLoadProducts"),
        ),
      );
  }, [toast, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAssign() {
    if (!assignGuyId) {
      toast.error(t("assignments.selectPartnerError"));
      return;
    }

    const items = lines
      .map((line) => ({
        productId: Number(line.productId),
        quantity: Number(line.quantity),
      }))
      .filter((line) => line.productId > 0 && line.quantity > 0);

    if (items.length === 0) {
      toast.error(t("assignments.addProductError"));
      return;
    }

    setSaving(true);
    try {
      await createAllocation({
        deliveryGuyId: Number(assignGuyId),
        allocationDate: date,
        items,
      });
      setModalOpen(false);
      setLines([{ productId: "", quantity: "" }]);
      toast.success(t("assignments.assignedToast"));
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("assignments.assignFailed"));
    } finally {
      setSaving(false);
    }
  }

  function handleExportPdf() {
    if (!summary.length) {
      toast.error(t("assignments.noExport"));
      return;
    }

    const guy = deliveryGuys.find((item) => String(item.id) === deliveryGuyId);
    const filterLabel = guy
      ? t("assignments.pdfFilterPartner", { date, name: guy.name })
      : t("assignments.pdfFilterAll", { date });

    downloadPdf({
      filename: "stock-assignments",
      title: t("assignments.pdfTitle"),
      subtitle: filterLabel,
      business: settings,
      sections: [
        {
          heading: t("assignments.pdfSummaryHeading"),
          headers: [
            t("assignments.colPartner"),
            t("assignments.colProduct"),
            t("assignments.colGiven"),
            t("assignments.colSold"),
            t("assignments.colRemaining"),
          ],
          rows: summary.map((row) => [
            row.deliveryGuyName,
            row.productName,
            String(row.allocated),
            String(row.sold),
            String(row.remaining),
          ]),
        },
      ],
    });
    toast.success(t("assignments.pdfDownloadedToast"));
  }

  const summaryColumns: Column<AllocationSummary>[] = [
    {
      key: "guy",
      header: t("assignments.colPartner"),
      render: (row) => row.deliveryGuyName,
    },
    {
      key: "product",
      header: t("assignments.colProduct"),
      render: (row) => row.productName,
    },
    {
      key: "allocated",
      header: t("assignments.colGiven"),
      render: (row) => row.allocated,
    },
    { key: "sold", header: t("assignments.colSold"), render: (row) => row.sold },
    {
      key: "remaining",
      header: t("assignments.colRemaining"),
      render: (row) => (
        <span className={row.remaining === 0 ? "text-stone-500" : "font-medium"}>
          {row.remaining}
        </span>
      ),
    },
  ];

  const activeProducts = products.filter((p) => p.isActive);

  return (
    <div>
      <PageHeader
        title={t("assignments.title")}
        description={t("assignments.description")}
        action={
          <PageHeaderActions>
            <DownloadPdfButton
              onClick={handleExportPdf}
              disabled={!summary.length || loading}
            />
            <Button
              onClick={() => {
                setAssignGuyId(deliveryGuyId);
                setModalOpen(true);
              }}
            >
              {t("assignments.assignStock")}
            </Button>
          </PageHeaderActions>
        }
      />

      <div className="mb-6 grid gap-4 rounded-2xl border border-amber-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_1fr_auto]">
        <DateInput
          label={t("assignments.date")}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <Select
          label={t("assignments.filterByPartner")}
          value={deliveryGuyId}
          onChange={(e) => setDeliveryGuyId(e.target.value)}
        >
          <option value="">{t("assignments.allPartners")}</option>
          {deliveryGuys.map((guy) => (
            <option key={guy.id} value={guy.id}>
              {guy.name}
            </option>
          ))}
        </Select>
        <div className="flex items-end">
          <ClearFiltersButton active={filtersActive} onClear={clearFilters} />
        </div>
      </div>

      <h2 className="mb-3 text-lg font-semibold text-black">
        {t("assignments.summaryTitle")}
      </h2>
      <DataTable
        columns={summaryColumns}
        data={summary}
        loading={loading}
        rowKey={(row) => `${row.deliveryGuyId}-${row.productId}`}
        emptyMessage={t("assignments.emptySummary")}
        pageSize={10}
        getSearchText={(row) =>
          [
            row.deliveryGuyName,
            row.productName,
            row.allocated,
            row.sold,
            row.remaining,
          ].join(" ")
        }
        searchPlaceholder={t("assignments.searchSummary")}
      />

      <Modal
        open={modalOpen}
        title={t("assignments.assignStockModal")}
        onClose={() => setModalOpen(false)}
        size="lg"
        footer={
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" fullWidth onClick={() => setModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button fullWidth onClick={() => void handleAssign()} disabled={saving}>
              {saving ? t("assignments.assigning") : t("assignments.assignStockButton")}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Select
            label={t("common.deliveryPartner")}
            value={assignGuyId}
            onChange={(e) => setAssignGuyId(e.target.value)}
          >
            <option value="">{t("assignments.selectPartner")}</option>
            {deliveryGuys.map((guy) => (
              <option key={guy.id} value={guy.id} disabled={!guy.isActive}>
                {guy.name}
                {!guy.isActive ? t("assignments.partnerDisabledSuffix") : ""}
              </option>
            ))}
          </Select>

          {deliveryGuys.length === 0 ? (
            <p className="text-sm text-amber-800">
              {t("assignments.noPartnersRegistered")}
            </p>
          ) : null}
          {deliveryGuys.length > 0 &&
          deliveryGuys.every((guy) => !guy.isActive) ? (
            <p className="text-sm text-amber-800">
              {t("assignments.allPartnersDisabled")}
            </p>
          ) : null}

          <p className="text-sm text-stone-600">
            {t("assignments.assigningForDate", { date })}
          </p>

          {lines.map((line, index) => (
            <div key={index} className="grid gap-3 sm:grid-cols-2">
              <Select
                label={t("common.product")}
                value={line.productId}
                onChange={(e) => {
                  const next = [...lines];
                  next[index] = { ...next[index], productId: e.target.value };
                  setLines(next);
                }}
              >
                <option value="">{t("assignments.selectProduct")}</option>
                {activeProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {t("assignments.productStockOption", {
                      name: product.name,
                      stock: product.stockAvailable,
                    })}
                  </option>
                ))}
              </Select>
              <Input
                label={t("common.quantity")}
                type="number"
                min="1"
                value={line.quantity}
                onChange={(e) => {
                  const next = [...lines];
                  next[index] = { ...next[index], quantity: e.target.value };
                  setLines(next);
                }}
              />
            </div>
          ))}

          <Button
            variant="secondary"
            onClick={() =>
              setLines((current) => [...current, { productId: "", quantity: "" }])
            }
          >
            {t("assignments.addAnotherProduct")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
