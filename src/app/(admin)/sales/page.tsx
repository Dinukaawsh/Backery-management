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
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/ToastProvider";
import {
  fetchDeliveryGuys,
  fetchSales,
  type DeliveryGuy,
  type Sale,
} from "@/lib/api";
import { downloadCsv } from "@/lib/export-csv";
import { buildSalesFilterSubtitle, downloadPdf } from "@/lib/export-pdf";
import { formatCurrency } from "@/lib/currency";
import { useT } from "@/lib/i18n";

export default function SalesPage() {
  const toast = useToast();
  const t = useT();
  const { settings } = useBusinessSettings();
  const [sales, setSales] = useState<Sale[]>([]);
  const [deliveryGuys, setDeliveryGuys] = useState<DeliveryGuy[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deliveryGuyId, setDeliveryGuyId] = useState("");
  const [todayOnly, setTodayOnly] = useState(false);
  const [billSaleId, setBillSaleId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSales({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        deliveryGuyId: deliveryGuyId ? Number(deliveryGuyId) : undefined,
        today: todayOnly,
      });
      setSales(data);
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
    return buildSalesFilterSubtitle({
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      deliveryGuyName: guy?.name,
      todayOnly,
    });
  }

  function handleExportPdf() {
    if (!sales.length) {
      toast.error(t("sales.noExport"));
      return;
    }

    const totalRevenue = sales.reduce(
      (sum, sale) => sum + Number(sale.totalAmount),
      0,
    );

    downloadPdf({
      filename: "sales-report",
      title: t("sales.pdfTitle"),
      subtitle: `${getFilterSubtitle()}  •  ${sales.length} sale(s)  •  Total: ${formatCurrency(totalRevenue)}`,
      business: settings,
      sections: [
        {
          headers: [
            t("sales.colDate"),
            t("sales.colShop"),
            t("sales.colDeliveryPartner"),
            t("sales.colTotalRs"),
            t("sales.colBillPrinted"),
          ],
          rows: sales.map((sale) => [
            new Date(sale.saleDate).toLocaleString(),
            sale.shopName,
            sale.deliveryGuyName,
            formatCurrency(sale.totalAmount),
            sale.billPrinted ? t("common.yes") : t("common.no"),
          ]),
        },
      ],
    });
    toast.success(t("sales.pdfDownloadedToast"));
  }

  function handleExportCsv() {
    if (!sales.length) {
      toast.error(t("sales.noExport"));
      return;
    }

    downloadCsv("bakery-sales-report.csv", [
      [
        t("sales.colDate"),
        t("sales.colShop"),
        t("sales.colDeliveryPartner"),
        t("sales.colTotalRs"),
        t("sales.colBillPrinted"),
      ],
      ...sales.map((sale) => [
        new Date(sale.saleDate).toLocaleString(),
        sale.shopName,
        sale.deliveryGuyName,
        formatCurrency(sale.totalAmount),
        sale.billPrinted ? t("common.yes") : t("common.no"),
      ]),
    ]);
    toast.success(t("sales.csvDownloadedToast"));
  }

  const columns: Column<Sale>[] = [
    {
      key: "date",
      header: t("sales.colDate"),
      render: (s) => new Date(s.saleDate).toLocaleString(),
    },
    { key: "shop", header: t("sales.colShop"), render: (s) => s.shopName },
    {
      key: "delivery",
      header: t("sales.colDeliveryPartner"),
      render: (s) => s.deliveryGuyName,
    },
    {
      key: "total",
      header: t("sales.colTotalRs"),
      render: (s) => formatCurrency(s.totalAmount),
    },
    {
      key: "bill",
      header: t("sales.colBill"),
      render: (sale) => (
        <button
          type="button"
          className="text-amber-700 hover:underline"
          onClick={() => setBillSaleId(sale.id)}
        >
          {sale.billPrinted ? t("sales.viewBill") : t("sales.printBill")}
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
              disabled={!sales.length || loading}
            />
            <Button
              variant="secondary"
              onClick={handleExportCsv}
              disabled={!sales.length || loading}
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
        />
        <DateInput
          label={t("sales.to")}
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
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
        data={sales}
        loading={loading}
        rowKey={(row) => row.id}
        emptyMessage={t("sales.empty")}
        pageSize={10}
        getSearchText={(sale) =>
          [
            sale.shopName,
            sale.deliveryGuyName,
            sale.totalAmount,
            new Date(sale.saleDate).toLocaleString(),
            sale.billPrinted ? "printed" : "pending",
          ].join(" ")
        }
        searchPlaceholder={t("sales.searchPlaceholder")}
      />

      <BillModal saleId={billSaleId} onClose={() => setBillSaleId(null)} />
    </div>
  );
}
