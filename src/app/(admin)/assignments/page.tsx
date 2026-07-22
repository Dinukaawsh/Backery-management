"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { HiOutlineEye } from "react-icons/hi2";

import {
  AssignmentPartnerViewModal,
  type PartnerAssignmentGroup,
} from "@/components/AssignmentPartnerViewModal";
import { useBusinessSettings } from "@/components/BusinessSettingsProvider";
import { Button } from "@/components/ui/Button";
import { ClearFiltersButton } from "@/components/ui/ClearFiltersButton";
import { TableSearchBar } from "@/components/ui/DataTable";
import { DateInput } from "@/components/ui/DateInput";
import {
  DownloadPdfButton,
  PageHeaderActions,
} from "@/components/ui/DownloadPdfButton";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
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

function groupByPartner(summary: AllocationSummary[]): PartnerAssignmentGroup[] {
  const map = new Map<number, PartnerAssignmentGroup>();

  for (const row of summary) {
    const existing = map.get(row.deliveryGuyId);
    if (existing) {
      existing.items.push(row);
      existing.totalAllocated += row.allocated;
      existing.totalSold += row.sold;
      existing.totalRemaining += row.remaining;
      continue;
    }

    map.set(row.deliveryGuyId, {
      deliveryGuyId: row.deliveryGuyId,
      deliveryGuyName: row.deliveryGuyName,
      items: [row],
      totalAllocated: row.allocated,
      totalSold: row.sold,
      totalRemaining: row.remaining,
    });
  }

  return Array.from(map.values()).sort((a, b) =>
    a.deliveryGuyName.localeCompare(b.deliveryGuyName),
  );
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
  const [viewing, setViewing] = useState<PartnerAssignmentGroup | null>(null);
  const [partnerSearch, setPartnerSearch] = useState("");

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

  const partnerGroups = useMemo(() => groupByPartner(summary), [summary]);

  const filteredGroups = useMemo(() => {
    const query = partnerSearch.trim().toLowerCase();
    if (!query) return partnerGroups;

    return partnerGroups.filter((group) => {
      if (group.deliveryGuyName.toLowerCase().includes(query)) return true;
      return group.items.some((item) =>
        item.productName.toLowerCase().includes(query),
      );
    });
  }, [partnerGroups, partnerSearch]);

  const activeProducts = products.filter((p) => p.isActive);

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

    const productIds = items.map((item) => item.productId);
    if (new Set(productIds).size !== productIds.length) {
      toast.error(t("assignments.duplicateProductsError"));
      return;
    }

    for (const item of items) {
      const product = activeProducts.find((row) => row.id === item.productId);
      if (!product) {
        toast.error(t("assignments.addProductError"));
        return;
      }
      if (item.quantity > product.stockAvailable) {
        toast.error(
          t("assignments.quantityExceedsStockNamed", {
            name: product.name,
            stock: product.stockAvailable,
          }),
        );
        return;
      }
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

      {loading ? (
        <LoadingSpinner fullPage label={t("common.loading")} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
          <div className="border-b border-amber-100 p-4">
            <TableSearchBar
              value={partnerSearch}
              onChange={setPartnerSearch}
              placeholder={t("assignments.searchPartners")}
            />
          </div>

          {filteredGroups.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-stone-600">
              {partnerSearch.trim()
                ? t("table.noMatching")
                : t("assignments.emptySummary")}
            </p>
          ) : (
            <ul className="divide-y divide-amber-50">
              {filteredGroups.map((group) => (
                <li key={group.deliveryGuyId}>
                  <button
                    type="button"
                    onClick={() => setViewing(group)}
                    className="flex w-full flex-col gap-3 px-4 py-4 text-left transition hover:bg-amber-50/50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-stone-900">
                        {group.deliveryGuyName}
                      </p>
                      <p className="mt-0.5 text-sm text-stone-600">
                        {t("assignments.productCount", {
                          count: group.items.length,
                        })}
                        {" · "}
                        {group.items
                          .slice(0, 3)
                          .map((item) => item.productName)
                          .join(", ")}
                        {group.items.length > 3 ? "…" : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 sm:shrink-0">
                      <div className="flex gap-3 text-xs text-stone-600">
                        <span>
                          {t("assignments.colGiven")}:{" "}
                          <strong className="text-stone-900">
                            {group.totalAllocated}
                          </strong>
                        </span>
                        <span>
                          {t("assignments.colSold")}:{" "}
                          <strong className="text-stone-900">
                            {group.totalSold}
                          </strong>
                        </span>
                        <span>
                          {t("assignments.colRemaining")}:{" "}
                          <strong className="text-stone-900">
                            {group.totalRemaining}
                          </strong>
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-amber-800">
                        <HiOutlineEye className="h-4 w-4" aria-hidden />
                        {t("assignments.viewDetails")}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <AssignmentPartnerViewModal
        group={viewing}
        date={date}
        onClose={() => setViewing(null)}
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

          {lines.map((line, index) => {
            const selectedElsewhere = new Set(
              lines
                .map((item, itemIndex) =>
                  itemIndex !== index && item.productId
                    ? item.productId
                    : null,
                )
                .filter((id): id is string => Boolean(id)),
            );
            const selectedProduct = activeProducts.find(
              (product) => String(product.id) === line.productId,
            );
            const maxStock = selectedProduct?.stockAvailable ?? undefined;
            const quantityValue = Number(line.quantity);
            const quantityOverStock =
              selectedProduct &&
              line.quantity !== "" &&
              Number.isFinite(quantityValue) &&
              quantityValue > selectedProduct.stockAvailable;

            return (
              <div key={index} className="grid gap-3 sm:grid-cols-2">
                <Select
                  label={t("common.product")}
                  value={line.productId}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (
                      value &&
                      lines.some(
                        (item, itemIndex) =>
                          itemIndex !== index && item.productId === value,
                      )
                    ) {
                      toast.error(t("assignments.productAlreadySelected"));
                      return;
                    }
                    const product = activeProducts.find(
                      (row) => String(row.id) === value,
                    );
                    const next = [...lines];
                    let quantity = next[index].quantity;
                    if (
                      product &&
                      quantity !== "" &&
                      Number(quantity) > product.stockAvailable
                    ) {
                      quantity = String(product.stockAvailable);
                    }
                    next[index] = {
                      ...next[index],
                      productId: value,
                      quantity,
                    };
                    setLines(next);
                  }}
                >
                  <option value="">{t("assignments.selectProduct")}</option>
                  {activeProducts.map((product) => {
                    const id = String(product.id);
                    const taken = selectedElsewhere.has(id);
                    return (
                      <option key={product.id} value={product.id} disabled={taken}>
                        {t("assignments.productStockOption", {
                          name: product.name,
                          stock: product.stockAvailable,
                        })}
                        {taken
                          ? t("assignments.productAlreadySelectedSuffix")
                          : ""}
                      </option>
                    );
                  })}
                </Select>
                <Input
                  label={t("common.quantity")}
                  type="number"
                  min={1}
                  max={maxStock}
                  value={line.quantity}
                  disabled={!line.productId}
                  error={
                    quantityOverStock && selectedProduct
                      ? t("assignments.quantityExceedsStock", {
                          stock: selectedProduct.stockAvailable,
                        })
                      : undefined
                  }
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") {
                      const next = [...lines];
                      next[index] = { ...next[index], quantity: "" };
                      setLines(next);
                      return;
                    }

                    if (!/^\d+$/.test(raw)) return;

                    let quantity = Number(raw);
                    if (quantity < 1) quantity = 1;

                    if (
                      selectedProduct &&
                      quantity > selectedProduct.stockAvailable
                    ) {
                      quantity = selectedProduct.stockAvailable;
                      toast.error(
                        t("assignments.quantityExceedsStock", {
                          stock: selectedProduct.stockAvailable,
                        }),
                      );
                    }

                    const next = [...lines];
                    next[index] = {
                      ...next[index],
                      quantity: String(quantity),
                    };
                    setLines(next);
                  }}
                />
              </div>
            );
          })}

          <Button
            variant="secondary"
            disabled={
              activeProducts.length > 0 &&
              lines.filter((line) => line.productId).length >=
                activeProducts.length
            }
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
