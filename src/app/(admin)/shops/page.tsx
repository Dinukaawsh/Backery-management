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
import {
  DownloadPdfButton,
  PageHeaderActions,
} from "@/components/ui/DownloadPdfButton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { StatusTabs } from "@/components/ui/StatusTabs";
import { useToast } from "@/components/ui/ToastProvider";
import {
  createShop,
  deleteShop,
  fetchShops,
  updateShop,
  type Shop,
} from "@/lib/api";
import { downloadPdf } from "@/lib/export-pdf";
import { formatCurrency } from "@/lib/currency";
import { useT } from "@/lib/i18n";
import type { EnMessages } from "@/lib/i18n/messages/en";

const emptyForm = {
  name: "",
  ownerName: "",
  address: "",
  phone: "",
  route: "",
};

type TFunction = (
  key: keyof EnMessages,
  params?: Record<string, string | number>,
) => string;

function formatAddedBy(shop: Shop, t: TFunction) {
  if (!shop.addedByName) return "—";
  const role =
    shop.addedByRole === "delivery"
      ? t("shops.addedByDelivery")
      : shop.addedByRole === "admin"
        ? t("shops.addedByAdmin")
        : "";
  return role
    ? t("shops.addedByFormatted", { name: shop.addedByName, role })
    : shop.addedByName;
}

