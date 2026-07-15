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
      toast.error("Category is required");
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
        toast.success("Product updated");
      } else {
        await createProduct(payload);
        toast.success("Product added");
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
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
      toast.error("Category name is required");
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
      toast.success("Category renamed");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Rename failed");
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
        disableTarget.isActive ? "Product disabled" : "Product enabled",
      );
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
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
      toast.success("Product deleted");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  function handleExportPdf() {
    if (!products.length) {
      toast.error("No products to export");
      return;
    }

    downloadPdf({
      filename: "products-list",
      title: "Products List",
      subtitle: `${products.length} product(s)`,
      business: settings,
      sections: [
        {
          headers: ["Product", "Category", "Price (Rs)", "Stock", "Status", "Description"],
          rows: products.map((product) => [
            product.name,
            product.category,
            formatCurrency(product.price),
            String(product.stockAvailable),
            product.isActive ? "Active" : "Disabled",
            product.description ?? "—",
          ]),
        },
      ],
    });
    toast.success("Products PDF downloaded");
  }

  const columns: Column<Product>[] = [
    {
      key: "image",
      header: "Image",
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
      header: "Product",
      render: (product) => (
        <div>
          <p className="font-medium">{product.name}</p>
          {product.description ? (
            <p className="text-xs text-stone-600">{product.description}</p>
          ) : null}
        </div>
      ),
    },
    { key: "category", header: "Category", render: (p) => p.category },
    {
      key: "price",
      header: "Price (Rs)",
      render: (p) => formatCurrency(p.price),
    },
    {
      key: "stock",
      header: "Stock",
      render: (p) => p.stockAvailable,
    },
    {
      key: "status",
      header: "Status",
      render: (p) => (
        <span
          className={`rounded-full px-2 py-1 text-xs ${p.isActive ? "bg-green-100 text-green-800" : "bg-stone-200 text-stone-700"}`}
        >
          {p.isActive ? "Active" : "Disabled"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (product) => (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-amber-700 hover:bg-amber-50"
            onClick={() => openEdit(product)}
          >
            <HiOutlinePencilSquare className="h-4 w-4 shrink-0" aria-hidden />
            Edit
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
            {product.isActive ? "Disable" : "Enable"}
          </button>
          {!product.isActive ? (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-red-600 hover:bg-red-50"
              onClick={() => setDeleteTarget(product)}
            >
              <HiOutlineTrash className="h-4 w-4 shrink-0" aria-hidden />
              Delete
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
        title="Products"
        description="Manage bakery products and stock. Disable before deleting."
        action={
          <PageHeaderActions>
            <DownloadPdfButton
              onClick={handleExportPdf}
              disabled={!products.length || loading}
            />
            <Button onClick={openCreate}>+ Add product</Button>
          </PageHeaderActions>
        }
      />

      {categories.length > 0 ? (
        <section className="mb-6 rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-medium text-stone-700">Categories</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => openRenameCategory(category)}
                className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm text-amber-900 transition hover:bg-amber-100"
                title="Click to rename"
              >
                {category.name}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-stone-500">
            Click a category to rename it. New categories appear when you add a
            product.
          </p>
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
            label="Category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </Select>
          <Select
            label="Sort by"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="name-asc">Name A–Z</option>
            <option value="price-asc">Price low to high</option>
            <option value="price-desc">Price high to low</option>
            <option value="stock-desc">Stock high to low</option>
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
            ? "No active products yet. Add your first product."
            : "No inactive products."
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
        searchPlaceholder="Search products..."
      />

      <Modal
        open={modalOpen}
        title={editing ? "Edit product" : "Add product"}
        onClose={() => setModalOpen(false)}
        size="lg"
        footer={
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" fullWidth onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button fullWidth onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Saving..." : editing ? "Update" : "Add product"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Price (Rs)"
            required
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
          <div className="sm:col-span-2">
            <Textarea
              label="Description"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>
          <CategoryInput
            label="Category"
            required
            value={form.category}
            onChange={(category) => setForm({ ...form, category })}
            categories={categories.map((category) => category.name)}
            placeholder="Type or pick a category"
          />
          <Input
            label="Stock available"
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
              label="Product image"
              value={form.imageUrl}
              onChange={(url) => setForm({ ...form, imageUrl: url })}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={categoryModalOpen}
        title={`Rename "${editingCategory?.name ?? "category"}"`}
        onClose={() => setCategoryModalOpen(false)}
        footer={
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setCategoryModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              fullWidth
              onClick={() => void handleRenameCategory()}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save category name"}
            </Button>
          </div>
        }
      >
        <Input
          label="Category name"
          required
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
          placeholder="e.g. Bread, Pastry, Cake"
        />
      </Modal>

      <ConfirmModal
        open={disableTarget !== null}
        title={disableTarget?.isActive ? "Disable product" : "Enable product"}
        message={
          disableTarget?.isActive
            ? `Disable ${disableTarget.name}? It will be hidden from stock assignments and new deliveries.`
            : `Enable ${disableTarget?.name}? It will be available for assignments and deliveries again.`
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
        title="Delete product"
        message={`Permanently delete ${deleteTarget?.name}? Only possible when disabled and with no sales records.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleting}
        onConfirm={() => void confirmDeleteProduct()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
