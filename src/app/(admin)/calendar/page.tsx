"use client";

import { format, getDay, parse } from "date-fns";
import { enUS } from "date-fns/locale";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  dateFnsLocalizer,
  type View,
} from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";

import { BillModal } from "@/components/BillModal";
import { DateInput } from "@/components/ui/DateInput";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/ToastProvider";
import {
  fetchShopDrops,
  type ShopDropSale,
  type ShopDropSummary,
} from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import {
  BUSINESS_TIMEZONE,
  colomboParts,
  endOfMonthKey,
  localDateString,
  parseDateInput,
  startOfMonthKey,
  weekRangeKeys,
} from "@/lib/dates";
import { useLocale, useT } from "@/lib/i18n";

type DayBucket = {
  dateKey: string;
  totalAmount: number;
  saleCount: number;
  groups: ShopDropSummary[];
};

type DayEventResource = {
  kind: "day";
  bucket: DayBucket;
};

type SaleEventResource = {
  kind: "sale";
  dateKey: string;
  sale: ShopDropSale;
  shopName: string;
  deliveryGuyName: string;
};

type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: DayEventResource | SaleEventResource;
};

/** Local noon for a YYYY-MM-DD civil date (matches calendar cells worldwide). */
function civilNoon(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

/** Map a sale timestamp to civil wall-clock in Sri Lanka for time-grid views. */
function saleCivilDate(iso: string) {
  const instant = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(instant);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return new Date(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") === 24 ? 0 : get("hour"),
    get("minute"),
    get("second"),
  );
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => {
    const { from } = weekRangeKeys(date);
    return civilNoon(from);
  },
  getDay,
  locales: { "en-US": enUS },
});

function formatItems(group: ShopDropSummary) {
  return group.items
    .map((item) => `${item.productName} × ${item.quantity}`)
    .join(", ");
}

/** Civil date of a calendar cell (same YYYY-MM-DD key as Colombo business day). */
function dayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function daysInMonth(date: Date) {
  const { year, month } = colomboParts(date);
  return new Date(year, month, 0).getDate();
}

/** Fetch window so each view includes every sale for that Colombo period. */
function rangeForView(date: Date, view: View) {
  const anchorKey = dayKey(date);

  if (view === "day") {
    return { from: anchorKey, to: anchorKey };
  }

  if (view === "week") {
    return weekRangeKeys(parseDateInput(anchorKey) ?? date);
  }

  const monthFrom = startOfMonthKey(parseDateInput(anchorKey) ?? date);
  const monthTo = endOfMonthKey(parseDateInput(anchorKey) ?? date);
  if (view === "month") {
    return {
      from: weekRangeKeys(parseDateInput(monthFrom) ?? date).from,
      to: weekRangeKeys(parseDateInput(monthTo) ?? date).to,
    };
  }

  return { from: monthFrom, to: monthTo };
}

function intlLocale(appLocale: string) {
  return appLocale === "si" ? "si-LK" : "en-US";
}

function buildYearOptions(centerYear: number) {
  const years: number[] = [];
  for (let y = centerYear - 8; y <= centerYear + 2; y += 1) {
    years.push(y);
  }
  return years;
}

const DAY_GRID_MIN = new Date(1970, 0, 1, 0, 0, 0);
const DAY_GRID_MAX = new Date(1970, 0, 1, 23, 59, 0);
const SALE_SLOT_MS = 30 * 60 * 1000;

