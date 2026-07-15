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

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
};

export default function DeliveryGuysPage() {
  const toast = useToast();
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
      toast.error(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

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
        toast.success("Delivery partner updated");
      } else {
        await createDeliveryGuy(form);
        toast.success("Delivery partner registered");
      }
      setModalOpen(false);
      await load();
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
      await updateDeliveryGuy(disableTarget.id, {
        isActive: !disableTarget.isActive,
      });
      setDisableTarget(null);
      toast.success(
        disableTarget.isActive
          ? "Delivery partner disabled"
          : "Delivery partner enabled",
      );
      await load();
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
      await deleteDeliveryGuy(deleteTarget.id);
      setDeleteTarget(null);
      toast.success("Delivery partner deleted");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setActionLoading(false);
    }
  }

  function handleExportPdf() {
    if (!deliveryGuys.length) {
      toast.error("No delivery partners to export");
      return;
    }

    downloadPdf({
      filename: "delivery-guys-list",
      title: "Delivery Partners List",
      subtitle: `${deliveryGuys.length} delivery partner(s)`,
      business: settings,
      sections: [
        {
          headers: ["Name", "Email", "Phone", "Status", "Registered"],
          rows: deliveryGuys.map((guy) => [
            guy.name,
            guy.email,
            guy.phone ?? "—",
            guy.isActive ? "Active" : "Disabled",
            new Date(guy.createdAt).toLocaleDateString(),
          ]),
        },
      ],
    });
    toast.success("Delivery partners PDF downloaded");
  }

  const columns: Column<DeliveryGuy>[] = [
    { key: "name", header: "Name", render: (g) => g.name },
    { key: "email", header: "Email", render: (g) => g.email },
    { key: "phone", header: "Phone", render: (g) => g.phone ?? "—" },
    {
      key: "status",
      header: "Status",
      render: (g) => (
        <span
          className={`rounded-full px-2 py-1 text-xs ${g.isActive ? "bg-green-100 text-green-800" : "bg-stone-200 text-stone-700"}`}
        >
          {g.isActive ? "Active" : "Disabled"}
        </span>
      ),
    },
    {
      key: "registered",
      header: "Registered",
      render: (g) => new Date(g.createdAt).toLocaleDateString(),
    },
    {
      key: "actions",
      header: "Actions",
      render: (guy) => (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-amber-700 hover:bg-amber-50"
            onClick={() => openEdit(guy)}
          >
            <HiOutlinePencilSquare className="h-4 w-4 shrink-0" aria-hidden />
            Edit
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
            {guy.isActive ? "Disable" : "Enable"}
          </button>
          {!guy.isActive ? (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-red-600 hover:bg-red-50"
              onClick={() => setDeleteTarget(guy)}
            >
              <HiOutlineTrash className="h-4 w-4 shrink-0" aria-hidden />
              Delete
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
        title="Delivery Partners"
        description="Registered delivery partners. Disable before deleting. Only disabled partners can be removed."
        action={
          <PageHeaderActions>
            <DownloadPdfButton
              onClick={handleExportPdf}
              disabled={!deliveryGuys.length || loading}
            />
            <Button onClick={openCreate}>
              <span className="inline-flex items-center gap-2">
                <HiOutlineUserPlus className="h-4 w-4" aria-hidden />
                Register delivery partner
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
            ? "No active delivery partners yet."
            : "No inactive delivery partners."
        }
        getSearchText={(guy) =>
          [guy.name, guy.email, guy.phone, guy.isActive ? "active" : "disabled"]
            .filter(Boolean)
            .join(" ")
        }
        searchPlaceholder="Search delivery partners..."
      />

      <Modal
        open={modalOpen}
        title={editing ? `Edit ${editing.name}` : "Register delivery partner"}
        onClose={() => setModalOpen(false)}
        footer={
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" fullWidth onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button fullWidth onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Saving..." : editing ? "Save changes" : "Register"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <Input
            label="Full name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Email"
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Input
            label={editing ? "New password (optional)" : "Password"}
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
        title={disableTarget?.isActive ? "Disable delivery partner" : "Enable delivery partner"}
        message={
          disableTarget?.isActive
            ? `Disable ${disableTarget.name}? They will not be able to login until enabled again.`
            : `Enable ${disableTarget?.name}? They will be able to login and receive stock again.`
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
        title="Delete delivery partner"
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
