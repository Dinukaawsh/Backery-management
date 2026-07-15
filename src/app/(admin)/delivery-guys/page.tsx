"use client";

import { useCallback, useEffect, useState } from "react";
import {
  HiOutlineCheckCircle,
  HiOutlineNoSymbol,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineUserPlus,
} from "react-icons/hi2";

import { useBusinessSettings } from "@/components/BusinessSettingsProvider";
import { Button } from "@/components/ui/Button";
import {
  DownloadPdfButton,
  PageHeaderActions,
} from "@/components/ui/DownloadPdfButton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Column, DataTable } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusTabs } from "@/components/ui/StatusTabs";
import { useToast } from "@/components/ui/ToastProvider";
import {
  createDeliveryGuy,
  deleteDeliveryGuy,
  fetchDeliveryGuys,
  updateDeliveryGuy,
  type DeliveryGuy,
} from "@/lib/api";
import { downloadPdf } from "@/lib/export-pdf";
import { useT } from "@/lib/i18n";

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
};

export default function DeliveryGuysPage() {
  const toast = useToast();
  const t = useT();
  const { settings } = useBusinessSettings();
  const [deliveryGuys, setDeliveryGuys] = useState<DeliveryGuy[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DeliveryGuy | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [disableTarget, setDisableTarget] = useState<DeliveryGuy | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeliveryGuy | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusTab, setStatusTab] = useState<"active" | "inactive">("active");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDeliveryGuys(await fetchDeliveryGuys());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.failedToLoad"));
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(guy: DeliveryGuy) {
    setEditing(guy);
    setForm({
      name: guy.name,
      email: guy.email,
      phone: guy.phone ?? "",
      password: "",
    });
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editing) {
        await updateDeliveryGuy(editing.id, {
          name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password || undefined,
        });
        toast.success(t("deliveryGuys.updatedToast"));
      } else {
        await createDeliveryGuy(form);
        toast.success(t("deliveryGuys.registeredToast"));
      }
      setModalOpen(false);
      await load();
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
      await updateDeliveryGuy(disableTarget.id, {
        isActive: !disableTarget.isActive,
      });
      setDisableTarget(null);
      toast.success(
        disableTarget.isActive
          ? t("deliveryGuys.disabledToast")
          : t("deliveryGuys.enabledToast"),
      );
      await load();
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
      await deleteDeliveryGuy(deleteTarget.id);
      setDeleteTarget(null);
      toast.success(t("deliveryGuys.deletedToast"));
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.deleteFailed"));
    } finally {
      setActionLoading(false);
    }
  }

  function handleExportPdf() {
    if (!deliveryGuys.length) {
      toast.error(t("deliveryGuys.noExport"));
      return;
    }

    downloadPdf({
      filename: "delivery-guys-list",
      title: t("deliveryGuys.pdfTitle"),
      subtitle: t("deliveryGuys.pdfSubtitle", { count: deliveryGuys.length }),
      business: settings,
      sections: [
        {
          headers: [
            t("deliveryGuys.colName"),
            t("deliveryGuys.colEmail"),
            t("deliveryGuys.colPhone"),
            t("deliveryGuys.colStatus"),
            t("deliveryGuys.colRegistered"),
          ],
          rows: deliveryGuys.map((guy) => [
            guy.name,
            guy.email,
            guy.phone ?? "—",
            guy.isActive ? t("common.active") : t("common.disabled"),
            new Date(guy.createdAt).toLocaleDateString(),
          ]),
        },
      ],
    });
    toast.success(t("deliveryGuys.pdfDownloadedToast"));
  }

  const columns: Column<DeliveryGuy>[] = [
    { key: "name", header: t("deliveryGuys.colName"), render: (g) => g.name },
    { key: "email", header: t("deliveryGuys.colEmail"), render: (g) => g.email },
    { key: "phone", header: t("deliveryGuys.colPhone"), render: (g) => g.phone ?? "—" },
    {
      key: "status",
      header: t("deliveryGuys.colStatus"),
      render: (g) => (
        <span
          className={`rounded-full px-2 py-1 text-xs ${g.isActive ? "bg-green-100 text-green-800" : "bg-stone-200 text-stone-700"}`}
        >
          {g.isActive ? t("common.active") : t("common.disabled")}
        </span>
      ),
    },
    {
      key: "registered",
      header: t("deliveryGuys.colRegistered"),
      render: (g) => new Date(g.createdAt).toLocaleDateString(),
    },
    {
      key: "actions",
      header: t("deliveryGuys.colActions"),
      render: (guy) => (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-amber-700 hover:bg-amber-50"
            onClick={() => openEdit(guy)}
          >
            <HiOutlinePencilSquare className="h-4 w-4 shrink-0" aria-hidden />
            {t("common.edit")}
          </button>
          <button
            type="button"
            className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm hover:bg-amber-50 ${
              guy.isActive ? "text-amber-700" : "text-green-700"
            }`}
            onClick={() => setDisableTarget(guy)}
          >
            {guy.isActive ? (
              <HiOutlineNoSymbol className="h-4 w-4 shrink-0" aria-hidden />
            ) : (
              <HiOutlineCheckCircle className="h-4 w-4 shrink-0" aria-hidden />
            )}
            {guy.isActive ? t("common.disable") : t("common.enable")}
          </button>
          {!guy.isActive ? (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-red-600 hover:bg-red-50"
              onClick={() => setDeleteTarget(guy)}
            >
              <HiOutlineTrash className="h-4 w-4 shrink-0" aria-hidden />
              {t("common.delete")}
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  const activePartners = deliveryGuys.filter((guy) => guy.isActive);
  const inactivePartners = deliveryGuys.filter((guy) => !guy.isActive);
  const filteredPartners =
    statusTab === "active" ? activePartners : inactivePartners;

  return (
    <div>
      <PageHeader
        title={t("deliveryGuys.title")}
        description={t("deliveryGuys.description")}
        action={
          <PageHeaderActions>
            <DownloadPdfButton
              onClick={handleExportPdf}
              disabled={!deliveryGuys.length || loading}
            />
            <Button onClick={openCreate}>
              <span className="inline-flex items-center gap-2">
                <HiOutlineUserPlus className="h-4 w-4" aria-hidden />
                {t("deliveryGuys.register")}
              </span>
            </Button>
          </PageHeaderActions>
        }
      />

      <div className="mb-4">
        <StatusTabs
          value={statusTab}
          onChange={setStatusTab}
          activeCount={activePartners.length}
          inactiveCount={inactivePartners.length}
        />
      </div>

      <DataTable
        columns={columns}
        data={filteredPartners}
        loading={loading}
        rowKey={(row) => row.id}
        emptyMessage={
          statusTab === "active"
            ? t("deliveryGuys.emptyActive")
            : t("deliveryGuys.emptyInactive")
        }
        getSearchText={(guy) =>
          [guy.name, guy.email, guy.phone, guy.isActive ? "active" : "disabled"]
            .filter(Boolean)
            .join(" ")
        }
        searchPlaceholder={t("deliveryGuys.searchPlaceholder")}
      />

      <Modal
        open={modalOpen}
        title={
          editing
            ? t("deliveryGuys.editTitle", { name: editing.name })
            : t("deliveryGuys.registerModal")
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
                  : t("deliveryGuys.registerButton")}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <Input
            label={t("deliveryGuys.formFullName")}
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label={t("deliveryGuys.formEmail")}
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label={t("deliveryGuys.formPhone")}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Input
            label={
              editing
                ? t("deliveryGuys.formNewPasswordOptional")
                : t("deliveryGuys.formPassword")
            }
            required={!editing}
            type="password"
            minLength={6}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
      </Modal>

      <ConfirmModal
        open={disableTarget !== null}
        title={
          disableTarget?.isActive
            ? t("deliveryGuys.disableTitle")
            : t("deliveryGuys.enableTitle")
        }
        message={
          disableTarget?.isActive
            ? t("deliveryGuys.disableMessage", { name: disableTarget.name })
            : t("deliveryGuys.enableMessage", { name: disableTarget?.name ?? "" })
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
        title={t("deliveryGuys.deleteTitle")}
        message={t("deliveryGuys.deleteMessage", {
          name: deleteTarget?.name ?? "",
        })}
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
