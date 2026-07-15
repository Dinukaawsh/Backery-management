"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  HiOutlineCalendarDays,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
} from "react-icons/hi2";

import { useT } from "@/lib/i18n";

import { Dropdown } from "./Dropdown";

type DatePickerProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toIsoDate(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function parseValue(value: string) {
  if (!value) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
  }
  const [year, month, day] = value.split("-").map(Number);
  return {
    year: year || new Date().getFullYear(),
    month: (month || 1) - 1,
    day: day || 1,
  };
}

function buildYearOptions() {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 111 }, (_, index) => {
    const year = currentYear - 80 + index;
    return { value: String(year), label: String(year) };
  });
}

const YEAR_OPTIONS = buildYearOptions();

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => ({
  value: String(index),
  label: new Date(2000, index, 1).toLocaleString(undefined, {
    month: "long",
  }),
}));

export function DatePicker({
  label,
  value,
  onChange,
  error,
  disabled,
}: DatePickerProps) {
  const t = useT();
  const parsed = parseValue(value);
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(parsed.year);
  const [viewMonth, setViewMonth] = useState(parsed.month);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (open) {
      const next = parseValue(value);
      setViewYear(next.year);
      setViewMonth(next.month);
    }
  }, [open, value]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const cells: Array<number | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  const displayValue = value
    ? new Date(`${value}T00:00:00`).toLocaleDateString()
    : t("datepicker.selectDate");

  function selectDay(day: number) {
    onChange(toIsoDate(viewYear, viewMonth, day));
    setOpen(false);
  }

  function shiftMonth(delta: number) {
    const date = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(date.getFullYear());
    setViewMonth(date.getMonth());
  }

  const todayIso = useMemo(() => {
    const now = new Date();
    return toIsoDate(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const weekdays = [
    t("datepicker.weekday.su"),
    t("datepicker.weekday.mo"),
    t("datepicker.weekday.tu"),
    t("datepicker.weekday.we"),
    t("datepicker.weekday.th"),
    t("datepicker.weekday.fr"),
    t("datepicker.weekday.sa"),
  ];

  return (
    <div ref={rootRef} className="relative">
      {label ? <p className="bakery-label">{label}</p> : null}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={`bakery-input flex w-full items-center justify-between text-left ${disabled ? "opacity-60" : ""}`}
      >
        <span className={value ? "text-black" : "text-stone-500"}>
          {displayValue}
        </span>
        <HiOutlineCalendarDays className="h-5 w-5 shrink-0 text-amber-700" />
      </button>

      {open ? (
        <div className="absolute z-50 mt-1 w-full min-w-[300px] rounded-xl border border-amber-200 bg-white p-3 shadow-lg">
          <div className="mb-3 flex items-center gap-2">
            <button
              type="button"
              aria-label={t("datepicker.prevMonth")}
              className="rounded-lg p-2 hover:bg-amber-50"
              onClick={() => shiftMonth(-1)}
            >
              <HiOutlineChevronLeft className="h-4 w-4" />
            </button>

            <Dropdown
              value={String(viewMonth)}
              onChange={(nextMonth) => setViewMonth(Number(nextMonth))}
              options={MONTH_OPTIONS}
              className="min-w-0 flex-1"
            />

            <Dropdown
              value={String(viewYear)}
              onChange={(nextYear) => setViewYear(Number(nextYear))}
              options={YEAR_OPTIONS}
              className="min-w-0 w-24 shrink-0"
            />

            <button
              type="button"
              aria-label={t("datepicker.nextMonth")}
              className="rounded-lg p-2 hover:bg-amber-50"
              onClick={() => shiftMonth(1)}
            >
              <HiOutlineChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs text-stone-500">
            {weekdays.map((day, index) => (
              <span key={index}>{day}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, index) =>
              day ? (
                <button
                  key={`${viewMonth}-${day}-${index}`}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`rounded-lg py-2 text-sm ${
                    value === toIsoDate(viewYear, viewMonth, day)
                      ? "bg-amber-600 text-white"
                      : toIsoDate(viewYear, viewMonth, day) === todayIso
                        ? "bg-amber-100 font-medium text-amber-900"
                        : "text-black hover:bg-amber-50"
                  }`}
                >
                  {day}
                </button>
              ) : (
                <span key={`empty-${index}`} />
              ),
            )}
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

export function DateTimePicker({
  label,
  value,
  onChange,
  error,
  disabled,
}: DatePickerProps) {
  const datePart = value ? value.slice(0, 10) : "";
  const timePart = value && value.length >= 16 ? value.slice(11, 16) : "09:00";
  const [hour, minute] = timePart.split(":");

  const hourOptions = useMemo(
    () =>
      Array.from({ length: 24 }, (_, index) => ({
        value: pad(index),
        label: pad(index),
      })),
    [],
  );

  const minuteOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => {
        const minuteValue = pad(index * 5);
        return { value: minuteValue, label: minuteValue };
      }),
    [],
  );

  return (
    <div className="space-y-2">
      <DatePicker
        label={label}
        value={datePart}
        onChange={(nextDate) => onChange(`${nextDate}T${hour}:${minute}`)}
        disabled={disabled}
      />
      <div className="grid grid-cols-2 gap-3">
        <Dropdown
          label="Hour"
          value={hour}
          onChange={(nextHour) => {
            const nextDate = datePart || new Date().toISOString().slice(0, 10);
            onChange(`${nextDate}T${nextHour}:${minute}`);
          }}
          options={hourOptions}
          disabled={disabled}
        />
        <Dropdown
          label="Minute"
          value={minute}
          onChange={(nextMinute) => {
            const nextDate = datePart || new Date().toISOString().slice(0, 10);
            onChange(`${nextDate}T${hour}:${nextMinute}`);
          }}
          options={minuteOptions}
          disabled={disabled}
        />
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
