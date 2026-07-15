"use client";

import { useT } from "@/lib/i18n";

type StatusTab = "active" | "inactive";

type StatusTabsProps = {
  value: StatusTab;
  onChange: (value: StatusTab) => void;
  activeCount?: number;
  inactiveCount?: number;
  activeLabel?: string;
  inactiveLabel?: string;
};

export function StatusTabs({
  value,
  onChange,
  activeCount,
  inactiveCount,
  activeLabel,
  inactiveLabel,
}: StatusTabsProps) {
  const t = useT();
  const tabs: Array<{ id: StatusTab; label: string; count?: number }> = [
    {
      id: "active",
      label: activeLabel ?? t("statusTabs.active"),
      count: activeCount,
    },
    {
      id: "inactive",
      label: inactiveLabel ?? t("statusTabs.inactive"),
      count: inactiveCount,
    },
  ];

  return (
    <div className="inline-flex rounded-xl border border-amber-200 bg-white p-1">
      {tabs.map((tab) => {
        const selected = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              selected
                ? "bg-amber-600 text-white"
                : "text-stone-700 hover:bg-amber-50"
            }`}
          >
            {tab.label}
            {typeof tab.count === "number" ? (
              <span className={selected ? " text-amber-100" : " text-stone-500"}>
                {" "}
                ({tab.count})
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
