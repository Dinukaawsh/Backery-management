"use client";

import { Button } from "@/components/ui/Button";
import { HiOutlineDocumentArrowDown } from "react-icons/hi2";

type DownloadPdfButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
};

export function DownloadPdfButton({
  onClick,
  disabled = false,
  label = "Download PDF",
}: DownloadPdfButtonProps) {
  return (
    <Button variant="secondary" onClick={onClick} disabled={disabled}>
      <span className="inline-flex items-center gap-2">
        <HiOutlineDocumentArrowDown className="h-4 w-4" aria-hidden />
        {label}
      </span>
    </Button>
  );
}

export function PageHeaderActions({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}
