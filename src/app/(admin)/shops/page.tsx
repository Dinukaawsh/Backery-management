"use client";

import { useCallback, useEffect, useState } from "react";
import {
  HiOutlineBuildingStorefront,
  HiOutlineCheckCircle,
  HiOutlineNoSymbol,
  HiOutlinePencilSquare,
  HiOutlinePlus,
  HiOutlineTrash,
} from "react-icons/hi2";

import { useBusinessSettings } from "@/components/BusinessSettingsProvider";
import { Button } from "@/components/ui/Button";
import { Column, DataTable } from "@/components/ui/DataTable";
import { DateInput } from "@/components/ui/DateInput";
import {
  DownloadPdfButton,
  PageHeaderActions,
} from "@/components/ui/DownloadPdfButton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/ToastProvider";
import {
  createShop,
  deleteShop,
  fetchDeliveryGuys,
  fetchShopDrops,
  fetchShops,
  updateShop,
  type DeliveryGuy,
  type Shop,
  type ShopDropSummary,
} from "@/lib/api";
import { downloadPdf } from "@/lib/export-pdf";
import { formatCurrency } from "@/lib/currency";

const emptyForm = {
  name: "",
  ownerName: "",
  address: "",
  phone: "",
};

function formatAddedBy(shop: Shop) {
  if (!shop.addedByName) return "—";
  const role =
    shop.addedByRole === "delivery"
      ? "Delivery guy"
      : shop.addedByRole === "admin"
        ? "Admin"
        : "";
  return role ? `${shop.addedByName} (${role})` : shop.addedByName;
}

function formatDropItems(drop: ShopDropSummary) {
  return drop.items
    .map((item) => `${item.productName} × ${item.quantity}`)
    .join(", ");
}

