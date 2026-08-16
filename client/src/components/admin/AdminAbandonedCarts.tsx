import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { RefreshCw, MessageCircle, ShoppingCart, Check, X } from "lucide-react";
import {
  fetchAbandonedCarts,
  updateAbandonedCart,
  type AbandonedCart,
} from "@/lib/api";
import { WHATSAPP_NUMBER, CURRENCY_SYMBOL } from "@shared/const";

const FILTERS = ["Open", "Contacted", "Recovered", "Dismissed", "All"];

export default function AdminAbandonedCarts({ token }: { token: string }) {
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("Open");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { carts } = await fetchAbandonedCarts(token, filter);
      setCarts(carts);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load carts");
    } finally {
      setLoading(false);
    }
  }, [token, filter]);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (id: number, status: string) => {
    try {
      await updateAbandonedCart(token, id, status);
      toast.success(`Marked ${status}`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  const waLink = (c: AbandonedCart) => {
    const lines = c.items.map(
      (it) => `• ${it.name} (${it.color}/${it.size}) ×${it.quantity}`
    );
    const msg =
      `مرحباً${c.name ? " " + c.name : ""} 👋\nلاحظنا إنك سيبت السلة دي في أولتري:\n\n${lines.join("\n")}\n\n` +
      `الإجمالي: ${Number(c.subtotal).toLocaleString()} ${CURRENCY_SYMBOL}\n\nحابين نكمّل طلبك؟ 🔥`;
    const phone = c.phone.replace(/[\s\-+]/g, "").replace(/^0/, "20");
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
                filter === f ? "bg-accent text-white" : "glass-chip text-white"
              }`}
              style={{ borderRadius: "8px" }}
            >
              {f}
            </button>
          ))}
        </div>
        <button onClick={load} className="glass-chip p-2.5 text-white" style={{ borderRadius: "10px" }} aria-label="Refresh">
          <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {carts.length === 0 ? (
        <div className="glass p-12 text-center" style={{ borderRadius: "16px" }}>
          <ShoppingCart className="w-10 h-10 mx-auto mb-3 text-dim" />
          <p className="text-dim">No {filter !== "All" ? filter.toLowerCase() : ""} carts.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {carts.map((c) => (
            <div key={c.id} className="glass p-4" style={{ borderRadius: "14px" }}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold">{c.name || "Guest"}</span>
                    <span className="text-dim text-sm" dir="ltr">{c.phone}</span>
                    <StatusPill status={c.status} />
                  </div>
                  <p className="text-dim text-xs mt-1">
                    {new Date(c.createdAt).toLocaleString("en-EG")} · {c.items.length} item(s) · {Number(c.subtotal).toLocaleString()} {CURRENCY_SYMBOL}
                  </p>
                  <div className="mt-2 space-y-0.5">
                    {c.items.map((it, i) => (
                      <p key={i} className="text-sm text-white/70">
                        {it.name} <span className="text-dim">({it.color}/{it.size}) ×{it.quantity}</span>
                      </p>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <a
                    href={waLink(c)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => c.status === "Open" && setStatus(c.id, "Contacted")}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wide"
                    style={{ backgroundColor: "#25D366", color: "#0a0a0a", borderRadius: "8px" }}
                  >
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </a>
                  <div className="flex gap-1">
                    <button onClick={() => setStatus(c.id, "Recovered")} className="p-2 hover:bg-white/10 transition-colors" style={{ borderRadius: "8px" }} aria-label="Mark recovered" title="Recovered">
                      <Check className="w-4 h-4 text-green-400" />
                    </button>
                    <button onClick={() => setStatus(c.id, "Dismissed")} className="p-2 hover:bg-white/10 transition-colors" style={{ borderRadius: "8px" }} aria-label="Dismiss" title="Dismiss">
                      <X className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Open: "text-accent",
    Contacted: "text-blue-400",
    Recovered: "text-green-400",
    Dismissed: "text-dim",
  };
  return (
    <span className={`text-xs font-bold uppercase tracking-widest ${colors[status] || "text-dim"}`}>
      {status}
    </span>
  );
}
