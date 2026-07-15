"use client";

import { useCallback, useEffect, useState } from "react";
import { HiOutlineTableCells } from "react-icons/hi2";

import { BillModal } from "@/components/BillModal";
import { useBusinessSettings } from "@/components/BusinessSettingsProvider";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Column, DataTable } from "@/components/ui/DataTable";
import { DateInput } from "@/components/ui/DateInput";
import {
  DownloadPdfButton,
  PageHeaderActions,
} from "@/components/ui/DownloadPdfButton";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/ToastProvider";
import {
  fetchDeliveryGuys,
  fetchShopDrops,
  type DeliveryGuy,
  type ShopDropSummary,
} from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { downloadCsv } from "@/lib/export-csv";
import { buildSalesFilterSubtitle, downloadPdf } from "@/lib/export-pdf";
import { useT } from "@/lib/i18n";

function formatDropItems(drop: ShopDropSummary) {
  return drop.items
    .map((item) => `${item.productName} × ${item.quantity}`)
    .join(", ");
}

function todayDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function SalesPage() {
  const toast = useToast();
  const t = useT();
  const { settings } = useBusinessSettings();
  const [groups, setGroups] = useState<ShopDropSummary[]>([]);
  const [deliveryGuys, setDeliveryGuys] = useState<DeliveryGuy[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deliveryGuyId, setDeliveryGuyId] = useState("");
  const [todayOnly, setTodayOnly] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<ShopDropSummary | null>(
    null,
  );
  const [billSaleId, setBillSaleId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: {
        date?: string;
        dateFrom?: string;
        dateTo?: string;
        deliveryGuyId?: number;
      } = {
        deliveryGuyId: deliveryGuyId ? Number(deliveryGuyId) : undefined,
      };

      if (todayOnly) {
        params.date = todayDateString();
      } else if (dateFrom && dateTo) {
        params.dateFrom = dateFrom;
        params.dateTo = dateTo;
      } else if (dateFrom) {
        params.date = dateFrom;
      } else if (dateTo) {
        params.dateTo = dateTo;
      }

      setGroups(await fetchShopDrops(params));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("sales.failedToLoad"));
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, deliveryGuyId, todayOnly, t, toast]);

  useEffect(() => {
    void fetchDeliveryGuys().then(setDeliveryGuys).catch(() => undefined);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function getFilterSubtitle() {
    const guy = deliveryGuys.find((item) => String(item.id) === deliveryGuyId);
    return buildSalesFilterSubtitle(
      {
        dateFrom: todayOnly ? todayDateString() : dateFrom || undefined,
        dateTo: todayOnly ? todayDateString() : dateTo || undefined,
        deliveryGuyName: guy?.name,
        todayOnly,
      },
      (key, params) => t(key as Parameters<typeof t>[0], params),
    );
  }

  function handleExportPdf() {
    if (!groups.length) {
      toast.error(t("sales.noExport"));
      return;
    }

    const totalRevenue = groups.reduce(
      (sum, group) => sum + Number(group.totalAmount),
      0,
    );

    downloadPdf({
      filename: "sales-report",
      title: t("sales.pdfTitle"),
      subtitle: t("sales.pdfSubtitleStats", {
        filter: getFilterSubtitle(),
        count: groups.length,
        total: formatCurrency(totalRevenue),
      }),
      business: settings,
      sections: [
        {
          headers: [
            t("sales.colDate"),
            t("sales.colShop"),
            t("sales.colDeliveryPartner"),
            t("sales.colItemsDropped"),
            t("sales.colTotalQty"),
            t("sales.colTotalRs"),
            t("sales.colSales"),
          ],
          rows: groups.map((group) => [
            group.dropDate,
            group.shopName,
            group.deliveryGuyName,
            formatDropItems(group),
            String(group.totalQuantity),
            formatCurrency(group.totalAmount),
            String(group.saleCount),
          ]),
        },
      ],
    });
    toast.success(t("sales.pdfDownloadedToast"));
  }

  function handleExportCsv() {
    if (!groups.length) {
      toast.error(t("sales.noExport"));
      return;
    }

    downloadCsv("bakery-sales-report.csv", [
      [
        t("sales.colDate"),
        t("sales.colShop"),
        t("sales.colDeliveryPartner"),
        t("sales.colItemsDropped"),
        t("sales.colTotalQty"),
        t("sales.colTotalRs"),
        t("sales.colSales"),
      ],
      ...groups.map((group) => [
        group.dropDate,
        group.shopName,
        group.deliveryGuyName,
        formatDropItems(group),
        String(group.totalQuantity),
        formatCurrency(group.totalAmount),
        String(group.saleCount),
      ]),
    ]);
    toast.success(t("sales.csvDownloadedToast"));
  }

  const columns: Column<ShopDropSummary>[] = [
    {
      key: "date",
      header: t("sales.colDate"),
      render: (g) => g.dropDate,
    },
    { key: "shop", header: t("sales.colShop"), render: (g) => g.shopName },
    {
      key: "delivery",
      header: t("sales.colDeliveryPartner"),
      render: (g) => g.deliveryGuyName,
    },
    {
      key: "items",
      header: t("sales.colItemsDropped"),
      render: (g) => (
        <span className="text-sm text-stone-700">{formatDropItems(g)}</span>
      ),
    },
    {
      key: "qty",
      header: t("sales.colTotalQty"),
      render: (g) => g.totalQuantity,
    },
    {
      key: "total",
      header: t("sales.colTotalRs"),
      render: (g) => formatCurrency(g.totalAmount),
    },
    {
      key: "sales",
      header: t("sales.colSales"),
      render: (g) => t("sales.saleCount", { count: g.saleCount }),
    },
    {
      key: "view",
      header: t("sales.colBill"),
      render: (group) => (
        <button
          type="button"
          className="text-amber-700 hover:underline"
          onClick={() => setSelectedGroup(group)}
        >
          {t("sales.view")}
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t("sales.title")}
        description={t("sales.description")}
        action={
          <PageHeaderActions>
            <DownloadPdfButton
              onClick={handleExportPdf}
              disabled={!groups.length || loading}
            />
            <Button
              variant="secondary"
              onClick={handleExportCsv}
              disabled={!groups.length || loading}
            >
              <span className="inline-flex items-center gap-2">
                <HiOutlineTableCells className="h-4 w-4" aria-hidden />
                {t("sales.downloadCsv")}
              </span>
            </Button>
          </PageHeaderActions>
        }
      />

      <div className="mb-6 grid gap-4 rounded-2xl border border-amber-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <DateInput
          label={t("sales.from")}
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          disabled={todayOnly}
        />
        <DateInput
          label={t("sales.to")}
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          disabled={todayOnly}
        />
        <Select
          label={t("sales.deliveryPartner")}
          value={deliveryGuyId}
          onChange={(e) => setDeliveryGuyId(e.target.value)}
        >
          <option value="">{t("sales.all")}</option>
          {deliveryGuys.map((guy) => (
            <option key={guy.id} value={guy.id}>
              {guy.name}
            </option>
          ))}
        </Select>
        <div className="flex items-end">
          <Checkbox
            label={t("sales.todayOnly")}
            checked={todayOnly}
            onChange={setTodayOnly}
            description={t("sales.todayOnlyDescription")}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={groups}
        loading={loading}
        rowKey={(row) =>
          `${row.shopId}-${row.deliveryGuyId}-${row.dropDate}`
        }
        emptyMessage={t("sales.empty")}
        pageSize={10}
        getSearchText={(group) =>
          [
            group.shopName,
            group.deliveryGuyName,
            group.dropDate,
            formatDropItems(group),
            group.totalQuantity,
            group.totalAmount,
            group.saleCount,
          ].join(" ")
        }
        searchPlaceholder={t("sales.searchPlaceholder")}
      />

      <Modal
        open={selectedGroup !== null}
        title={
          selectedGroup
            ? t("sales.groupTitle", {
                shop: selectedGroup.shopName,
                date: selectedGroup.dropDate,
              })
            : t("sales.title")
        }
        onClose={() => setSelectedGroup(null)}
        size="lg"
      >
        {selectedGroup ? (
          <div className="space-y-4">
            <p className="text-sm text-stone-600">{t("sales.groupHint")}</p>
            <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-stone-800">
              <p>
                <span className="font-medium">{t("sales.colDeliveryPartner")}: </span>
                {selectedGroup.deliveryGuyName}
              </p>
              <p className="mt-1">
                <span className="font-medium">{t("sales.colItemsDropped")}: </span>
                {formatDropItems(selectedGroup)}
              </p>
              <p className="mt-1">
                <span className="font-medium">{t("sales.colTotalRs")}: </span>
                {formatCurrency(selectedGroup.totalAmount)}
              </p>
            </div>
            <ul className="space-y-2">
              {selectedGroup.sales.map((sale) => (
                <li
                  key={sale.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-100 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-stone-900">
                      {new Date(sale.saleDate).toLocaleString()}
                    </p>
                    <p className="text-sm text-stone-600">
                      {sale.items
                        .map((item) => `${item.productName} × ${item.quantity}`)
                        .join(", ")}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-stone-800">
                      {formatCurrency(sale.totalAmount)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-sm font-medium text-amber-700 hover:underline"
                    onClick={() => setBillSaleId(sale.id)}
                  >
                    {sale.billPrinted
                      ? t("sales.viewBill")
                      : t("sales.printBill")}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Modal>

      <BillModal
        saleId={billSaleId}
        onClose={() => {
          setBillSaleId(null);
          void load();
        }}
      />
    </div>
  );
}
