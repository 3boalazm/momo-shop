import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { Check, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { createOrder, createPaymentIntention, validateCoupon, type AppliedCoupon } from "@/lib/api";
import { useCart } from "@/contexts/CartContext";
import { EGYPT_GOVERNORATES } from "@shared/egypt";
import { computeShipping } from "@shared/shipping";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Checkout() {
  const { items: cartItems, clearCart } = useCart();
  const { t } = useLanguage();
  const [step, setStep] = useState<"shipping" | "payment" | "confirmation">("shipping");
  const [orderNumber, setOrderNumber] = useState<string>("");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    governorate: "",
    city: "",
    postalCode: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Live totals from the real cart
  const subtotal = cartItems.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const shipping = subtotal === 0 ? 0 : computeShipping(subtotal, formData.governorate || undefined);
  const discount = coupon ? coupon.discountAmount : 0;
  const total = Math.max(0, subtotal + shipping - discount);

  const handleApplyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setCouponLoading(true);
    try {
      const applied = await validateCoupon(code, subtotal);
      setCoupon(applied);
      toast.success(t("checkout.couponApplied", { code: applied.code, amount: applied.discountAmount.toLocaleString() }));
    } catch (err) {
      setCoupon(null);
      toast.error(err instanceof Error ? err.message : t("checkout.invalidCoupon"));
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCoupon(null);
    setCouponInput("");
  };

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.email || !formData.address || !formData.governorate || !formData.city) {
      toast.error(t("checkout.fillRequiredFields"));
      return;
    }
    setStep("payment");
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      toast.error(t("cart.empty"));
      return;
    }
    setIsSubmitting(true);

    try {
      // Real cart contents from the shared cart context
      const items = cartItems.map((it) => ({
        productName: it.name,
        productSlug: it.productSlug,
        color: it.color,
        size: it.size,
        quantity: it.quantity,
        pricePerUnit: it.price,
      }));

      const result = await createOrder({
        items,
        paymentMethod: "Online",
        shipping: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: `${formData.city}, ${formData.governorate}`,
          governorate: formData.governorate,
          postalCode: formData.postalCode || undefined,
          country: "Egypt",
        },
        couponCode: coupon?.code,
      });

      // Create a Paymob intention and open the hosted checkout.
      // The order stays "Unpaid" until Paymob's webhook confirms payment.
      const { clientSecret, publicKey } = await createPaymentIntention(result.orderId);
      setOrderNumber(result.orderNumber);
      // Redirect to Paymob's unified checkout
      const url = `https://accept.paymob.com/unifiedcheckout/?publicKey=${encodeURIComponent(publicKey)}&clientSecret=${encodeURIComponent(clientSecret)}`;
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("checkout.orderFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentStep = step; // capture before TS narrows below
  // stepValue is the same value but typed as string so TS doesn't narrow it
  // after the confirmation early-return below, allowing progress bar comparisons.
  const stepValue = step as string;

  if (currentStep === "confirmation") {
    return (
      <div style={{ backgroundColor: "var(--momo-bg)" }}>
        <div className="section-padding container max-w-2xl glow-field overflow-hidden">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-accent text-white rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8" />
            </div>
            <h1 className="heading-section mb-4">{t("checkout.orderConfirmed")}</h1>
            <p className="text-lg text-dim mb-2">{t("checkout.thankYou")}</p>
            <p className="text-dim mb-8">
              Your order has been placed and will be delivered soon. We'll contact you at{" "}
              <strong>{formData.phone}</strong> with delivery details.
            </p>

            <div className="glass p-6 mb-8 text-left" style={{ borderRadius: "16px" }}>
              <h2 className="font-bold mb-4">Order Details</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-dim">Order ID:</span>
                  <span className="font-semibold">{orderNumber || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dim">Delivery to:</span>
                  <span className="font-semibold">
                    {formData.address}, {formData.city}, {formData.governorate}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dim">Estimated Delivery:</span>
                  <span className="font-semibold">3-5 business days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dim">Payment Method:</span>
                  <span className="font-semibold">Paid Online</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/track">
                <Button className="btn-primary">{t("checkout.trackOrder")}</Button>
              </Link>
              <Link href="/">
                <Button variant="outline">{t("checkout.backHome")}</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "var(--momo-bg)" }}>
      <div className="section-padding container max-w-2xl glow-field overflow-hidden">
        <h1 className="heading-section mb-8">{t("checkout.title")}</h1>

        {/* Progress Indicator */}
        <div className="flex gap-4 mb-12">
          <div
            className={`flex-1 h-1 rounded-full ${
              stepValue !== "shipping" ? "bg-accent" : "bg-gray-200"
            }`}
          ></div>
          <div
            className={`flex-1 h-1 rounded-full ${
              stepValue === "payment" || stepValue === "confirmation"
                ? "bg-accent"
                : "bg-gray-200"
            }`}
          ></div>
          <div
            className={`flex-1 h-1 rounded-full ${
              stepValue === "confirmation" ? "bg-accent" : "bg-gray-200"
            }`}
          ></div>
        </div>

        {step === "shipping" && (
          <form onSubmit={handleShippingSubmit} className="space-y-6">
            <div>
              <h2 className="heading-subsection mb-6">{t("checkout.shippingAddress")}</h2>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">{t("checkout.firstName")} *</label>
                  <Input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Ahmed"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">{t("checkout.lastName")} *</label>
                  <Input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Hassan"
                    required
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">{t("checkout.email")} *</label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="ahmed@example.com"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">{t("checkout.phone")} *</label>
                <Input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+20 (123) 456-7890"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">{t("checkout.address")} *</label>
                <Input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="123 Main Street"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">{t("checkout.governorate")} *</label>
                  <select
                    name="governorate"
                    value={formData.governorate}
                    onChange={handleChange}
                    required
                    className="w-full bg-transparent border border-momo text-[color:var(--momo-text)] px-3 py-2.5 focus:outline-none focus:border-accent"
                    style={{ borderRadius: "8px" }}
                  >
                    <option value="" style={{ background: "var(--momo-surface)", color: "var(--momo-text)" }}>{t("checkout.selectGov")}</option>
                    {EGYPT_GOVERNORATES.map((g) => (
                      <option key={g.en} value={g.en} style={{ background: "var(--momo-surface)", color: "var(--momo-text)" }}>
                        {g.en} — {g.ar}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">{t("checkout.areaCity")} *</label>
                  <Input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="Nasr City, Maadi…"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">{t("checkout.postalCode")}</label>
                  <Input
                    type="text"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleChange}
                    placeholder="12345"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full btn-primary">
                {t("checkout.continuePayment")}
              </Button>
            </div>
          </form>
        )}

        {step === "payment" && (
          <form onSubmit={handlePaymentSubmit} className="space-y-6">
            <div>
              <h2 className="heading-subsection mb-6">{t("checkout.paymentMethod")}</h2>

              {/* Online payment — the only available method */}
              <div className="space-y-3 mb-6">
                <div className="w-full text-left p-5 glass-accent" style={{ borderRadius: "14px" }}>
                  <div className="flex items-center gap-4">
                    <CreditCard className="w-5 h-5 text-accent" />
                    <div>
                      <h3 className="font-bold">{t("checkout.online")}</h3>
                      <p className="text-dim text-sm">{t("checkout.onlineDesc")}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass p-6 mb-6" style={{ borderRadius: "16px" }}>
                <h3 className="font-bold mb-4">{t("checkout.orderSummary")}</h3>

                {/* Coupon field */}
                <div className="mb-4 pb-4 border-b border-momo">
                  {coupon ? (
                    <div className="flex items-center justify-between">
                      <span className="text-sm">
                        <span className="text-accent font-bold">{coupon.code}</span> {t("checkout.couponAppliedLabel")}
                      </span>
                      <button onClick={handleRemoveCoupon} className="text-dim hover:text-red-400 text-xs underline">
                        {t("checkout.remove")}
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        placeholder={t("checkout.discountCode")}
                        className="flex-1 bg-transparent border border-momo text-[color:var(--momo-text)] px-3 py-2 text-sm placeholder:text-dim focus:outline-none focus:border-accent"
                        style={{ borderRadius: "8px" }}
                      />
                      <button
                        onClick={handleApplyCoupon}
                        disabled={couponLoading || !couponInput.trim()}
                        className="px-4 py-2 text-xs font-bold uppercase tracking-wide bg-white/10 hover:bg-white/20 text-white disabled:opacity-50 transition-colors"
                        style={{ borderRadius: "8px" }}
                      >
                        {couponLoading ? "..." : t("checkout.apply")}
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2 mb-4 pb-4 border-b border-momo">
                  <div className="flex justify-between">
                    <span className="text-dim">{t("cart.subtotal")}</span>
                    <span>{subtotal.toLocaleString()} LE</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dim">{t("cart.shipping")}</span>
                    <span>
                      {!formData.governorate
                        ? <span className="text-dim text-sm">{t("checkout.selectGovFirst")}</span>
                        : shipping === 0
                          ? t("cart.free")
                          : `${shipping} LE`}
                    </span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-accent">
                      <span>{t("checkout.discount")}</span>
                      <span>−{discount.toLocaleString()} LE</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">{t("cart.total")}</span>
                  <span className="font-bold text-2xl text-accent">{total.toLocaleString()} LE</span>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-primary"
              >
                {isSubmitting ? "..." : t("checkout.continuePayment")}
              </Button>

              <Button
                type="button"
                onClick={() => setStep("shipping")}
                variant="outline"
                className="w-full"
              >
                {t("checkout.back")}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
