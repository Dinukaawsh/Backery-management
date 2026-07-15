"use client";

import { useCallback, useEffect, useState } from "react";
import { HiOutlineTrash } from "react-icons/hi2";

import { useBusinessSettings } from "@/components/BusinessSettingsProvider";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Column, DataTable } from "@/components/ui/DataTable";
import { DateInput } from "@/components/ui/DateInput";
import {
  DownloadPdfButton,
  PageHeaderActions,
} from "@/components/ui/DownloadPdfButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/ToastProvider";
import {
  deleteAllocation,
  fetchAllocations,
  fetchDeliveryGuys,
  type AllocationRecord,
  type DeliveryGuy,
} from "@/lib/api";
import { downloadPdf } from "@/lib/export-pdf";
import { useT } from "@/lib/i18n";

export default function AssignmentHistoryPage() {
  const toast = useToast();
  const t = useT();
  const { settings } = useBusinessSettings();
  const [deliveryGuyId, setDeliveryGuyId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [allocations, setAllocations] = useState<AllocationRecord[]>([]);
  const [deliveryGuys, setDeliveryGuys] = useState<DeliveryGuy[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<AllocationRecord | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllocations({
        deliveryGuyId: deliveryGuyId ? Number(deliveryGuyId) : undefined,
        historyDate:
          dateFrom && !dateTo
            ? dateFrom
            : !dateFrom && dateTo
              ? dateTo
              : undefined,
        historyDateFrom: dateFrom && dateTo ? dateFrom : undefined,
        historyDateTo: dateFrom && dateTo ? dateTo : undefined,
      });
      setAllocations(data.allocations);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.failedToLoad"));
    } finally {
      setLoading(false);
    }
  }, [deliveryGuyId, dateFrom, dateTo, toast, t]);

  useEffect(() => {
    void fetchDeliveryGuys()
      .then(setDeliveryGuys)
      .catch((err) =>
        toast.error(
          err instanceof Error ? err.message : t("assignments.failedLoadPartners"),
        ),
      );
  }, [toast, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function confirmDeleteAllocation() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAllocation(deleteTarget.id);
      setDeleteTarget(null);
      toast.success(t("assignments.removedToast"));
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.deleteFailed"));
    } finally {
      setDeleting(false);
    }
  }

  function filterLabel() {
    const guy = deliveryGuys.find((item) => String(item.id) === deliveryGuyId);
    const parts: string[] = [];
    if (guy) {
      parts.push(t("assignments.pdfHistoryFilterPartner", { name: guy.name }));
    } else {
      parts.push(t("assignments.pdfHistoryFilterAll"));
    }
    if (dateFrom && dateTo) {
      parts.push(t("shops.periodRange", { from: dateFrom, to: dateTo }));
    } else if (dateFrom || dateTo) {
      parts.push(dateFrom || dateTo);
    }
    return parts.join("  •  ");
  }

  function handleExportPdf() {
    if (!allocations.length) {
      toast.error(t("assignments.historyNoExport"));
      return;
    }

    downloadPdf({
      filename: "assignment-history",
      title: t("nav.assignmentHistory"),
      subtitle: filterLabel(),
      business: settings,
      sections: [
        {
          heading: t("assignments.pdfHistoryHeading"),
          headers: [
            t("assignments.colPartner"),
            t("assignments.colProduct"),
            t("assignments.colQuantity"),
            t("assignments.colDate"),
            t("assignments.colAssignedAt"),
          ],
          rows: allocations.map((row) => [
            row.deliveryGuyName,
            row.productName,
            String(row.quantity),
            new Intl.DateTimeFormat("en-CA", {
              timeZone: "Asia/Colombo",
            }).format(new Date(row.allocationDate)),
            new Date(row.createdAt).toLocaleString(),
          ]),
        },
      ],
    });
    toast.success(t("assignments.pdfDownloadedToast"));
  }

  const allocationColumns: Column<AllocationRecord>[] = [
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
      key: "qty",
      header: t("assignments.colQuantity"),
      render: (row) => row.quantity,
    },
    {
      key: "date",
      header: t("assignments.colDate"),
      render: (row) =>
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Colombo",
        }).format(new Date(row.allocationDate)),
    },
    {
      key: "time",
      header: t("assignments.colAssignedAt"),
      render: (row) => new Date(row.createdAt).toLocaleString(),
    },
    {
      key: "actions",
      header: t("assignments.colActions"),
      render: (row) => (
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-red-600 hover:bg-red-50"
          onClick={() => setDeleteTarget(row)}
        >
          <HiOutlineTrash className="h-4 w-4 shrink-0" aria-hidden />
          {t("common.remove")}
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t("nav.assignmentHistory")}
        description={t("assignments.historyHint")}
        action={
          <PageHeaderActions>
            <DownloadPdfButton
              onClick={handleExportPdf}
              disabled={!allocations.length || loading}
            />
          </PageHeaderActions>
        }
      />

      <div className="mb-6 grid gap-4 rounded-2xl border border-amber-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
        <DateInput
          label={t("assignments.fromDate")}
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <DateInput
          label={t("assignments.toDateOptional")}
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
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
      </div>

      <DataTable
        columns={allocationColumns}
        data={allocations}
        loading={loading}
        rowKey={(row) => row.id}
        emptyMessage={t("assignments.emptyHistory")}
        pageSize={8}
        getSearchText={(row) =>
          [
            row.deliveryGuyName,
            row.productName,
            row.quantity,
            row.allocationDate,
            new Date(row.createdAt).toLocaleString(),
          ].join(" ")
        }
        searchPlaceholder={t("assignments.searchHistory")}
      />

      <ConfirmModal
        open={deleteTarget !== null}
        title={t("assignments.removeTitle")}
        message={t("assignments.removeMessage", {
          quantity: deleteTarget?.quantity ?? 0,
          productName: deleteTarget?.productName ?? "",
          deliveryGuyName: deleteTarget?.deliveryGuyName ?? "",
        })}
        confirmLabel={t("common.remove")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        loading={deleting}
        onConfirm={() => void confirmDeleteAllocation()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
