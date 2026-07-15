"use client";

import { useCallback, useEffect, useState } from "react";
import {
  HiOutlineCheckCircle,
  HiOutlineNoSymbol,
  HiOutlinePencilSquare,
  HiOutlineTrash,
} from "react-icons/hi2";

import { useBusinessSettings } from "@/components/BusinessSettingsProvider";
import { Button } from "@/components/ui/Button";
import {
  DownloadPdfButton,
  PageHeaderActions,
} from "@/components/ui/DownloadPdfButton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { CategoryInput } from "@/components/ui/CategoryInput";
import { Column, DataTable } from "@/components/ui/DataTable";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { StatusTabs } from "@/components/ui/StatusTabs";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/ToastProvider";
import {
  createProduct,
  deleteProduct,
  fetchProductCategories,
  fetchProducts,
  renameProductCategory,
  updateProduct,
  type Product,
  type ProductCategory,
} from "@/lib/api";
import { downloadPdf } from "@/lib/export-pdf";
import { formatCurrency } from "@/lib/currency";
import { useT } from "@/lib/i18n";

const emptyForm = {
  name: "",
  description: "",
  price: "",
  category: "",
  stockAvailable: "0",
  imageUrl: null as string | null,
};

export default function ProductsPage() {
  const toast = useToast();
  const t = useT();
  const { settings } = useBusinessSettings();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(
    null,
  );
  const [categoryName, setCategoryName] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [disableTarget, setDisableTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusTab, setStatusTab] = useState<"active" | "inactive">("active");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortBy, setSortBy] = useState("name-asc");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [productRows, categoryRows] = await Promise.all([
        fetchProducts(),
        fetchProductCategories(),
      ]);
      setProducts(productRows);
      setCategories(categoryRows);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.failedToLoad"));
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setForm({
      name: product.name,
      description: product.description ?? "",
      price: product.price,
      category: product.category,
      stockAvailable: String(product.stockAvailable),
      imageUrl: product.imageUrl,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.category.trim()) {
      toast.error(t("products.categoryRequired"));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        price: form.price,
        category: form.category.trim(),
        stockAvailable: Number(form.stockAvailable),
        imageUrl: form.imageUrl,
      };
      if (editing) {
        await updateProduct(editing.id, payload);
        toast.success(t("products.updatedToast"));
      } else {
        await createProduct(payload);
        toast.success(t("products.addedToast"));
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  function openRenameCategory(category: ProductCategory) {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryModalOpen(true);
  }

  async function handleRenameCategory() {
    if (!editingCategory) return;
    if (!categoryName.trim()) {
      toast.error(t("products.categoryNameRequired"));
      return;
    }

    setSaving(true);
    try {
      const updated = await renameProductCategory(
        editingCategory.name,
        categoryName.trim(),
      );
      setCategories(updated);
      setCategoryModalOpen(false);
      setEditingCategory(null);
      toast.success(t("products.categoryRenamedToast"));
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("products.renameFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDisable() {
    if (!disableTarget) return;
    setActionLoading(true);
    try {
      await updateProduct(disableTarget.id, {
        isActive: !disableTarget.isActive,
      });
      setDisableTarget(null);
      toast.success(
        disableTarget.isActive
          ? t("products.disabledToast")
          : t("products.enabledToast"),
      );
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.updateFailed"));
    } finally {
      setActionLoading(false);
    }
  }

  async function confirmDeleteProduct() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProduct(deleteTarget.id);
      setDeleteTarget(null);
      toast.success(t("products.deletedToast"));
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.deleteFailed"));
    } finally {
      setDeleting(false);
    }
  }

  function handleExportPdf() {
    if (!products.length) {
      toast.error(t("products.noExport"));
      return;
    }

    downloadPdf({
      filename: "products-list",
      title: t("products.pdfTitle"),
      subtitle: t("products.pdfSubtitle", { count: products.length }),
      business: settings,
      sections: [
        {
          headers: [
            t("products.colProduct"),
            t("products.colCategory"),
            t("products.colPriceRs"),
            t("products.colStock"),
            t("products.colStatus"),
            t("products.colDescription"),
          ],
          rows: products.map((product) => [
            product.name,
            product.category,
            formatCurrency(product.price),
            String(product.stockAvailable),
            product.isActive ? t("common.active") : t("common.disabled"),
            product.description ?? "—",
          ]),
        },
      ],
    });
    toast.success(t("products.pdfDownloadedToast"));
  }

  const columns: Column<Product>[] = [
    {
      key: "image",
      header: t("products.colImage"),
      render: (product) =>
        product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-10 w-10 rounded-lg object-cover"
          />
        ) : (
          <span className="text-xs text-stone-500">—</span>
        ),
    },
    {
      key: "name",
      header: t("products.colProduct"),
      render: (product) => (
        <div>
          <p className="font-medium">{product.name}</p>
          {product.description ? (
            <p className="text-xs text-stone-600">{product.description}</p>
          ) : null}
        </div>
      ),
    },
    { key: "category", header: t("products.colCategory"), render: (p) => p.category },
    {
      key: "price",
      header: t("products.colPriceRs"),
      render: (p) => formatCurrency(p.price),
    },
    {
      key: "stock",
      header: t("products.colStock"),
      render: (p) => p.stockAvailable,
    },
    {
      key: "status",
      header: t("products.colStatus"),
      render: (p) => (
        <span
          className={`rounded-full px-2 py-1 text-xs ${p.isActive ? "bg-green-100 text-green-800" : "bg-stone-200 text-stone-700"}`}
        >
          {p.isActive ? t("common.active") : t("common.disabled")}
        </span>
      ),
    },
    {
      key: "actions",
      header: t("products.colActions"),
      render: (product) => (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-amber-700 hover:bg-amber-50"
            onClick={() => openEdit(product)}
          >
            <HiOutlinePencilSquare className="h-4 w-4 shrink-0" aria-hidden />
            {t("common.edit")}
          </button>
          <button
            type="button"
            className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm hover:bg-amber-50 ${
              product.isActive ? "text-amber-700" : "text-green-700"
            }`}
            onClick={() => setDisableTarget(product)}
          >
            {product.isActive ? (
              <HiOutlineNoSymbol className="h-4 w-4 shrink-0" aria-hidden />
            ) : (
              <HiOutlineCheckCircle className="h-4 w-4 shrink-0" aria-hidden />
            )}
            {product.isActive ? t("common.disable") : t("common.enable")}
          </button>
          {!product.isActive ? (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-red-600 hover:bg-red-50"
              onClick={() => setDeleteTarget(product)}
            >
              <HiOutlineTrash className="h-4 w-4 shrink-0" aria-hidden />
              {t("common.delete")}
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  const activeProducts = products.filter((product) => product.isActive);
  const inactiveProducts = products.filter((product) => !product.isActive);

  const filteredProducts = (statusTab === "active" ? activeProducts : inactiveProducts)
    .filter((product) => {
      if (!categoryFilter) return true;
      return product.category === categoryFilter;
    })
    .slice()
    .sort((a, b) => {
      switch (sortBy) {
        case "price-asc":
          return Number(a.price) - Number(b.price);
        case "price-desc":
          return Number(b.price) - Number(a.price);
        case "stock-desc":
          return b.stockAvailable - a.stockAvailable;
        case "name-asc":
        default:
          return a.name.localeCompare(b.name);
      }
    });

  return (
    <div>
      <PageHeader
        title={t("products.title")}
        description={t("products.description")}
        action={
          <PageHeaderActions>
            <DownloadPdfButton
              onClick={handleExportPdf}
              disabled={!products.length || loading}
            />
            <Button onClick={openCreate}>{t("products.addProduct")}</Button>
          </PageHeaderActions>
        }
      />

      {categories.length > 0 ? (
        <section className="mb-6 rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-medium text-stone-700">
            {t("products.categories")}
          </p>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => openRenameCategory(category)}
                className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm text-amber-900 transition hover:bg-amber-100"
                title={t("products.clickToRenameTitle")}
              >
                {category.name}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-stone-500">{t("products.categoryHint")}</p>
        </section>
      ) : null}

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <StatusTabs
          value={statusTab}
          onChange={setStatusTab}
          activeCount={activeProducts.length}
          inactiveCount={inactiveProducts.length}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:w-[28rem]">
          <Select
            label={t("common.category")}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">{t("products.allCategories")}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </Select>
          <Select
            label={t("products.sortBy")}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="name-asc">{t("products.sortNameAsc")}</option>
            <option value="price-asc">{t("products.sortPriceAsc")}</option>
            <option value="price-desc">{t("products.sortPriceDesc")}</option>
            <option value="stock-desc">{t("products.sortStockDesc")}</option>
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredProducts}
        loading={loading}
        rowKey={(row) => row.id}
        emptyMessage={
          statusTab === "active"
            ? t("products.emptyActive")
            : t("products.emptyInactive")
        }
        getSearchText={(product) =>
          [
            product.name,
            product.category,
            product.description,
            product.price,
            String(product.stockAvailable),
            product.isActive ? "active" : "disabled",
          ]
            .filter(Boolean)
            .join(" ")
        }
        searchPlaceholder={t("products.searchPlaceholder")}
      />

      <Modal
        open={modalOpen}
        title={editing ? t("products.editProduct") : t("products.addProductModal")}
        onClose={() => setModalOpen(false)}
        size="lg"
        footer={
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" fullWidth onClick={() => setModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button fullWidth onClick={() => void handleSave()} disabled={saving}>
              {saving
                ? t("common.saving")
                : editing
                  ? t("products.update")
                  : t("products.addProductModal")}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t("products.formName")}
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label={t("products.formPriceRs")}
            required
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
          <div className="sm:col-span-2">
            <Textarea
              label={t("products.formDescription")}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>
          <CategoryInput
            label={t("products.formCategory")}
            required
            value={form.category}
            onChange={(category) => setForm({ ...form, category })}
            categories={categories.map((category) => category.name)}
            placeholder={t("products.formCategoryPlaceholder")}
          />
          <Input
            label={t("products.formStockAvailable")}
            required
            type="number"
            min="0"
            value={form.stockAvailable}
            onChange={(e) =>
              setForm({ ...form, stockAvailable: e.target.value })
            }
          />
          <div className="sm:col-span-2">
            <ImageUpload
              label={t("products.formProductImage")}
              value={form.imageUrl}
              onChange={(url) => setForm({ ...form, imageUrl: url })}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={categoryModalOpen}
        title={t("products.renameCategoryTitle", {
          name: editingCategory?.name ?? t("common.category"),
        })}
        onClose={() => setCategoryModalOpen(false)}
        footer={
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setCategoryModalOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              fullWidth
              onClick={() => void handleRenameCategory()}
              disabled={saving}
            >
              {saving ? t("common.saving") : t("products.saveCategoryName")}
            </Button>
          </div>
        }
      >
        <Input
          label={t("products.formCategoryName")}
          required
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
          placeholder={t("products.formCategoryNamePlaceholder")}
        />
      </Modal>

      <ConfirmModal
        open={disableTarget !== null}
        title={
          disableTarget?.isActive
            ? t("products.disableTitle")
            : t("products.enableTitle")
        }
        message={
          disableTarget?.isActive
            ? t("products.disableMessage", { name: disableTarget.name })
            : t("products.enableMessage", { name: disableTarget?.name ?? "" })
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
        title={t("products.deleteTitle")}
        message={t("products.deleteMessage", { name: deleteTarget?.name ?? "" })}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        loading={deleting}
        onConfirm={() => void confirmDeleteProduct()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
