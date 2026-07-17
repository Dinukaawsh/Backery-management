"use client";

import {
  HiOutlineCalendarDays,
  HiOutlineChatBubbleLeftEllipsis,
  HiOutlineEnvelope,
  HiOutlinePhone,
} from "react-icons/hi2";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { DeliveryGuy } from "@/lib/api";
import { useT } from "@/lib/i18n";

type DeliveryPartnerViewModalProps = {
  partner: DeliveryGuy | null;
  onClose: () => void;
  onMessage?: (partner: DeliveryGuy) => void;
  onCall?: (partner: DeliveryGuy) => void;
};

export function DeliveryPartnerViewModal({
  partner,
  onClose,
  onMessage,
  onCall,
}: DeliveryPartnerViewModalProps) {
  const t = useT();

  return (
    <Modal
      open={partner !== null}
      title={t("deliveryGuys.viewTitle")}
      onClose={onClose}
      footer={
        partner ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <Button variant="secondary" fullWidth onClick={onClose}>
              {t("common.close")}
            </Button>
            {onCall ? (
              <Button
                variant="secondary"
                fullWidth
                onClick={() => onCall(partner)}
              >
                <span className="inline-flex items-center gap-2">
                  <HiOutlinePhone className="h-5 w-5" />
                  {t("calls.call")}
                </span>
              </Button>
            ) : null}
            {onMessage ? (
              <Button fullWidth onClick={() => onMessage(partner)}>
                <span className="inline-flex items-center gap-2">
                  <HiOutlineChatBubbleLeftEllipsis className="h-5 w-5" />
                  {t("chat.message")}
                </span>
              </Button>
            ) : null}
          </div>
        ) : null
      }
    >
      {partner ? (
        <div className="space-y-6">
          <div className="flex flex-col items-center text-center">
            {partner.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={partner.imageUrl}
                alt={partner.name}
                className="h-28 w-28 rounded-full object-cover ring-4 ring-amber-100"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-amber-100 text-4xl font-bold text-amber-800 ring-4 ring-amber-50">
                {partner.name.trim().charAt(0).toUpperCase() || "?"}
              </div>
            )}
            <h3 className="mt-4 text-xl font-bold text-stone-900">
              {partner.name}
            </h3>
            <span
              className={`mt-2 rounded-full px-3 py-1 text-xs font-semibold ${
                partner.isActive
                  ? "bg-green-100 text-green-800"
                  : "bg-stone-200 text-stone-700"
              }`}
            >
              {partner.isActive ? t("common.active") : t("common.disabled")}
            </span>
          </div>

          <dl className="overflow-hidden rounded-xl border border-amber-100 bg-amber-50/30">
            <DetailRow
              icon={<HiOutlineEnvelope className="h-5 w-5" />}
              label={t("common.email")}
              value={partner.email}
            />
            <DetailRow
              icon={<HiOutlinePhone className="h-5 w-5" />}
              label={t("common.phone")}
              value={partner.phone || "—"}
            />
            <DetailRow
              icon={<HiOutlineCalendarDays className="h-5 w-5" />}
              label={t("deliveryGuys.colRegistered")}
              value={new Date(partner.createdAt).toLocaleDateString()}
              last
            />
          </dl>
        </div>
      ) : null}
    </Modal>
  );
}

function DetailRow({
  icon,
  label,
  value,
  last = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 ${
        last ? "" : "border-b border-amber-100"
      }`}
    >
      <span className="mt-0.5 text-amber-700">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs font-medium text-stone-500">{label}</dt>
        <dd className="break-words text-sm font-semibold text-stone-900">
          {value}
        </dd>
      </div>
    </div>
  );
}
