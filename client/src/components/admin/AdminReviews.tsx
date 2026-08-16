import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Star, Check, X, Trash2, RefreshCw } from "lucide-react";
import { fetchAdminReviews, moderateReview, deleteReview, type AdminReview } from "@/lib/api";

const FILTERS = ["Pending", "Approved", "Rejected", "All"];

export default function AdminReviews({ token }: { token: string }) {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [filter, setFilter] = useState("Pending");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { reviews } = await fetchAdminReviews(token, filter);
      setReviews(reviews);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, [token, filter]);

  useEffect(() => { load(); }, [load]);

  const act = async (id: number, status: "Approved" | "Rejected") => {
    try {
      await moderateReview(token, id, status);
      toast.success(`Review ${status.toLowerCase()}`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this review permanently?")) return;
    try {
      await deleteReview(token, id);
      toast.success("Review deleted");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
                filter === f ? "bg-accent text-white" : "glass-chip text-white"
              }`}
              style={{ fontFamily: "var(--font-display)", borderRadius: "8px" }}
            >
              {f}
            </button>
          ))}
        </div>
        <button onClick={load} className="glass-chip p-2.5 text-white" style={{ borderRadius: "10px" }} aria-label="Refresh">
          <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {reviews.length === 0 ? (
        <div className="glass p-12 text-center" style={{ borderRadius: "16px" }}>
          <p className="text-dim">No {filter !== "All" ? filter.toLowerCase() : ""} reviews.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="glass p-5" style={{ borderRadius: "14px" }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <span className="font-bold" style={{ fontFamily: "var(--font-display)" }}>{r.authorName}</span>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map((n) => (
                        <Star key={n} className={n <= r.rating ? "text-accent fill-accent" : "text-dim"} style={{ width: 14, height: 14 }} />
                      ))}
                    </div>
                    <StatusPill status={r.status} />
                  </div>
                  <p className="text-dim text-xs mb-2">
                    {r.productName || `Product #${r.productId}`} · {new Date(r.createdAt).toLocaleDateString("en-EG")}
                  </p>
                  {r.title && <p className="font-semibold text-sm">{r.title}</p>}
                  {r.body && <p className="text-dim text-sm mt-1">{r.body}</p>}
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {r.status !== "Approved" && (
                    <button onClick={() => act(r.id, "Approved")} className="p-2 bg-accent/20 hover:bg-accent/30 transition-colors" style={{ borderRadius: "8px" }} aria-label="Approve">
                      <Check className="w-4 h-4 text-accent" />
                    </button>
                  )}
                  {r.status !== "Rejected" && (
                    <button onClick={() => act(r.id, "Rejected")} className="p-2 hover:bg-white/10 transition-colors" style={{ borderRadius: "8px" }} aria-label="Reject">
                      <X className="w-4 h-4 text-white" />
                    </button>
                  )}
                  <button onClick={() => remove(r.id)} className="p-2 hover:bg-white/10 transition-colors" style={{ borderRadius: "8px" }} aria-label="Delete">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
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
  const color =
    status === "Approved" ? "text-accent" : status === "Rejected" ? "text-red-400" : "text-yellow-500";
  return <span className={`text-xs font-bold uppercase tracking-widest ${color}`}>{status}</span>;
}
