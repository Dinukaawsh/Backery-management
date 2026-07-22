"use client";

import { HiOutlineXMark } from "react-icons/hi2";

import { useT } from "@/lib/i18n";

import { Button } from "./Button";

type ClearFiltersButtonProps = {
  /** Show only when at least one filter differs from defaults. */
  active: boolean;
  onClear: () => void;
  className?: string;
};

export function ClearFiltersButton({
  active,
  onClear,
  className = "",
}: ClearFiltersButtonProps) {
  const t = useT();

  if (!active) return null;

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={onClear}
      className={className}
      aria-label={t("common.clearFilters")}
    >
      <span className="inline-flex items-center gap-1.5">
        <HiOutlineXMark className="h-4 w-4" aria-hidden />
        {t("common.clearFilters")}
      </span>
    </Button>
  );
}