export default function ShopsPage() {
  const toast = useToast();
  const t = useT();
  const { settings } = useBusinessSettings();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Shop | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [disableTarget, setDisableTarget] = useState<Shop | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Shop | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusTab, setStatusTab] = useState<"active" | "inactive">("active");
  const [routeFilter, setRouteFilter] = useState("");

  const loadShops = useCallback(async () => {
    setLoading(true);
    try {
      setShops(await fetchShops());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("shops.failedToLoad"));
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    void loadShops();
  }, [loadShops]);

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
      route: shop.route ?? "",
    });
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        ownerName: form.ownerName,
        address: form.address,
        phone: form.phone,
        route: form.route.trim() || null,
      };
      if (editing) {
        await updateShop(editing.id, payload);
        toast.success(t("shops.updatedToast"));
      } else {
        await createShop(payload);
        toast.success(t("shops.addedToast"));
      }
      setModalOpen(false);
      setForm(emptyForm);
      await loadShops();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.saveFailed"));
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
        disableTarget.isActive
          ? t("shops.disabledToast")
          : t("shops.enabledToast"),
      );
      await loadShops();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.updateFailed"));
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
      toast.success(t("shops.deletedToast"));
      await loadShops();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.deleteFailed"));
    } finally {
      setActionLoading(false);
    }
  }

  function handleExportPdf() {
    if (!shops.length) {
      toast.error(t("shops.noExport"));
      return;
    }

    downloadPdf({
      filename: "shops",
      title: t("shops.pdfTitle"),
      business: settings,
      sections: [
        {
          heading: t("shops.pdfAllShopsHeading"),
          headers: [
            t("shops.colShop"),
            t("shops.colRoute"),
            t("shops.colOutstandingRs"),
            t("shops.colOwner"),
            t("shops.colAddress"),
            t("shops.colStatus"),
            t("shops.colAddedBy"),
            t("shops.colRegistered"),
          ],
          rows: shops.map((shop) => [
            shop.name,
            shop.route ?? "—",
            formatCurrency(shop.outstandingBalance ?? "0"),
            shop.ownerName,
            shop.address,
            shop.isActive ? t("common.active") : t("common.disabled"),
            formatAddedBy(shop, t),
            new Date(shop.createdAt).toLocaleDateString(),
          ]),
        },
      ],
    });
    toast.success(t("shops.pdfDownloadedToast"));
  }

  const activeShops = shops.filter((shop) => shop.isActive);
  const inactiveShops = shops.filter((shop) => !shop.isActive);
  const routeOptions = Array.from(
    new Set(
      shops
        .map((shop) => shop.route?.trim())
        .filter((route): route is string => Boolean(route)),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const filteredShops = (statusTab === "active" ? activeShops : inactiveShops)
    .filter((shop) => {
      if (!routeFilter) return true;
      return (shop.route ?? "") === routeFilter;
    });

  const shopColumns: Column<Shop>[] = [
    { key: "name", header: t("shops.colShop"), render: (s) => s.name },
    {
      key: "route",
      header: t("shops.colRoute"),
      render: (s) => s.route ?? "—",
    },
    {
      key: "outstanding",
      header: t("shops.colOutstandingRs"),
      render: (s) => formatCurrency(s.outstandingBalance ?? "0"),
    },
    { key: "owner", header: t("shops.colOwner"), render: (s) => s.ownerName },
    { key: "address", header: t("shops.colAddress"), render: (s) => s.address },
    { key: "phone", header: t("shops.colPhone"), render: (s) => s.phone ?? "—" },
    {
      key: "status",
      header: t("shops.colStatus"),
      render: (s) => (
        <span
          className={`rounded-full px-2 py-1 text-xs ${s.isActive ? "bg-green-100 text-green-800" : "bg-stone-200 text-stone-700"}`}
        >
          {s.isActive ? t("common.active") : t("common.disabled")}
        </span>
      ),
    },
    {
      key: "addedBy",
      header: t("shops.colAddedBy"),
      render: (s) => formatAddedBy(s, t),
    },
    {
      key: "added",
      header: t("shops.colRegistered"),
      render: (s) => new Date(s.createdAt).toLocaleDateString(),
    },
    {
      key: "actions",
      header: t("shops.colActions"),
      render: (shop) => (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-amber-700 hover:bg-amber-50"
            onClick={() => openEdit(shop)}
          >
            <HiOutlinePencilSquare className="h-4 w-4 shrink-0" aria-hidden />
            {t("common.edit")}
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
            {shop.isActive ? t("common.disable") : t("common.enable")}
          </button>
          {!shop.isActive ? (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-red-600 hover:bg-red-50"
              onClick={() => setDeleteTarget(shop)}
            >
              <HiOutlineTrash className="h-4 w-4 shrink-0" aria-hidden />
              {t("common.delete")}
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t("shops.title")}
        description={t("shops.description")}
        action={
          <PageHeaderActions>
            <DownloadPdfButton
              onClick={handleExportPdf}
              disabled={!shops.length || loading}
            />
            <Button onClick={openCreate}>
              <span className="inline-flex items-center gap-2">
                <HiOutlinePlus className="h-4 w-4" aria-hidden />
                {t("shops.addShop")}
              </span>
            </Button>
          </PageHeaderActions>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-black">
          <HiOutlineBuildingStorefront className="h-5 w-5 text-amber-700" />
          {t("shops.allShops")}
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <StatusTabs
            value={statusTab}
            onChange={setStatusTab}
            activeCount={activeShops.length}
            inactiveCount={inactiveShops.length}
          />
          <Select
            label={t("shops.filterByRoute")}
            value={routeFilter}
            onChange={(e) => setRouteFilter(e.target.value)}
            className="sm:w-56"
          >
            <option value="">{t("shops.allRoutes")}</option>
            {routeOptions.map((route) => (
              <option key={route} value={route}>
                {route}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <DataTable
        columns={shopColumns}
        data={filteredShops}
        loading={loading}
        rowKey={(row) => row.id}
        emptyMessage={
          statusTab === "active"
            ? t("shops.emptyActive")
            : t("shops.emptyInactive")
        }
        getSearchText={(shop) =>
          [
            shop.name,
            shop.route,
            shop.outstandingBalance,
            shop.ownerName,
            shop.address,
            shop.phone,
            shop.addedByName,
            shop.isActive ? "active" : "disabled",
          ]
            .filter(Boolean)
            .join(" ")
        }
        searchPlaceholder={t("shops.searchShops")}
      />

      <Modal
        open={modalOpen}
        title={
          editing
            ? t("shops.editTitle", { name: editing.name })
            : t("shops.addShop")
        }
        onClose={() => setModalOpen(false)}
        footer={
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" fullWidth onClick={() => setModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button fullWidth onClick={() => void handleSave()} disabled={saving}>
              {saving
                ? t("common.saving")
                : editing
                  ? t("common.saveChanges")
                  : t("shops.addShop")}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <Input
            label={t("shops.formShopName")}
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label={t("shops.formOwnerName")}
            required
            value={form.ownerName}
            onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
          />
          <Input
            label={t("shops.formAddress")}
            required
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <Input
            label={t("shops.formRoute")}
            placeholder={t("shops.formRoutePlaceholder")}
            value={form.route}
            onChange={(e) => setForm({ ...form, route: e.target.value })}
          />
          <Input
            label={t("shops.formPhone")}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
      </Modal>

      <ConfirmModal
        open={disableTarget !== null}
        title={
          disableTarget?.isActive
            ? t("shops.disableTitle")
            : t("shops.enableTitle")
        }
        message={
          disableTarget?.isActive
            ? t("shops.disableMessage", { name: disableTarget.name })
            : t("shops.enableMessage", { name: disableTarget?.name ?? "" })
        }
        confirmLabel={
          disableTarget?.isActive ? t("common.disable") : t("common.enable")
        }
        cancelLabel={t("common.cancel")}
        variant={disableTarget?.isActive ? "danger" : "primary"}
        loading={actionLoading}
        onConfirm={() => void confirmDisable()}
        onCancel={() => setDisableTarget(null)}
      />

      <ConfirmModal
        open={deleteTarget !== null}
        title={t("shops.deleteTitle")}
        message={t("shops.deleteMessage", { name: deleteTarget?.name ?? "" })}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        loading={actionLoading}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
