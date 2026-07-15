import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import type { BusinessSettings } from "@/lib/api";

export type PdfTableSection = {
  heading?: string;
  headers: string[];
  rows: string[][];
};

export type PdfExportOptions = {
  filename: string;
  title: string;
  subtitle?: string;
  business?: Pick<
    BusinessSettings,
    "businessName" | "address" | "phone" | "email" | "ownerName"
  >;
  sections: PdfTableSection[];
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function drawDocumentHeader(
  doc: jsPDF,
  options: Pick<PdfExportOptions, "title" | "subtitle" | "business">,
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 16;

  if (options.business?.businessName) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(180, 83, 9);
    doc.text(options.business.businessName, pageWidth / 2, y, {
      align: "center",
    });
    y += 6;
  }

  const businessLines = [
    options.business?.ownerName,
    options.business?.address,
    options.business?.phone
      ? `Tel: ${options.business.phone}`
      : undefined,
    options.business?.email,
  ].filter(Boolean) as string[];

  if (businessLines.length > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    for (const line of businessLines) {
      doc.text(line, pageWidth / 2, y, { align: "center" });
      y += 4.5;
    }
    y += 2;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(options.title, 14, y);
  y += 7;

  if (options.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(options.subtitle, 14, y);
    y += 5;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Generated: ${new Date().toLocaleString()}`,
    14,
    y,
  );

  return y + 6;
}

export function downloadPdf(options: PdfExportOptions) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let startY = drawDocumentHeader(doc, options);

  options.sections.forEach((section, index) => {
    if (index > 0) {
      startY += 4;
    }

    if (section.heading) {
      if (startY > 250) {
        doc.addPage();
        startY = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(section.heading, 14, startY);
      startY += 6;
    }

    autoTable(doc, {
      startY,
      head: [section.headers],
      body: section.rows,
      styles: {
        fontSize: 9,
        cellPadding: 2.5,
        textColor: [30, 30, 30],
      },
      headStyles: {
        fillColor: [245, 158, 11],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [255, 251, 235],
      },
      margin: { left: 14, right: 14 },
      didDrawPage: (data) => {
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 8,
          { align: "center" },
        );
      },
    });

    startY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? startY + 20;
  });

  const safeName = slugify(options.filename.replace(/\.pdf$/i, "")) || "report";
  doc.save(`${safeName}.pdf`);
}

export function buildSalesFilterSubtitle(
  input: {
    dateFrom?: string;
    dateTo?: string;
    deliveryGuyName?: string;
    todayOnly?: boolean;
  },
  t?: (key: string, params?: Record<string, string | number>) => string,
) {
  const translate =
    t ??
    ((key: string, params?: Record<string, string | number>) => {
      const fallbacks: Record<string, string> = {
        "sales.filter.today": `Date: Today (${params?.date ?? ""})`,
        "sales.filter.range": `Date range: ${params?.from ?? ""} to ${params?.to ?? ""}`,
        "sales.filter.from": `From: ${params?.from ?? ""}`,
        "sales.filter.until": `Until: ${params?.to ?? ""}`,
        "sales.filter.allDates": "Date: All records",
        "sales.filter.deliveryPartner": `Delivery partner: ${params?.name ?? ""}`,
      };
      return fallbacks[key] ?? key;
    });

  const parts: string[] = [];

  if (input.todayOnly) {
    parts.push(
      translate("sales.filter.today", {
        date: new Date().toLocaleDateString(),
      }),
    );
  } else if (input.dateFrom && input.dateTo) {
    parts.push(
      translate("sales.filter.range", {
        from: input.dateFrom,
        to: input.dateTo,
      }),
    );
  } else if (input.dateFrom) {
    parts.push(translate("sales.filter.from", { from: input.dateFrom }));
  } else if (input.dateTo) {
    parts.push(translate("sales.filter.until", { to: input.dateTo }));
  } else {
    parts.push(translate("sales.filter.allDates"));
  }

  if (input.deliveryGuyName) {
    parts.push(
      translate("sales.filter.deliveryPartner", {
        name: input.deliveryGuyName,
      }),
    );
  }

  return parts.join("  •  ");
}
