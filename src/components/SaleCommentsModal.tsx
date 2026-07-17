"use client";

import { SaleComments } from "@/components/SaleComments";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useT } from "@/lib/i18n";

export function SaleCommentsModal({
  saleId,
  onClose,
}: {
  saleId: number | null;
  onClose: () => void;
}) {
  const t = useT();

  return (
    <Modal
      open={saleId !== null}
      title={
        saleId
          ? t("comments.saleTitle", { id: saleId })
          : t("comments.title")
      }
      onClose={onClose}
      size="lg"
      footer={
        <Button variant="secondary" fullWidth onClick={onClose}>
          {t("common.close")}
        </Button>
      }
    >
      {saleId ? <SaleComments saleId={saleId} /> : null}
    </Modal>
  );
}
