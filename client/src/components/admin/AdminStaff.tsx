import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, RefreshCw, X, Users } from "lucide-react";
import { fetchStaffList, createStaff, updateStaff, type StaffMember } from "@/lib/api";

const ROLES = ["support", "manager", "super_admin"] as const;

const ROLE_LABEL: Record<string, string> = {
  support: "Support (view + order status)",
  manager: "Manager (+ products & coupons)",
  super_admin: "Super Admin (+ staff management)",
};

export default function AdminStaff({ token }: { token: string }) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "support" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { staff } = await fetchStaffList(token);
      setStaff(staff);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load staff");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.name || !form.email || form.password.length < 8) {
      toast.error("Name, email, and an 8+ character password are required");
      return;
    }
    setSaving(true);
    try {
      await createStaff(token, form);
      toast.success("Staff account created");
      setModalOpen(false);
      setForm({ name: "", email: "", password: "", role: "support" });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create staff account");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (s: StaffMember) => {
    try {
      await updateStaff(token, s.id, { isActive: !s.isActive });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  const changeRole = async (s: StaffMember, role: string) => {
    try {
      await updateStaff(token, s.id, { role });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-dim text-sm">{staff.length} staff accounts</p>
        <div className="flex gap-2">
          <button onClick={load} className="glass-chip p-2.5 text-white" style={{ borderRadius: "10px" }} aria-label="Refresh">
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setModalOpen(true)} className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Staff
          </button>
        </div>
      </div>

      {staff.length === 0 ? (
        <div className="glass p-12 text-center" style={{ borderRadius: "16px" }}>
          <Users className="w-10 h-10 mx-auto mb-3 text-dim" />
          <p className="text-dim">No staff accounts yet. Everyone still uses the master key.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {staff.map((s) => (
            <div key={s.id} className="glass p-4 flex items-center gap-4 flex-wrap" style={{ borderRadius: "14px" }}>
              <div className="flex-1 min-w-[180px]">
                <p className="font-bold">{s.name}</p>
                <p className="text-dim text-sm">{s.email}</p>
              </div>
              <select
                value={s.role}
                onChange={(e) => changeRole(s, e.target.value)}
                className="bg-transparent border border-momo text-white px-3 py-1.5 text-xs font-bold uppercase tracking-widest focus:outline-none focus:border-accent"
                style={{ borderRadius: "8px" }}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r} style={{ background: "#141414" }}>{r.replace("_", " ")}</option>
                ))}
              </select>
              <button
                onClick={() => toggleActive(s)}
                className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide glass-chip text-white"
                style={{ borderRadius: "8px" }}
              >
                {s.isActive ? "Active" : "Disabled"}
              </button>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)}>
          <div className="glass-strong w-full max-w-md p-6" style={{ borderRadius: "16px" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="heading-subsection">New Staff Account</h3>
              <button onClick={() => setModalOpen(false)} className="text-dim hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-dim">Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-transparent border border-momo text-white px-3 py-2 focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-dim">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-transparent border border-momo text-white px-3 py-2 focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-dim">Password</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-transparent border border-momo text-white px-3 py-2 focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-dim">Role</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full bg-transparent border border-momo text-white px-3 py-2 focus:outline-none focus:border-accent">
                  {ROLES.map((r) => (
                    <option key={r} value={r} style={{ background: "#141414" }}>{ROLE_LABEL[r]}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleCreate} disabled={saving} className="btn-primary flex-1 disabled:opacity-60">
                {saving ? "Saving..." : "Create Account"}
              </button>
              <button onClick={() => setModalOpen(false)} className="btn-outline-light">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