export default function ShopsPage() {
  const toast = useToast();
  const { settings } = useBusinessSettings();
  const [shops, setShops] = useState<Shop[]>([]);
  const [drops, setDrops] = useState<ShopDropSummary[]>([]);
  const [deliveryGuys, setDeliveryGuys] = useState<DeliveryGuy[]>([]);
  const [loading, setLoading] = useState(true);
  const [dropsLoading, setDropsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Shop | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [disableTarget, setDisableTarget] = useState<Shop | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Shop | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [dropDateFrom, setDropDateFrom] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [dropDateTo, setDropDateTo] = useState("");
  const [deliveryGuyId, setDeliveryGuyId] = useState("");

  const loadShops = useCallback(async () => {
    setLoading(true);
    try {
      setShops(await fetchShops());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load shops");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDrops = useCallback(async () => {
    setDropsLoading(true);
    try {
      const params: {
        date?: string;
        dateFrom?: string;
        dateTo?: string;
        deliveryGuyId?: number;
      } = {
        deliveryGuyId: deliveryGuyId ? Number(deliveryGuyId) : undefined,
      };

      if (dropDateTo && dropDateTo !== dropDateFrom) {
        params.dateFrom = dropDateFrom;
        params.dateTo = dropDateTo;
      } else {
        params.date = dropDateFrom;
      }

      const data = await fetchShopDrops(params);
      setDrops(data);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load shop drops",
      );
    } finally {
      setDropsLoading(false);
    }
  }, [dropDateFrom, dropDateTo, deliveryGuyId]);

  useEffect(() => {
    void loadShops();
    void fetchDeliveryGuys().then(setDeliveryGuys).catch(() => undefined);
  }, [loadShops]);

  useEffect(() => {
    void loadDrops();
  }, [loadDrops]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(shop: Shop) {
    setEditing(shop);
    setForm({
      name: shop.name,
      ownerName: shop.ownerName,
      address: shop.address,
      phone: shop.phone ?? "",
    });
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editing) {
        await updateShop(editing.id, form);
        toast.success("Shop updated");
      } else {
        await createShop(form);
        toast.success("Shop added");
      }
      setModalOpen(false);
      setForm(emptyForm);
      await loadShops();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDisable() {
    if (!disableTarget) return;
    setActionLoading(true);
    try {
      await updateShop(disableTarget.id, {
        isActive: !disableTarget.isActive,
      });
      setDisableTarget(null);
      toast.success(
        disableTarget.isActive ? "Shop disabled" : "Shop enabled",
      );
      await loadShops();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await deleteShop(deleteTarget.id);
      setDeleteTarget(null);
      toast.success("Shop deleted");
      await loadShops();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setActionLoading(false);
    }
  }

  function dropPeriodLabel() {
    if (dropDateTo && dropDateTo !== dropDateFrom) {
      return `${dropDateFrom} to ${dropDateTo}`;
    }
    return dropDateFrom;
  }

  function handleExportPdf() {
    if (!shops.length && !drops.length) {
      toast.error("No shop data to export");
      return;
    }

    downloadPdf({
      filename: "shops-and-drops",
      title: "Shops & Daily Drops",
      subtitle: `Drop period: ${dropPeriodLabel()}${deliveryGuyId ? " • Filtered delivery guy" : ""}`,
      business: settings,
      sections: [
        {
          heading: "All shops",
          headers: ["Shop", "Owner", "Address", "Status", "Added by", "Registered"],
          rows: shops.map((shop) => [
            shop.name,
            shop.ownerName,
            shop.address,
            shop.isActive ? "Active" : "Disabled",
            formatAddedBy(shop),
            new Date(shop.createdAt).toLocaleDateString(),
          ]),
        },
        {
          heading: `Drops (${dropPeriodLabel()})`,
          headers: [
            "Date",
            "Shop",
            "Delivery guy",
            "Items dropped",
            "Total qty",
            "Amount (Rs)",
          ],
          rows: drops.map((drop) => [
            drop.dropDate,
            drop.shopName,
            drop.deliveryGuyName,
            formatDropItems(drop),
            String(drop.totalQuantity),
            formatCurrency(drop.totalAmount),
          ]),
        },
      ],
    });
    toast.success("Shops PDF downloaded");
  }

  const shopColumns: Column<Shop>[] = [
    { key: "name", header: "Shop", render: (s) => s.name },
    { key: "owner", header: "Owner", render: (s) => s.ownerName },
    { key: "address", header: "Address", render: (s) => s.address },
    { key: "phone", header: "Phone", render: (s) => s.phone ?? "—" },
    {
      key: "status",
      header: "Status",
      render: (s) => (
        <span
          className={`rounded-full px-2 py-1 text-xs ${s.isActive ? "bg-green-100 text-green-800" : "bg-stone-200 text-stone-700"}`}
        >
          {s.isActive ? "Active" : "Disabled"}
        </span>
      ),
    },
    {
      key: "addedBy",
      header: "Added by",
      render: (s) => formatAddedBy(s),
    },
    {
      key: "added",
      header: "Registered",
      render: (s) => new Date(s.createdAt).toLocaleDateString(),
    },
    {
      key: "actions",
      header: "Actions",
      render: (shop) => (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-amber-700 hover:bg-amber-50"
            onClick={() => openEdit(shop)}
          >
            <HiOutlinePencilSquare className="h-4 w-4 shrink-0" aria-hidden />
            Edit
          </button>
          <button
            type="button"
            className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm hover:bg-amber-50 ${
              shop.isActive ? "text-amber-700" : "text-green-700"
            }`}
            onClick={() => setDisableTarget(shop)}
          >
            {shop.isActive ? (
              <HiOutlineNoSymbol className="h-4 w-4 shrink-0" aria-hidden />
            ) : (
              <HiOutlineCheckCircle className="h-4 w-4 shrink-0" aria-hidden />
            )}
            {shop.isActive ? "Disable" : "Enable"}
          </button>
          {!shop.isActive ? (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-red-600 hover:bg-red-50"
              onClick={() => setDeleteTarget(shop)}
            >
              <HiOutlineTrash className="h-4 w-4 shrink-0" aria-hidden />
              Delete
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  const dropColumns: Column<ShopDropSummary>[] = [
    {
      key: "date",
      header: "Date",
      render: (d) => d.dropDate,
    },
    { key: "shop", header: "Shop", render: (d) => d.shopName },
    {
      key: "delivery",
      header: "Delivery guy",
      render: (d) => d.deliveryGuyName,
    },
    {
      key: "items",
      header: "Items dropped",
      render: (d) => (
        <span className="text-sm text-stone-700">{formatDropItems(d)}</span>
      ),
    },
    {
      key: "qty",
      header: "Total qty",
      render: (d) => d.totalQuantity,
    },
    {
      key: "amount",
      header: "Amount (Rs)",
      render: (d) => formatCurrency(d.totalAmount),
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Shops"
        description="Manage shops and see what each delivery guy dropped at each shop on any day."
        action={
          <PageHeaderActions>
            <DownloadPdfButton
              onClick={handleExportPdf}
              disabled={(!shops.length && !drops.length) || loading}
            />
            <Button onClick={openCreate}>
              <span className="inline-flex items-center gap-2">
                <HiOutlinePlus className="h-4 w-4" aria-hidden />
                Add shop
              </span>
            </Button>
          </PageHeaderActions>
        }
      />

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-black">
          <HiOutlineBuildingStorefront className="h-5 w-5 text-amber-700" />
          All shops
        </h2>
        <DataTable
          columns={shopColumns}
          data={shops}
          loading={loading}
          rowKey={(row) => row.id}
          emptyMessage="No shops added yet."
          getSearchText={(shop) =>
            [
              shop.name,
              shop.ownerName,
              shop.address,
              shop.phone,
              shop.addedByName,
              shop.isActive ? "active" : "disabled",
            ]
              .filter(Boolean)
              .join(" ")
          }
          searchPlaceholder="Search shops..."
        />
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-black">Shop drops</h2>
            <p className="text-sm text-stone-600">
              See how many items and product types each delivery guy dropped at
              each shop. Pick any date or date range.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:w-[48rem]">
            <DateInput
              label="From date"
              value={dropDateFrom}
              onChange={(e) => setDropDateFrom(e.target.value)}
            />
            <DateInput
              label="To date (optional)"
              value={dropDateTo}
              onChange={(e) => setDropDateTo(e.target.value)}
            />
            <Select
              label="Delivery guy"
              value={deliveryGuyId}
              onChange={(e) => setDeliveryGuyId(e.target.value)}
            >
              <option value="">All delivery guys</option>
              {deliveryGuys.map((guy) => (
                <option key={guy.id} value={guy.id}>
                  {guy.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <DataTable
          columns={dropColumns}
          data={drops}
          loading={dropsLoading}
          rowKey={(row) =>
            `${row.shopId}-${row.deliveryGuyId}-${row.dropDate}`
          }
          emptyMessage="No drops recorded for this period."
          pageSize={10}
          getSearchText={(drop) =>
            [
              drop.shopName,
              drop.deliveryGuyName,
              drop.dropDate,
              formatDropItems(drop),
              drop.totalQuantity,
              drop.totalAmount,
            ].join(" ")
          }
          searchPlaceholder="Search drops..."
        />
      </section>

      <Modal
        open={modalOpen}
        title={editing ? `Edit ${editing.name}` : "Add shop"}
        onClose={() => setModalOpen(false)}
        footer={
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" fullWidth onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button fullWidth onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Saving..." : editing ? "Save changes" : "Add shop"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <Input
            label="Shop name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Owner name"
            required
            value={form.ownerName}
            onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
          />
          <Input
            label="Address"
            required
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <Input
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
      </Modal>

      <ConfirmModal
        open={disableTarget !== null}
        title={disableTarget?.isActive ? "Disable shop" : "Enable shop"}
        message={
          disableTarget?.isActive
            ? `Disable ${disableTarget.name}? Delivery guys will not be able to record new drops there.`
            : `Enable ${disableTarget?.name}? Delivery guys can record drops again.`
        }
        confirmLabel={disableTarget?.isActive ? "Disable" : "Enable"}
        cancelLabel="Cancel"
        variant={disableTarget?.isActive ? "danger" : "primary"}
        loading={actionLoading}
        onConfirm={() => void confirmDisable()}
        onCancel={() => setDisableTarget(null)}
      />

      <ConfirmModal
        open={deleteTarget !== null}
        title="Delete shop"
        message={`Permanently delete ${deleteTarget?.name}? Only possible when disabled and with no sales records.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={actionLoading}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
