"use client";

import { ReactNode, useEffect } from "react";
import { HiOutlineXMark } from "react-icons/hi2";

import { useT } from "@/lib/i18n";

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
};

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  size = "md",
}: ModalProps) {
  const t = useT();

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const widthClass = size === "lg" ? "max-w-2xl" : "max-w-lg";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={t("modal.closeBackdrop")}
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        className={`relative z-10 w-full ${widthClass} rounded-2xl border border-amber-200 bg-white shadow-xl`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-amber-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-black">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("modal.close")}
            className="rounded-lg p-1 text-black hover:bg-amber-50"
          >
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>
        <div className="custom-scrollbar max-h-[70vh] overflow-y-auto px-6 py-4">
          {children}
        </div>
        {footer ? (
          <div className="border-t border-amber-100 px-6 py-4">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
