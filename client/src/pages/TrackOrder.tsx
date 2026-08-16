import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, Check, Truck, Home as HomeIcon, X, Search } from "lucide-react";
import { toast } from "sonner";
import { trackOrder, type TrackedOrder } from "@/lib/api";
import { CURRENCY_SYMBOL } from "@shared/const";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TranslationKey } from "@/i18n/translations";

const PAYMENT_STATUS_KEY: Record<string, TranslationKey> = {
  Unpaid: "track.statusUnpaid",
  Paid: "track.statusPaid",
  Refunded: "track.statusRefunded",
};

const STEPS = [
  { key: "Pending", tkey: "track.placed", icon: Check },
  { key: "Confirmed", tkey: "track.confirmed", icon: Package },
  { key: "Shipped", tkey: "track.shipped", icon: Truck },
  { key: "Delivered", tkey: "track.delivered", icon: HomeIcon },
] as const;

function stepIndex(status: string) {
  const i = STEPS.findIndex((s) => s.key === status);
  return i; // -1 for Cancelled
}

export default function TrackOrder() {
  usePageTitle("Track Your Order", "Check the status of your OLTRÈ Collective order.");
  const { t } = useLanguage();
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackedOrder | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim() || !phone.trim()) {
      toast.error(t("track.missingFields"));
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const data = await trackOrder(orderNumber.trim(), phone.trim());
      setResult(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("track.notFound"));
    } finally {
      setLoading(false);
    }
  };

  const cancelled = result?.order.status === "Cancelled";
  const activeStep = result ? stepIndex(result.order.status) : -1;

  return (
    <div style={{ backgroundColor: "var(--momo-bg)" }} className="min-h-screen">
      <div className="section-padding container max-w-2xl">
        <span className="eyebrow block mb-2">{t("track.eyebrow")}</span>
        <h1 className="heading-section mb-8">{t("track.title")}</h1>

        <form onSubmit={handleTrack} className="glass p-6 space-y-4 mb-8" style={{ borderRadius: "16px" }}>
          <div>
            <label className="block text-sm font-semibold mb-2">{t("track.orderNumber")}</label>
            <Input
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
              placeholder="OLTRE-20260101-XXXXXX"
              className="bg-transparent border-momo text-[color:var(--momo-text)] placeholder:text-dim"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">{t("track.phone")}</label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01xxxxxxxxx"
              className="bg-transparent border-momo text-[color:var(--momo-text)] placeholder:text-dim"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full btn-primary inline-flex items-center justify-center gap-2">
            <Search className="w-4 h-4" /> {loading ? t("track.searching") : t("track.button")}
          </Button>
        </form>

        {result && (
          <div className="glass p-6" style={{ borderRadius: "16px" }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="font-bold text-lg" style={{ fontFamily: "var(--font-display)" }}>{result.order.orderNumber}</p>
                <p className="text-dim text-sm">
                  {result.order.shippingFirstName} · {result.order.shippingCity}
                </p>
              </div>
              <span className="text-accent font-bold">{Number(result.order.total).toLocaleString()} {CURRENCY_SYMBOL}</span>
            </div>

            {cancelled ? (
              <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30" style={{ borderRadius: "12px" }}>
                <X className="w-5 h-5 text-red-500" />
                <span className="font-semibold text-red-500">{t("track.cancelled")}</span>
              </div>
            ) : (
              <div className="relative flex justify-between mb-2">
                {STEPS.map((s, i) => {
                  const done = i <= activeStep;
                  const Icon = s.icon;
                  return (
                    <div key={s.key} className="flex flex-col items-center flex-1 relative z-10">
                      <div
                        className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
                          done ? "bg-accent text-white" : "surface-2 text-dim"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className={`text-xs mt-2 text-center ${done ? "text-[color:var(--momo-text)] font-semibold" : "text-dim"}`}>
                        {t(s.tkey)}
                      </span>
                      {i < STEPS.length - 1 && (
                        <div
                          className={`absolute top-[22px] left-1/2 w-full h-0.5 -z-0 ${i < activeStep ? "bg-accent" : "bg-white/10"}`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Payment */}
            <div className="mt-6 pt-4 border-t border-momo flex items-center justify-between text-sm">
              <span className="text-dim">{t("track.payment")}</span>
              <span className="font-semibold">
                {result.order.paymentMethod === "Online" ? t("track.payOnline") : result.order.paymentMethod} ·{" "}
                {PAYMENT_STATUS_KEY[result.order.paymentStatus] ? t(PAYMENT_STATUS_KEY[result.order.paymentStatus]) : result.order.paymentStatus}
              </span>
            </div>

            {/* Items */}
            <div className="mt-4 space-y-2">
              {result.items.map((it, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{it.productName} <span className="text-dim">({it.color}/{it.size})</span></span>
                  <span className="text-dim">×{it.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
