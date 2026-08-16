import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { fetchReviews, submitReview, type Review } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";

function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={n <= Math.round(value) ? "text-accent fill-accent" : "text-dim"}
          style={{ width: size, height: size }}
        />
      ))}
    </div>
  );
}

export default function ProductReviews({ productId }: { productId: number }) {
  const { t } = useLanguage();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [average, setAverage] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // form
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    fetchReviews(productId)
      .then((r) => {
        setReviews(r.reviews);
        setAverage(r.average);
        setCount(r.count);
      })
      .catch(() => {/* product may have no reviews / API offline — silent */})
      .finally(() => setLoading(false));
  };

  useEffect(load, [productId]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error(t("reviews.nameRequired"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitReview({
        productId,
        authorName: name.trim(),
        rating,
        title: title.trim() || undefined,
        body: body.trim() || undefined,
      });
      toast.success(res.message || t("reviews.submitted"));
      setShowForm(false);
      setName(""); setTitle(""); setBody(""); setRating(5);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("reviews.submitFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="section-padding container border-t border-momo">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="heading-section mb-2">{t("reviews.title")}</h2>
          {count > 0 ? (
            <div className="flex items-center gap-3">
              <Stars value={average} size={20} />
              <span className="text-dim text-sm">{average.toFixed(1)} · {count} {t(count !== 1 ? "reviews.plural" : "reviews.singular")}</span>
            </div>
          ) : (
            <p className="text-dim text-sm">{t("reviews.noReviews")}</p>
          )}
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="btn-outline-light self-start">
          {showForm ? t("reviews.cancel") : t("reviews.writeReview")}
        </button>
      </div>

      {/* Submission form */}
      {showForm && (
        <div className="glass p-6 mb-8" style={{ borderRadius: "16px" }}>
          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-dim">{t("reviews.yourRating")}</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setRating(n)} aria-label={`${n} stars`}>
                    <Star className={n <= rating ? "text-accent fill-accent" : "text-dim"} style={{ width: 28, height: 28 }} />
                  </button>
                ))}
              </div>
            </div>
            <Input label={t("reviews.name")} value={name} onChange={setName} />
            <Input label={t("reviews.titleOptional")} value={title} onChange={setTitle} />
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-dim">{t("reviews.reviewOptional")}</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                className="w-full bg-transparent border border-momo text-white px-3 py-2 placeholder:text-dim focus:outline-none focus:border-accent"
              />
            </div>
            <button onClick={handleSubmit} disabled={submitting} className="btn-primary disabled:opacity-60">
              {submitting ? t("reviews.submitting") : t("reviews.submitReview")}
            </button>
            <p className="text-dim text-xs">{t("reviews.publishNote")}</p>
          </div>
        </div>
      )}

      {/* Review list */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : reviews.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reviews.map((r) => (
            <div key={r.id} className="glass p-5" style={{ borderRadius: "14px" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold" style={{ fontFamily: "var(--font-display)" }}>{r.authorName}</span>
                <Stars value={r.rating} />
              </div>
              {r.title && <p className="font-semibold mb-1">{r.title}</p>}
              {r.body && <p className="text-dim text-sm">{r.body}</p>}
              <p className="text-dim text-xs mt-3">{new Date(r.createdAt).toLocaleDateString("en-EG")}</p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-dim">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent border border-momo text-white px-3 py-2 placeholder:text-dim focus:outline-none focus:border-accent"
      />
    </div>
  );
}
