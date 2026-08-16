import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Trash2, RefreshCw, X, Tag } from "lucide-react";
import {
  fetchCoupons, createCoupon, updateCoupon, deleteCoupon,
  type AdminCoupon, type CouponPayload,
} from "@/lib/api";

const EMPTY: CouponPayload = {
  code: "",
  discountType: "percentage",
  value: 10,
  minSubtotal: undefined,
  usageLimit: undefined,
  expiresAt: undefined,
  isActive: true,
};

export default function AdminCoupons({ token }: { token: string }) {
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CouponPayload>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { coupons } = await fetchCoupons(token);
      setCoupons(coupons);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load coupons");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(EMPTY); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.code || form.value <= 0) {
      toast.error("Code and a positive value are required");
      return;
    }
    setSaving(true);
    try {
      await createCoupon(token, {
        ...form,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
      });
      toast.success("Coupon created");
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (c: AdminCoupon) => {
    try {
      await updateCoupon(token, c.id, { isActive: !c.isActive });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  const handleDelete = async (c: AdminCoupon) => {
    if (!confirm(`Delete coupon "${c.code}"?`)) return;
    try {
      await deleteCoupon(token, c.id);
      toast.success("Coupon deleted");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const fmtValue = (c: AdminCoupon) =>
    c.discountType === "percentage" ? `${Number(c.value)}%` : `${Number(c.value).toLocaleString()} LE`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-dim text-sm">{coupons.length} coupons</p>
        <div className="flex gap-2">
          <button onClick={load} className="glass-chip p-2.5 text-white" style={{ borderRadius: "10px" }} aria-label="Refresh">
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={openCreate} className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Coupon
          </button>
        </div>
      </div>

      {coupons.length === 0 ? (
        <div className="glass p-12 text-center" style={{ borderRadius: "16px" }}>
          <Tag className="w-10 h-10 mx-auto mb-3 text-dim" />
          <p className="text-dim">No coupons yet. Create one to run a promo.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {coupons.map((c) => {
            const expired = c.expiresAt && new Date(c.expiresAt) < new Date();
            const maxed = c.usageLimit !== null && c.usageCount >= c.usageLimit;
            return (
              <div key={c.id} className="glass p-4 flex items-center gap-4" style={{ borderRadius: "14px" }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-accent tracking-wide" style={{ fontFamily: "var(--font-display)" }}>{c.code}</span>
                    <span className="text-sm text-white">{fmtValue(c)} off</span>
                    {!c.isActive && <Pill text="Inactive" />}
                    {expired && <Pill text="Expired" />}
                    {maxed && <Pill text="Limit reached" />}
                  </div>
                  <p className="text-dim text-xs mt-1">
                    {c.minSubtotal ? `Min ${Number(c.minSubtotal).toLocaleString()} LE · ` : ""}
                    Used {c.usageCount}{c.usageLimit !== null ? `/${c.usageLimit}` : ""}
                    {c.expiresAt ? ` · Expires ${new Date(c.expiresAt).toLocaleDateString("en-EG")}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => toggleActive(c)}
                  className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide glass-chip text-white"
                  style={{ borderRadius: "8px" }}
                >
                  {c.isActive ? "Disable" : "Enable"}
                </button>
                <button onClick={() => handleDelete(c)} className="p-2 hover:bg-white/10 transition-colors" style={{ borderRadius: "8px" }} aria-label="Delete">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)}>
          <div className="glass-strong w-full max-w-md p-6" style={{ borderRadius: "16px" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="heading-subsection">New Coupon</h3>
              <button onClick={() => setModalOpen(false)} className="text-dim hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-4">
              <Field label="Code">
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className={inputCls} placeholder="SUMMER20" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Type">
                  <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value as "percentage" | "fixed" })} className={inputCls}>
                    <option value="percentage">Percentage %</option>
                    <option value="fixed">Fixed LE</option>
                  </select>
                </Field>
                <Field label={form.discountType === "percentage" ? "Percent (%)" : "Amount (LE)"}>
                  <input type="number" value={form.value || ""} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} className={inputCls} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Min subtotal (optional)">
                  <input type="number" value={form.minSubtotal || ""} onChange={(e) => setForm({ ...form, minSubtotal: e.target.value ? Number(e.target.value) : undefined })} className={inputCls} />
                </Field>
                <Field label="Usage limit (optional)">
                  <input type="number" value={form.usageLimit || ""} onChange={(e) => setForm({ ...form, usageLimit: e.target.value ? Number(e.target.value) : undefined })} className={inputCls} />
                </Field>
              </div>
              <Field label="Expires (optional)">
                <input type="date" value={form.expiresAt || ""} onChange={(e) => setForm({ ...form, expiresAt: e.target.value || undefined })} className={inputCls} />
              </Field>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 disabled:opacity-60">
                {saving ? "Saving..." : "Create Coupon"}
              </button>
              <button onClick={() => setModalOpen(false)} className="btn-outline-light">Cancel</button>
            </div>
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

function Pill({ text }: { text: string }) {
  return <span className="text-xs text-dim border border-momo px-2 py-0.5 rounded">{text}</span>;
}
