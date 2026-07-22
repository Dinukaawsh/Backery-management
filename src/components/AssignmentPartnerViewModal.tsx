"use client";

import { HiOutlineCalendarDays, HiOutlineCube } from "react-icons/hi2";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { AllocationSummary } from "@/lib/api";
import { useT } from "@/lib/i18n";

export type PartnerAssignmentGroup = {
  deliveryGuyId: number;
  deliveryGuyName: string;
  items: AllocationSummary[];
  totalAllocated: number;
  totalSold: number;
  totalRemaining: number;
};

type AssignmentPartnerViewModalProps = {
  group: PartnerAssignmentGroup | null;
  date: string;
  onClose: () => void;
};

export function AssignmentPartnerViewModal({
  group,
  date,
  onClose,
}: AssignmentPartnerViewModalProps) {
  const t = useT();

  return (
    <Modal
      open={group !== null}
      title={t("assignments.viewTitle")}
      onClose={onClose}
      size="lg"
      footer={
        group ? (
          <Button variant="secondary" fullWidth onClick={onClose}>
            {t("common.close")}
          </Button>
        ) : null
      }
    >
      {group ? (
        <div className="space-y-5">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-2xl font-bold text-amber-800">
              {group.deliveryGuyName.trim().charAt(0).toUpperCase() || "?"}
            </div>
            <h3 className="mt-3 text-xl font-bold text-stone-900">
              {group.deliveryGuyName}
            </h3>
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-stone-600">
              <HiOutlineCalendarDays className="h-4 w-4" aria-hidden />
              {t("assignments.viewDateLabel", { date })}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <StatTile
              label={t("assignments.colGiven")}
              value={group.totalAllocated}
            />
            <StatTile
              label={t("assignments.colSold")}
              value={group.totalSold}
            />
            <StatTile
              label={t("assignments.colRemaining")}
              value={group.totalRemaining}
            />
          </div>

          <div>
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-stone-800">
              <HiOutlineCube className="h-4 w-4 text-amber-700" aria-hidden />
              {t("assignments.viewProductsHeading", {
                count: group.items.length,
              })}
            </p>
            <div className="overflow-hidden rounded-xl border border-amber-100">
              <table className="min-w-full text-sm">
                <thead className="bg-amber-50/80 text-left">
                  <tr>
                    <th className="px-3 py-2 font-semibold text-black">
                      {t("assignments.colProduct")}
                    </th>
                    <th className="px-3 py-2 font-semibold text-black">
                      {t("assignments.colGiven")}
                    </th>
                    <th className="px-3 py-2 font-semibold text-black">
                      {t("assignments.colSold")}
                    </th>
                    <th className="px-3 py-2 font-semibold text-black">
                      {t("assignments.colRemaining")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((item) => (
                    <tr
                      key={item.productId}
                      className="border-t border-amber-50"
                    >
                      <td className="px-3 py-2.5 font-medium text-stone-900">
                        {item.productName}
                      </td>
                      <td className="px-3 py-2.5 text-stone-800">
                        {item.allocated}
                      </td>
                      <td className="px-3 py-2.5 text-stone-800">{item.sold}</td>
                      <td
                        className={`px-3 py-2.5 ${
                          item.remaining === 0
                            ? "text-stone-500"
                            : "font-medium text-stone-900"
                        }`}
                      >
                        {item.remaining}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-3 text-center">
      <p className="text-xs font-medium text-stone-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-stone-900">{value}</p>
    </div>
  );
}
