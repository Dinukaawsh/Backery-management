"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { HiOutlineTableCells } from "react-icons/hi2";

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

export default function SalesPage() {
  const toast = useToast();
  const { settings } = useBusinessSettings();
  const [sales, setSales] = useState<Sale[]>([]);
  const [deliveryGuys, setDeliveryGuys] = useState<DeliveryGuy[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deliveryGuyId, setDeliveryGuyId] = useState("");
  const [todayOnly, setTodayOnly] = useState(false);

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
      toast.error(err instanceof Error ? err.message : "Failed to load sales");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, deliveryGuyId, todayOnly]);

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
      toast.error("No sales to export for the selected filters");
      return;
    }

    const totalRevenue = sales.reduce(
      (sum, sale) => sum + Number(sale.totalAmount),
      0,
    );

    downloadPdf({
      filename: "sales-report",
      title: "Sales Report",
      subtitle: `${getFilterSubtitle()}  •  ${sales.length} sale(s)  •  Total: ${formatCurrency(totalRevenue)}`,
      business: settings,
      sections: [
        {
          headers: [
            "Date",
            "Shop",
            "Delivery Guy",
            "Total (Rs)",
            "Bill Printed",
          ],
          rows: sales.map((sale) => [
            new Date(sale.saleDate).toLocaleString(),
            sale.shopName,
            sale.deliveryGuyName,
            formatCurrency(sale.totalAmount),
            sale.billPrinted ? "Yes" : "No",
          ]),
        },
      ],
    });
    toast.success("Sales PDF downloaded");
  }

  function handleExportCsv() {
    if (!sales.length) {
      toast.error("No sales to export for the selected filters");
      return;
    }

    downloadCsv("bakery-sales-report.csv", [
      ["Date", "Shop", "Delivery Guy", "Total (Rs)", "Bill Printed"],
      ...sales.map((sale) => [
        new Date(sale.saleDate).toLocaleString(),
        sale.shopName,
        sale.deliveryGuyName,
        formatCurrency(sale.totalAmount),
        sale.billPrinted ? "Yes" : "No",
      ]),
    ]);
    toast.success("Sales CSV downloaded");
  }

  const columns: Column<Sale>[] = [
    {
      key: "date",
      header: "Date",
      render: (s) => new Date(s.saleDate).toLocaleString(),
    },
    { key: "shop", header: "Shop", render: (s) => s.shopName },
    {
      key: "delivery",
      header: "Delivery guy",
      render: (s) => s.deliveryGuyName,
    },
    {
      key: "total",
      header: "Total (Rs)",
      render: (s) => formatCurrency(s.totalAmount),
    },
    {
      key: "bill",
      header: "Bill",
      render: (sale) => (
        <Link
          href={`/sales/${sale.id}/bill`}
          className="text-amber-700 hover:underline"
        >
          {sale.billPrinted ? "View bill" : "Print bill"}
        </Link>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Sales"
        description="Filter by date or delivery guy, then download the filtered sales report."
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
                Download CSV
              </span>
            </Button>
          </PageHeaderActions>
        }
      />

      <div className="mb-6 grid gap-4 rounded-2xl border border-amber-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <DateInput
          label="From"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <DateInput
          label="To"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
        <Select
          label="Delivery guy"
          value={deliveryGuyId}
          onChange={(e) => setDeliveryGuyId(e.target.value)}
        >
          <option value="">All</option>
          {deliveryGuys.map((guy) => (
            <option key={guy.id} value={guy.id}>
              {guy.name}
            </option>
          ))}
        </Select>
        <div className="flex items-end">
          <Checkbox
            label="Today only"
            checked={todayOnly}
            onChange={setTodayOnly}
            description="Show only today's sales"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={sales}
        loading={loading}
        rowKey={(row) => row.id}
        emptyMessage="No sales found for the selected filters."
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
        searchPlaceholder="Search sales..."
      />
    </div>
  );
}
