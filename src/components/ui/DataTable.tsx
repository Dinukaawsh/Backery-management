"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { HiOutlineMagnifyingGlass } from "react-icons/hi2";

import { useT } from "@/lib/i18n";

import { Button } from "./Button";
import { LoadingSpinner } from "./LoadingSpinner";

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
};

type TableSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function TableSearchBar({
  value,
  onChange,
  placeholder,
  className = "",
}: TableSearchBarProps) {
  const t = useT();
  return (
    <div
      className={`flex items-center gap-2.5 rounded-lg border border-[var(--border)] bg-white px-3 py-2 transition focus-within:border-[var(--border-focus)] focus-within:shadow-[0_0_0_2px_rgb(245_158_11_/_0.25)] ${className}`}
    >
      <HiOutlineMagnifyingGlass
        className="h-4 w-4 shrink-0 text-stone-500"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? t("table.searchPlaceholder")}
        className="min-w-0 flex-1 border-0 bg-transparent text-sm text-black outline-none placeholder:text-stone-500"
        aria-label={t("table.searchAria")}
      />
    </div>
  );
}

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  pageSize?: number;
  rowKey: (row: T) => string | number;
  getSearchText?: (row: T) => string;
  searchPlaceholder?: string;
};

export function DataTable<T>({
  columns,
  data,
  loading,
  emptyMessage,
  pageSize = 8,
  rowKey,
  getSearchText,
  searchPlaceholder,
}: DataTableProps<T>) {
  const t = useT();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const filteredData = useMemo(() => {
    if (!getSearchText) return data;

    const query = search.trim().toLowerCase();
    if (!query) return data;

    return data.filter((row) =>
      getSearchText(row).toLowerCase().includes(query),
    );
  }, [data, getSearchText, search]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);

  if (loading) {
    return <LoadingSpinner fullPage label={t("table.loading")} />;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
      {getSearchText ? (
        <div className="border-b border-amber-100 p-4">
          <TableSearchBar
            value={search}
            onChange={setSearch}
            placeholder={searchPlaceholder ?? t("table.searchPlaceholder")}
          />
        </div>
      ) : null}

      <div className="custom-scrollbar overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b border-amber-100 bg-amber-50/80 text-left">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 font-semibold text-black ${column.className ?? ""}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-stone-600"
                >
                  {search.trim()
                    ? t("table.noMatching")
                    : (emptyMessage ?? t("table.emptyDefault"))}
                </td>
              </tr>
            ) : (
              pageData.map((row) => (
                <tr
                  key={rowKey(row)}
                  className="border-b border-amber-50 hover:bg-amber-50/40"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-4 py-3 text-black ${column.className ?? ""}`}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filteredData.length > pageSize ? (
        <div className="flex items-center justify-between border-t border-amber-100 px-4 py-3">
          <p className="text-xs text-stone-600">
            {t("table.pageStatus", {
              page,
              totalPages,
              total: filteredData.length,
            })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
            >
              {t("table.previous")}
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              disabled={page === totalPages}
            >
              {t("table.next")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
