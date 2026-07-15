"use client";

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
  activeLabel = "Active",
  inactiveLabel = "Inactive",
}: StatusTabsProps) {
  const tabs: Array<{ id: StatusTab; label: string; count?: number }> = [
    { id: "active", label: activeLabel, count: activeCount },
    { id: "inactive", label: inactiveLabel, count: inactiveCount },
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
