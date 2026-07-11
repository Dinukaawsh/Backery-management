"use client";

import { useCallback, useEffect, useState } from "react";
import { HiOutlineTrash } from "react-icons/hi2";

import { useBusinessSettings } from "@/components/BusinessSettingsProvider";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Column, DataTable } from "@/components/ui/DataTable";
import { DateInput } from "@/components/ui/DateInput";
import {
  DownloadPdfButton,
  PageHeaderActions,
} from "@/components/ui/DownloadPdfButton";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/ToastProvider";
import {
  createAllocation,
  deleteAllocation,
  fetchAllocations,
  fetchDeliveryGuys,
  fetchProducts,
  type AllocationRecord,
  type AllocationSummary,
  type DeliveryGuy,
  type Product,
} from "@/lib/api";
import { downloadPdf } from "@/lib/export-pdf";

type AssignLine = { productId: string; quantity: string };

export default function AssignmentsPage() {
  const toast = useToast();
  const { settings } = useBusinessSettings();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [deliveryGuyId, setDeliveryGuyId] = useState("");
  const [summary, setSummary] = useState<AllocationSummary[]>([]);
  const [allocations, setAllocations] = useState<AllocationRecord[]>([]);
  const [deliveryGuys, setDeliveryGuys] = useState<DeliveryGuy[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [assignGuyId, setAssignGuyId] = useState("");
  const [lines, setLines] = useState<AssignLine[]>([
    { productId: "", quantity: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AllocationRecord | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllocations({
        date,
        deliveryGuyId: deliveryGuyId ? Number(deliveryGuyId) : undefined,
      });
      setSummary(data.summary);
      setAllocations(data.allocations);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [date, deliveryGuyId]);

  useEffect(() => {
    void fetchDeliveryGuys()
      .then(setDeliveryGuys)
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Failed to load delivery partners"),
      );
    void fetchProducts()
      .then(setProducts)
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Failed to load products"),
      );
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAssign() {
    if (!assignGuyId) {
      toast.error("Select a delivery partner");
      return;
    }

    const items = lines
      .map((line) => ({
        productId: Number(line.productId),
        quantity: Number(line.quantity),
      }))
      .filter((line) => line.productId > 0 && line.quantity > 0);

    if (items.length === 0) {
      toast.error("Add at least one product with quantity");
      return;
    }

    setSaving(true);
    try {
      await createAllocation({
        deliveryGuyId: Number(assignGuyId),
        allocationDate: date,
        items,
      });
      setModalOpen(false);
      setLines([{ productId: "", quantity: "" }]);
      toast.success("Stock assigned to delivery partner");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Assign failed");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeleteAllocation() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAllocation(deleteTarget.id);
      setDeleteTarget(null);
      toast.success("Assignment removed and stock returned");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  function handleExportPdf() {
    if (!summary.length && !allocations.length) {
      toast.error("No assignment data to export for this date");
      return;
    }

    const guy = deliveryGuys.find((item) => String(item.id) === deliveryGuyId);
    const filterLabel = guy
      ? `Date: ${date}  •  Delivery partner: ${guy.name}`
      : `Date: ${date}  •  All delivery partners`;

    downloadPdf({
      filename: "stock-assignments",
      title: "Stock Assignments Report",
      subtitle: filterLabel,
      business: settings,
      sections: [
        {
          heading: "Assigned vs sold summary",
          headers: [
            "Delivery Partner",
            "Product",
            "Given",
            "Sold",
            "Remaining",
          ],
          rows: summary.map((row) => [
            row.deliveryGuyName,
            row.productName,
            String(row.allocated),
            String(row.sold),
            String(row.remaining),
          ]),
        },
        {
          heading: "Assignment history",
          headers: ["Delivery Partner", "Product", "Quantity", "Assigned at"],
          rows: allocations.map((row) => [
            row.deliveryGuyName,
            row.productName,
            String(row.quantity),
            new Date(row.createdAt).toLocaleString(),
          ]),
        },
      ],
    });
    toast.success("Assignments PDF downloaded");
  }

  const summaryColumns: Column<AllocationSummary>[] = [
    {
      key: "guy",
      header: "Delivery partner",
      render: (row) => row.deliveryGuyName,
    },
    { key: "product", header: "Product", render: (row) => row.productName },
    { key: "allocated", header: "Given", render: (row) => row.allocated },
    { key: "sold", header: "Sold", render: (row) => row.sold },
    {
      key: "remaining",
      header: "Remaining",
      render: (row) => (
        <span className={row.remaining === 0 ? "text-stone-500" : "font-medium"}>
          {row.remaining}
        </span>
      ),
    },
  ];

  const allocationColumns: Column<AllocationRecord>[] = [
    {
      key: "guy",
      header: "Delivery partner",
      render: (row) => row.deliveryGuyName,
    },
    { key: "product", header: "Product", render: (row) => row.productName },
    { key: "qty", header: "Quantity", render: (row) => row.quantity },
    {
      key: "time",
      header: "Assigned at",
      render: (row) => new Date(row.createdAt).toLocaleString(),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-red-600 hover:bg-red-50"
          onClick={() => setDeleteTarget(row)}
        >
          <HiOutlineTrash className="h-4 w-4 shrink-0" aria-hidden />
          Remove
        </button>
      ),
    },
  ];

  const activeProducts = products.filter((p) => p.isActive);

  return (
    <div>
      <PageHeader
        title="Stock Assignments"
        description="Give products to delivery partners each day. They sell from this assigned stock via the mobile app."
        action={
          <PageHeaderActions>
            <DownloadPdfButton
              onClick={handleExportPdf}
              disabled={(!summary.length && !allocations.length) || loading}
            />
            <Button
              onClick={() => {
                setAssignGuyId(deliveryGuyId);
                setModalOpen(true);
              }}
            >
              + Assign stock
            </Button>
          </PageHeaderActions>
        }
      />

      <div className="mb-6 grid gap-4 rounded-2xl border border-amber-200 bg-white p-4 shadow-sm md:grid-cols-2">
        <DateInput
          label="Date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <Select
          label="Filter by delivery partner"
          value={deliveryGuyId}
          onChange={(e) => setDeliveryGuyId(e.target.value)}
        >
          <option value="">All delivery partners</option>
          {deliveryGuys.map((guy) => (
            <option key={guy.id} value={guy.id}>
              {guy.name}
            </option>
          ))}
        </Select>
      </div>

      <h2 className="mb-3 text-lg font-semibold text-black">
        Assigned vs sold summary
      </h2>
      <DataTable
        columns={summaryColumns}
        data={summary}
        loading={loading}
        rowKey={(row) => `${row.deliveryGuyId}-${row.productId}`}
        emptyMessage="No stock assigned for this date yet."
        pageSize={10}
        getSearchText={(row) =>
          [
            row.deliveryGuyName,
            row.productName,
            row.allocated,
            row.sold,
            row.remaining,
          ].join(" ")
        }
        searchPlaceholder="Search summary..."
      />

      <h2 className="mb-3 mt-8 text-lg font-semibold text-black">
        Assignment history
      </h2>
      <DataTable
        columns={allocationColumns}
        data={allocations}
        loading={loading}
        rowKey={(row) => row.id}
        emptyMessage="No individual assignments recorded."
        pageSize={8}
        getSearchText={(row) =>
          [
            row.deliveryGuyName,
            row.productName,
            row.quantity,
            new Date(row.createdAt).toLocaleString(),
          ].join(" ")
        }
        searchPlaceholder="Search assignment history..."
      />

      <Modal
        open={modalOpen}
        title="Assign stock to delivery partner"
        onClose={() => setModalOpen(false)}
        size="lg"
        footer={
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" fullWidth onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button fullWidth onClick={() => void handleAssign()} disabled={saving}>
              {saving ? "Assigning..." : "Assign stock"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Select
            label="Delivery partner"
            value={assignGuyId}
            onChange={(e) => setAssignGuyId(e.target.value)}
          >
            <option value="">Select delivery partner</option>
            {deliveryGuys.map((guy) => (
              <option key={guy.id} value={guy.id} disabled={!guy.isActive}>
                {guy.name}
                {!guy.isActive ? " (disabled)" : ""}
              </option>
            ))}
          </Select>

          {deliveryGuys.length === 0 ? (
            <p className="text-sm text-amber-800">
              No delivery partners registered yet. Add one from the Delivery Partners page.
            </p>
          ) : null}
          {deliveryGuys.length > 0 &&
          deliveryGuys.every((guy) => !guy.isActive) ? (
            <p className="text-sm text-amber-800">
              All delivery partners are disabled. Enable one from the Delivery Partners page
              to assign stock.
            </p>
          ) : null}

          <p className="text-sm text-stone-600">
            Assigning for <strong>{date}</strong>. Stock is taken from bakery
            inventory.
          </p>

          {lines.map((line, index) => (
            <div key={index} className="grid gap-3 sm:grid-cols-2">
              <Select
                label="Product"
                value={line.productId}
                onChange={(e) => {
                  const next = [...lines];
                  next[index] = { ...next[index], productId: e.target.value };
                  setLines(next);
                }}
              >
                <option value="">Select product</option>
                {activeProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} (in bakery: {product.stockAvailable})
                  </option>
                ))}
              </Select>
              <Input
                label="Quantity"
                type="number"
                min="1"
                value={line.quantity}
                onChange={(e) => {
                  const next = [...lines];
                  next[index] = { ...next[index], quantity: e.target.value };
                  setLines(next);
                }}
              />
            </div>
          ))}

          <Button
            variant="secondary"
            onClick={() =>
              setLines((current) => [...current, { productId: "", quantity: "" }])
            }
          >
            + Add another product
          </Button>
        </div>
      </Modal>

      <ConfirmModal
        open={deleteTarget !== null}
        title="Remove assignment"
        message={`Remove ${deleteTarget?.quantity} × ${deleteTarget?.productName} from ${deleteTarget?.deliveryGuyName}? Unsold stock returns to bakery inventory.`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleting}
        onConfirm={() => void confirmDeleteAllocation()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
