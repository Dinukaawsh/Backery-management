"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useT } from "@/lib/i18n";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = "primary",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const t = useT();
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" fullWidth onClick={onCancel} disabled={loading}>
            {cancelLabel ?? t("common.cancel")}
          </Button>
          <Button
            variant={variant === "danger" ? "danger" : "primary"}
            fullWidth
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? t("common.pleaseWait") : (confirmLabel ?? t("common.confirm"))}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-stone-700">{message}</p>
    </Modal>
  );
}
