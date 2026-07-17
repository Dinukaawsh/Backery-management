"use client";

import { HiOutlineDevicePhoneMobile, HiOutlinePhone } from "react-icons/hi2";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { DeliveryGuy } from "@/lib/api";
import { useT } from "@/lib/i18n";

export function ContactCallModal({
  partner,
  onClose,
}: {
  partner: DeliveryGuy | null;
  onClose: () => void;
}) {
  const t = useT();
  const phone = partner?.phone?.trim() ?? "";
  const whatsappPhone = toWhatsAppPhone(phone);

  return (
    <Modal
      open={partner !== null}
      title={t("calls.title", { name: partner?.name ?? "" })}
      onClose={onClose}
      footer={
        <Button variant="secondary" fullWidth onClick={onClose}>
          {t("common.close")}
        </Button>
      }
    >
      {!phone ? (
        <p className="text-center text-sm text-stone-600">
          {t("calls.noPhone")}
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-center text-sm text-stone-600">{phone}</p>
          <a
            href={`https://wa.me/${whatsappPhone}`}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-left text-green-800 transition hover:bg-green-100"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600 text-white">
              <HiOutlineDevicePhoneMobile className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-semibold">{t("calls.whatsapp")}</span>
              <span className="block text-xs text-green-700">
                {t("calls.whatsappHint")}
              </span>
            </span>
          </a>
          <a
            href={`tel:${phone}`}
            className="flex w-full items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-amber-900 transition hover:bg-amber-100"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-600 text-white">
              <HiOutlinePhone className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-semibold">{t("calls.normal")}</span>
              <span className="block text-xs text-amber-700">
                {t("calls.normalHint")}
              </span>
            </span>
          </a>
        </div>
      )}
    </Modal>
  );
}

function toWhatsAppPhone(phone: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `94${digits.slice(1)}`;
  return digits;
}