export default function CalendarPage() {
  const t = useT();
  const { locale } = useLocale();
  const toast = useToast();
  const [currentDate, setCurrentDate] = useState(() =>
    civilNoon(localDateString()),
  );
  const [view, setView] = useState<View>("month");
  const [groups, setGroups] = useState<ShopDropSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [billSaleId, setBillSaleId] = useState<number | null>(null);

  const jumpDateValue = dayKey(currentDate);
  const parts = jumpDateValue.split("-").map(Number);
  const monthValue = String(parts[1] - 1);
  const yearValue = String(parts[0]);
  const yearOptions = useMemo(
    () => buildYearOptions(colomboParts().year),
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const range = rangeForView(currentDate, view);
      setGroups(
        await fetchShopDrops({
          dateFrom: range.from,
          dateTo: range.to,
        }),
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("calendar.failedToLoad"),
      );
    } finally {
      setLoading(false);
    }
  }, [currentDate, view, t, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const bucketsByDay = useMemo(() => {
    const map = new Map<string, DayBucket>();
    for (const group of groups) {
      const existing = map.get(group.dropDate);
      if (!existing) {
        map.set(group.dropDate, {
          dateKey: group.dropDate,
          totalAmount: Number(group.totalAmount),
          saleCount: group.saleCount,
          groups: [group],
        });
        continue;
      }
      existing.totalAmount += Number(group.totalAmount);
      existing.saleCount += group.saleCount;
      existing.groups.push(group);
    }
    return map;
  }, [groups]);

  const events = useMemo<CalendarEvent[]>(() => {
    const timedViews = view === "day" || view === "week";

    if (timedViews) {
      const timed: CalendarEvent[] = [];
      for (const group of groups) {
        for (const sale of group.sales) {
          const start = saleCivilDate(sale.saleDate);
          timed.push({
            id: `sale-${sale.id}`,
            title: t("calendar.saleEvent", {
              shop: group.shopName,
              total: formatCurrency(sale.totalAmount),
            }),
            start,
            end: new Date(start.getTime() + SALE_SLOT_MS),
            allDay: false,
            resource: {
              kind: "sale",
              dateKey: group.dropDate,
              sale,
              shopName: group.shopName,
              deliveryGuyName: group.deliveryGuyName,
            },
          });
        }
      }
      return timed.sort((a, b) => a.start.getTime() - b.start.getTime());
    }

    return Array.from(bucketsByDay.values()).map((bucket) => {
      const start = civilNoon(bucket.dateKey);
      return {
        id: `day-${bucket.dateKey}`,
        title: t("calendar.dayEvent", {
          count: bucket.saleCount,
          total: formatCurrency(bucket.totalAmount),
        }),
        start,
        end: start,
        allDay: true,
        resource: { kind: "day" as const, bucket },
      };
    });
  }, [bucketsByDay, groups, t, view]);

  const selectedBucket = selectedDay
    ? (bucketsByDay.get(selectedDay) ?? {
        dateKey: selectedDay,
        totalAmount: 0,
        saleCount: 0,
        groups: [],
      })
    : null;

  const scrollToTime = useMemo(() => {
    if (view !== "day" && view !== "week") return undefined;
    const first = events.find((event) => !event.allDay);
    if (first) return first.start;
    return new Date(1970, 0, 1, 8, 0, 0);
  }, [events, view]);

  const messages = useMemo(
    () => ({
      today: t("calendar.today"),
      previous: t("calendar.previous"),
      next: t("calendar.next"),
      month: t("calendar.month"),
      week: t("calendar.week"),
      day: t("calendar.day"),
      agenda: t("calendar.list"),
      showMore: (count: number) => t("calendar.showMore", { count }),
      noEventsInRange: t("calendar.noEvents"),
    }),
    [t],
  );

  const formats = useMemo(() => {
    const loc = intlLocale(locale);
    return {
      monthHeaderFormat: (date: Date) =>
        new Intl.DateTimeFormat(loc, {
          month: "long",
          year: "numeric",
          timeZone: BUSINESS_TIMEZONE,
        }).format(date),
      weekdayFormat: (date: Date) =>
        new Intl.DateTimeFormat(loc, {
          weekday: "short",
          timeZone: BUSINESS_TIMEZONE,
        }).format(date),
      dayFormat: (date: Date) =>
        new Intl.DateTimeFormat(loc, {
          day: "numeric",
          timeZone: BUSINESS_TIMEZONE,
        }).format(date),
      dayHeaderFormat: (date: Date) =>
        new Intl.DateTimeFormat(loc, {
          weekday: "short",
          month: "short",
          day: "numeric",
          timeZone: BUSINESS_TIMEZONE,
        }).format(date),
      agendaDateFormat: (date: Date) =>
        new Intl.DateTimeFormat(loc, {
          weekday: "short",
          month: "short",
          day: "numeric",
          timeZone: BUSINESS_TIMEZONE,
        }).format(date),
      agendaHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
        `${new Intl.DateTimeFormat(loc, {
          month: "short",
          day: "numeric",
          timeZone: BUSINESS_TIMEZONE,
        }).format(start)} – ${new Intl.DateTimeFormat(loc, {
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: BUSINESS_TIMEZONE,
        }).format(end)}`,
    };
  }, [locale]);

  const monthOptions = useMemo(() => {
    const loc = intlLocale(locale);
    return Array.from({ length: 12 }, (_, month) => {
      const label = new Intl.DateTimeFormat(loc, {
        month: "long",
        timeZone: BUSINESS_TIMEZONE,
      }).format(new Date(Date.UTC(2024, month, 15, 6, 30)));
      return { value: String(month), label };
    });
  }, [locale]);

  function openDay(date: Date) {
    setSelectedDay(dayKey(date));
  }

  function handleSelectEvent(event: CalendarEvent) {
    if (event.resource.kind === "sale") {
      setBillSaleId(event.resource.sale.id);
      return;
    }
    openDay(event.start);
  }

  function jumpToDate(value: string) {
    if (!value) return;
    if (!parseDateInput(value)) return;
    setCurrentDate(civilNoon(value));
    setView("day");
  }

  function jumpToMonthYear(monthIndex: number, year: number) {
    const day = Number(dayKey(currentDate).slice(8, 10));
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    const safeDay = Math.min(day, lastDay);
    const key = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
    setCurrentDate(civilNoon(key));
  }

  function handleViewChange(next: View) {
    if (next === "agenda") {
      setCurrentDate(civilNoon(startOfMonthKey(parseDateInput(dayKey(currentDate)) ?? currentDate)));
    }
    setView(next);
  }

  return (
    <div>
      <div className="mb-4 grid gap-3 rounded-2xl border border-amber-200 bg-white p-3 shadow-sm sm:grid-cols-3 sm:p-4">
        <DateInput
          label={t("calendar.goToDate")}
          value={jumpDateValue}
          onChange={(e) => jumpToDate(e.target.value)}
        />
        <Select
          label={t("calendar.month")}
          value={monthValue}
          onChange={(e) =>
            jumpToMonthYear(Number(e.target.value), parts[0])
          }
        >
          {monthOptions.map((month) => (
            <option key={month.value} value={month.value}>
              {month.label}
            </option>
          ))}
        </Select>
        <Select
          label={t("calendar.year")}
          value={yearValue}
          onChange={(e) =>
            jumpToMonthYear(parts[1] - 1, Number(e.target.value))
          }
        >
          {yearOptions.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </Select>
      </div>

      <div className="bakery-calendar rounded-2xl border border-amber-200 bg-white p-3 shadow-sm sm:p-4">
        {loading ? (
          <LoadingSpinner fullPage label={t("common.loading")} />
        ) : (
          <Calendar
            localizer={localizer}
            culture="en-US"
            date={currentDate}
            view={view}
            views={["month", "week", "day", "agenda"]}
            events={events}
            selectable
            popup
            style={{ height: view === "agenda" ? 520 : 640 }}
            length={view === "agenda" ? daysInMonth(currentDate) : undefined}
            messages={messages}
            formats={formats}
            min={view === "day" || view === "week" ? DAY_GRID_MIN : undefined}
            max={view === "day" || view === "week" ? DAY_GRID_MAX : undefined}
            scrollToTime={scrollToTime}
            step={30}
            timeslots={2}
            onNavigate={(date) => setCurrentDate(civilNoon(dayKey(date)))}
            onView={handleViewChange}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={(slot) => openDay(slot.start)}
            eventPropGetter={(event) => ({
              className:
                event.resource.kind === "sale"
                  ? "bakery-calendar-event bakery-calendar-event--timed"
                  : "bakery-calendar-event",
            })}
            dayPropGetter={(date) => {
              const key = dayKey(date);
              const hasSales = bucketsByDay.has(key);
              const isSelected = selectedDay === key;
              return {
                className: [
                  hasSales ? "bakery-calendar-day--has-sales" : "",
                  isSelected ? "bakery-calendar-day--selected" : "",
                ]
                  .filter(Boolean)
                  .join(" "),
              };
            }}
            tooltipAccessor={(event) => {
              if (event.resource.kind !== "sale") return event.title;
              const sale = event.resource.sale;
              const items = sale.items
                .map((item) => `${item.productName} × ${item.quantity}`)
                .join(", ");
              return `${event.resource.shopName} · ${event.resource.deliveryGuyName}\n${items}\n${formatCurrency(sale.totalAmount)}`;
            }}
          />
        )}
      </div>

      <Modal
        open={selectedBucket !== null}
        title={
          selectedBucket
            ? new Intl.DateTimeFormat(intlLocale(locale), {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                timeZone: BUSINESS_TIMEZONE,
              }).format(civilNoon(selectedBucket.dateKey))
            : t("nav.calendar")
        }
        onClose={() => setSelectedDay(null)}
        size="lg"
      >
        {selectedBucket ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-stone-800">
              <p>
                <span className="font-medium">{t("calendar.totalSales")}: </span>
                {t("calendar.saleCountLabel", {
                  count: selectedBucket.saleCount,
                })}
              </p>
              <p className="mt-1">
                <span className="font-medium">{t("calendar.dayTotal")}: </span>
                {formatCurrency(selectedBucket.totalAmount)}
              </p>
            </div>

            {selectedBucket.groups.length === 0 ? (
              <p className="text-sm text-stone-600">{t("calendar.noSalesDay")}</p>
            ) : (
              <ul className="space-y-3">
                {selectedBucket.groups.map((group) => (
                  <li
                    key={`${group.shopId}-${group.deliveryGuyId}-${group.dropDate}`}
                    className="rounded-xl border border-amber-100 px-4 py-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-stone-900">
                          {group.shopName}
                        </p>
                        <p className="text-sm text-stone-600">
                          {t("sales.colDeliveryPartner")}:{" "}
                          {group.deliveryGuyName}
                        </p>
                        <p className="mt-1 text-sm text-stone-700">
                          {formatItems(group)}
                        </p>
                      </div>
                      <p className="font-semibold text-stone-900">
                        {formatCurrency(group.totalAmount)}
                      </p>
                    </div>
                    <ul className="mt-3 space-y-2 border-t border-amber-50 pt-3">
                      {group.sales.map((sale) => (
                        <li
                          key={sale.id}
                          className="flex flex-wrap items-center justify-between gap-2 text-sm"
                        >
                          <div>
                            <p className="text-stone-800">
                              {new Date(sale.saleDate).toLocaleString(
                                intlLocale(locale),
                                { timeZone: BUSINESS_TIMEZONE },
                              )}
                            </p>
                            <p className="text-stone-500">
                              {sale.items
                                .map(
                                  (item) =>
                                    `${item.productName} × ${item.quantity}`,
                                )
                                .join(", ")}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-medium">
                              {formatCurrency(sale.totalAmount)}
                            </span>
                            <button
                              type="button"
                              className="font-medium text-amber-700 hover:underline"
                              onClick={() => setBillSaleId(sale.id)}
                            >
                              {sale.billPrinted
                                ? t("sales.viewBill")
                                : t("sales.printBill")}
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
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
