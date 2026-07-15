"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { IconType } from "react-icons";
import {
  HiOutlineBuildingStorefront,
  HiOutlineChartBarSquare,
  HiOutlineCube,
  HiOutlineCurrencyDollar,
  HiOutlineTruck,
} from "react-icons/hi2";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { DateInput } from "@/components/ui/DateInput";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/ToastProvider";
import { getDashboard, type Sale } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { useT } from "@/lib/i18n";

function defaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 6);
  return {
    dateFrom: from.toISOString().slice(0, 10),
    dateTo: to.toISOString().slice(0, 10),
  };
}

function formatPeriodLabel(dateFrom: string, dateTo: string) {
  if (dateFrom === dateTo) {
    return new Date(`${dateFrom}T00:00:00`).toLocaleDateString();
  }
  return `${new Date(`${dateFrom}T00:00:00`).toLocaleDateString()} – ${new Date(`${dateTo}T00:00:00`).toLocaleDateString()}`;
}

export default function DashboardPage() {
  const toast = useToast();
  const t = useT();
  const defaults = defaultDateRange();
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(defaults.dateFrom);
  const [dateTo, setDateTo] = useState(defaults.dateTo);
  const [stats, setStats] = useState({
    periodSalesCount: 0,
    periodSalesTotal: "0",
    totalProducts: 0,
    totalDeliveryGuys: 0,
    totalShops: 0,
  });
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [dailySales, setDailySales] = useState<
    Array<{ day: string; total: string; count: number }>
  >([]);
  const [topDeliveryGuys, setTopDeliveryGuys] = useState<
    Array<{ name: string; total: string; count: number }>
  >([]);
  const [salesByShop, setSalesByShop] = useState<
    Array<{ name: string; total: string }>
  >([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDashboard({
        dateFrom,
        dateTo,
      });
      setStats(data.stats);
      setRecentSales(data.recentSales);
      setDailySales(data.dailySales);
      setTopDeliveryGuys(data.topDeliveryGuys);
      setSalesByShop(data.salesByShop);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.failedToLoad"));
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, toast, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const periodLabel = formatPeriodLabel(dateFrom, dateTo);

  const chartData = useMemo(
    () =>
      dailySales.map((row) => ({
        day: row.day.slice(5),
        revenue: Number(row.total),
        sales: row.count,
      })),
    [dailySales],
  );

  const deliveryChart = useMemo(
    () =>
      topDeliveryGuys.map((row) => ({
        name: row.name.split(" ")[0],
        revenue: Number(row.total),
      })),
    [topDeliveryGuys],
  );

  const shopChart = useMemo(
    () =>
      salesByShop.map((row) => ({
        name: row.name,
        revenue: Number(row.total),
      })),
    [salesByShop],
  );

  if (loading && !recentSales.length && stats.periodSalesCount === 0) {
    return <LoadingSpinner fullPage label={t("dashboard.loading")} />;
  }

  const cards: Array<{
    label: string;
    value: string | number;
    accent: string;
    icon: IconType;
  }> = [
    {
      label: t("dashboard.statSales"),
      value: stats.periodSalesCount,
      accent: "bg-amber-500",
      icon: HiOutlineChartBarSquare,
    },
    {
      label: t("dashboard.statRevenue"),
      value: formatCurrency(stats.periodSalesTotal),
      accent: "bg-orange-500",
      icon: HiOutlineCurrencyDollar,
    },
    {
      label: t("dashboard.statProducts"),
      value: stats.totalProducts,
      accent: "bg-amber-600",
      icon: HiOutlineCube,
    },
    {
      label: t("dashboard.statDeliveryPartners"),
      value: stats.totalDeliveryGuys,
      accent: "bg-orange-600",
      icon: HiOutlineTruck,
    },
    {
      label: t("dashboard.statShops"),
      value: stats.totalShops,
      accent: "bg-yellow-600",
      icon: HiOutlineBuildingStorefront,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("dashboard.title")}
        description={t("dashboard.description", { period: periodLabel })}
      />

      <div className="grid gap-4 rounded-2xl border border-amber-200 bg-white p-4 shadow-sm md:grid-cols-2">
        <DateInput
          label={t("dashboard.fromDate")}
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <DateInput
          label={t("dashboard.toDate")}
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm"
            >
              <div className={`h-1.5 ${card.accent}`} />
              <div className="p-5">
                <p className="flex items-center gap-2 text-sm text-stone-600">
                  <Icon className="h-4 w-4 text-amber-700" aria-hidden />
                  {card.label}
                </p>
                <p className="mt-2 text-3xl font-bold text-black">{card.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-black">
            {t("dashboard.revenueTrend")}
          </h2>
          <div className="h-72">
            {chartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-stone-600">
                {t("dashboard.noSalesInPeriod")}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#fde68a" />
                  <XAxis dataKey="day" stroke="#000" fontSize={12} />
                  <YAxis
                    stroke="#000"
                    fontSize={11}
                    tickFormatter={(v) => formatCurrency(Number(v))}
                  />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#d97706"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-black">
            {t("dashboard.topDeliveryPartners")}
          </h2>
          <div className="h-72">
            {deliveryChart.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-stone-600">
                {t("dashboard.noDeliveryData")}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deliveryChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#fde68a" />
                  <XAxis dataKey="name" stroke="#000" fontSize={12} />
                  <YAxis
                    stroke="#000"
                    fontSize={11}
                    tickFormatter={(v) => formatCurrency(Number(v))}
                  />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="revenue" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-black">
            {t("dashboard.salesByShop")}
          </h2>
          <div className="h-72">
            {shopChart.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-stone-600">
                {t("dashboard.noShopSales")}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={shopChart} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#fde68a" />
                  <XAxis
                    type="number"
                    stroke="#000"
                    fontSize={11}
                    tickFormatter={(v) => formatCurrency(Number(v))}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={90}
                    stroke="#000"
                    fontSize={12}
                  />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="revenue" fill="#fb923c" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-black">
            {t("dashboard.recentSales")}
          </h2>
          <div className="custom-scrollbar max-h-72 space-y-3 overflow-y-auto">
            {recentSales.length === 0 ? (
              <p className="text-sm text-stone-600">
                {t("dashboard.noSalesInPeriod")}
              </p>
            ) : (
              recentSales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between rounded-xl border border-amber-100 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-black">{sale.shopName}</p>
                    <p className="text-xs text-stone-600">
                      {sale.deliveryGuyName} •{" "}
                      {new Date(sale.saleDate).toLocaleString()}
                    </p>
                  </div>
                  <p className="font-semibold text-black">
                    {formatCurrency(sale.totalAmount)}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
