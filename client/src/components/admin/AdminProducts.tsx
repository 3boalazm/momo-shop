import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, RefreshCw, X, Boxes } from "lucide-react";
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  fetchVariants,
  updateVariantStock,
  type ApiProduct,
  type ProductPayload,
  type Variant,
} from "@/lib/api";

const CATEGORIES = ["tees", "denim", "hoodies"] as const;

const EMPTY_FORM: ProductPayload = {
  name: "",
  slug: "",
  description: "",
  category: "tees",
  basePrice: 0,
  compareAtPrice: undefined,
  images: [],
  isActive: true,
};

export default function AdminProducts({ token }: { token: string }) {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductPayload>(EMPTY_FORM);
  const [imagesText, setImagesText] = useState("");
  const [saving, setSaving] = useState(false);

  // Inventory modal
  const [invProduct, setInvProduct] = useState<ApiProduct | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [invLoading, setInvLoading] = useState(false);

  const openInventory = async (p: ApiProduct) => {
    setInvProduct(p);
    setInvLoading(true);
    try {
      const { variants } = await fetchVariants(p.id);
      setVariants(variants);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load inventory");
    } finally {
      setInvLoading(false);
    }
  };

  const saveStock = async (variantId: number, stock: number) => {
    if (!invProduct) return;
    try {
      await updateVariantStock(token, invProduct.id, variantId, stock);
      setVariants((prev) => prev.map((v) => (v.id === variantId ? { ...v, stock } : v)));
      toast.success("Stock updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update stock");
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { products } = await fetchProducts(true); // include inactive
      setProducts(products);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setImagesText("");
    setModalOpen(true);
  };

  const openEdit = (p: ApiProduct) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      slug: p.slug,
      description: p.description || "",
      category: p.category as ProductPayload["category"],
      basePrice: Number(p.basePrice),
      compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : undefined,
      images: p.images,
      sizeGuide: p.sizeGuide || undefined,
      isActive: p.isActive,
    });
    setImagesText(p.images.join("\n"));
    setModalOpen(true);
  };

  const handleSave = async () => {
    const images = imagesText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!form.name || !form.slug || images.length === 0 || form.basePrice <= 0) {
      toast.error("Name, slug, price, and at least one image are required");
      return;
    }

    const payload: ProductPayload = { ...form, images };
    setSaving(true);
    try {
      if (editingId) {
        await updateProduct(token, editingId, payload);
        toast.success("Product updated");
      } else {
        await createProduct(token, payload);
        toast.success("Product created");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: ApiProduct) => {
    if (!confirm(`Archive "${p.name}"? It will be hidden from the store.`)) return;
    try {
      await deleteProduct(token, p.id);
      toast.success("Product archived");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-dim text-sm">{products.length} products</p>
        <div className="flex gap-2">
          <button onClick={load} className="glass-chip p-2.5 text-white" style={{ borderRadius: "10px" }} aria-label="Refresh">
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={openCreate} className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="glass p-12 text-center" style={{ borderRadius: "16px" }}>
          <p className="text-dim">No products yet. Add your first one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((p) => (
            <div key={p.id} className="glass p-4 flex items-center gap-4" style={{ borderRadius: "14px" }}>
              <div className="w-14 h-14 flex-shrink-0 overflow-hidden surface-2" style={{ borderRadius: "8px" }}>
                {p.images[0] && <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" loading="lazy" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold truncate" style={{ fontFamily: "var(--font-display)" }}>{p.name}</span>
                  {!p.isActive && <span className="text-xs text-dim border border-momo px-2 py-0.5 rounded">Archived</span>}
                </div>
                <p className="text-dim text-sm">{p.category} · {p.slug}</p>
              </div>
              <span className="text-accent font-bold whitespace-nowrap">{Number(p.basePrice).toLocaleString()} LE</span>
              <div className="flex gap-1">
                <button onClick={() => openInventory(p)} className="p-2 hover:bg-white/10 transition-colors" style={{ borderRadius: "8px" }} aria-label="Inventory" title="Manage stock">
                  <Boxes className="w-4 h-4 text-white" />
                </button>
                <button onClick={() => openEdit(p)} className="p-2 hover:bg-white/10 transition-colors" style={{ borderRadius: "8px" }} aria-label="Edit">
                  <Pencil className="w-4 h-4 text-white" />
                </button>
                <button onClick={() => handleDelete(p)} className="p-2 hover:bg-white/10 transition-colors" style={{ borderRadius: "8px" }} aria-label="Archive">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)}>
          <div className="glass-strong w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" style={{ borderRadius: "16px" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="heading-subsection">{editingId ? "Edit Product" : "New Product"}</h3>
              <button onClick={() => setModalOpen(false)} className="text-dim hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-4">
              <Field label="Name">
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Slug (lowercase-with-hyphens)">
                <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className={inputCls} placeholder="oversized-tee" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Price (LE)">
                  <input type="number" value={form.basePrice || ""} onChange={(e) => setForm({ ...form, basePrice: Number(e.target.value) })} className={inputCls} />
                </Field>
                <Field label="Compare-at (optional)">
                  <input type="number" value={form.compareAtPrice || ""} onChange={(e) => setForm({ ...form, compareAtPrice: e.target.value ? Number(e.target.value) : undefined })} className={inputCls} />
                </Field>
              </div>
              <Field label="Category">
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ProductPayload["category"] })} className={inputCls}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Description">
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} rows={3} />
              </Field>
              <Field label="Image URLs (one per line)">
                <textarea value={imagesText} onChange={(e) => setImagesText(e.target.value)} className={inputCls} rows={3} placeholder="https://..." />
              </Field>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                <span>Active (visible in store)</span>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 disabled:opacity-60">
                {saving ? "Saving..." : editingId ? "Save Changes" : "Create Product"}
              </button>
              <button onClick={() => setModalOpen(false)} className="btn-outline-light">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Inventory modal */}
      {invProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setInvProduct(null)}>
          <div className="glass-strong w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" style={{ borderRadius: "16px" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <span className="eyebrow block mb-1">Inventory</span>
                <h3 className="heading-subsection">{invProduct.name}</h3>
              </div>
              <button onClick={() => setInvProduct(null)} className="text-dim hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            {invLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : variants.length === 0 ? (
              <p className="text-dim text-sm text-center py-8">No variants tracked for this product.</p>
            ) : (
              <div className="space-y-2">
                {variants.map((v) => (
                  <div key={v.id} className="flex items-center gap-3 p-3 bg-white/5" style={{ borderRadius: "10px" }}>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{v.color} · Size {v.size}</p>
                      <p className="text-dim text-xs">{v.sku}</p>
                    </div>
                    <input
                      type="number"
                      min={0}
                      defaultValue={v.stock}
                      onBlur={(e) => {
                        const n = Number(e.target.value);
                        if (Number.isInteger(n) && n >= 0 && n !== v.stock) saveStock(v.id, n);
                      }}
                      className={`w-20 bg-transparent border text-white px-2 py-1.5 text-center focus:outline-none focus:border-accent ${
                        v.stock === 0 ? "border-red-500" : v.stock <= 5 ? "border-yellow-500" : "border-momo"
                      }`}
                      style={{ borderRadius: "8px" }}
                    />
                  </div>
                ))}
                <p className="text-dim text-xs mt-3">Edit a number and click away to save. Red = out of stock, yellow = low (≤5).</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls = "w-full bg-transparent border border-momo text-white px-3 py-2 placeholder:text-dim focus:outline-none focus:border-accent";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-dim">{label}</label>
      {children}
    </div>
  );
}
