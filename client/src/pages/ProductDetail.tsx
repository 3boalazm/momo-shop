import { useState } from "react";
import { Heart, Minus, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { SIZES, CURRENCY_SYMBOL } from "@shared/const";
import ProductCard from "@/components/ProductCard";
import ProductReviews from "@/components/ProductReviews";
import SizeGuide from "@/components/SizeGuide";
import { useCart } from "@/contexts/CartContext";
import { useProduct } from "@/hooks/useProducts";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ProductDetail({ params }: { params: { slug: string } }) {
  const slug = params?.slug || "oversized-tee";
  const { product, related, loading } = useProduct(slug);
  const { t } = useLanguage();
  usePageTitle(
    product ? product.name : "Product",
    product ? `${product.name} — ${product.description?.slice(0, 120) || "Premium streetwear from OLTRÈ Collective."}` : undefined
  );
  const { addItem } = useCart();

  const [selectedColor, setSelectedColor] = useState(product?.colors[0]?.name || "");
  const [selectedSize, setSelectedSize] = useState<string>(SIZES[2]);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (loading && !product) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" style={{ backgroundColor: "var(--momo-bg)" }}>
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" style={{ backgroundColor: "var(--momo-bg)" }}>
        <p className="text-lg text-dim">{t("product.notFound")}</p>
      </div>
    );
  }

  const onSale = typeof product.compareAtPrice === "number";

  const handleAddToCart = () => {
    addItem({
      productSlug: product.slug,
      name: product.name,
      price: product.price,
      image: product.images[0],
      color: selectedColor,
      size: selectedSize,
      quantity,
    });
    toast.success(t("product.addedToCart", { quantity, name: product.name, size: selectedSize }));
  };

  const handleToggleWishlist = () => {
    setIsWishlisted(!isWishlisted);
    toast.success(isWishlisted ? t("product.removedFromWishlist") : t("product.addedToWishlist"));
  };

  return (
    <div style={{ backgroundColor: "var(--momo-bg)" }}>
      <div className="section-padding container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
          {/* Gallery */}
          <div className="space-y-3">
            <div
              className="relative surface overflow-hidden cursor-zoom-in group"
              style={{ aspectRatio: "3/4" }}
              onMouseMove={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                const x = ((e.clientX - r.left) / r.width) * 100;
                const y = ((e.clientY - r.top) / r.height) * 100;
                const img = e.currentTarget.querySelector("img");
                if (img) {
                  img.style.transformOrigin = `${x}% ${y}%`;
                }
              }}
            >
              {onSale && (
                <span className="badge-sale">
                  {t("product.saveAmount", { amount: product.compareAtPrice! - product.price, currency: CURRENCY_SYMBOL })}
                </span>
              )}
              <img
                src={product.images[currentImageIndex]}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[2]"
                fetchPriority="high"
              />
            </div>
            <div className="flex gap-3">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`w-20 h-24 overflow-hidden border-2 transition-colors ${
                    currentImageIndex === idx ? "border-accent" : "border-momo"
                  }`}
                  style={{ borderRadius: 0 }}
                >
                  <img src={img} alt={`View ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="space-y-8">
            <div>
              <span className="eyebrow mb-2 block">
                {product.category === "tees" ? t("cat.tees") : product.category === "denim" ? t("cat.denim") : t("cat.hoodies")}
              </span>
              <h1 className="heading-section mb-4">{product.name}</h1>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl font-bold text-accent" style={{ fontFamily: "var(--font-display)" }}>
                  {product.price} {CURRENCY_SYMBOL}
                </span>
                {onSale && (
                  <span className="text-xl text-dim line-through">
                    {product.compareAtPrice} {CURRENCY_SYMBOL}
                  </span>
                )}
              </div>
              <p className="text-lg leading-relaxed text-[color:var(--momo-text)] opacity-80">{product.description}</p>
            </div>

            {/* Color */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-3 text-dim">
                {t("product.color")} — <span className="text-[color:var(--momo-text)]">{selectedColor}</span>
              </label>
              <div className="flex gap-3">
                {product.colors.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setSelectedColor(color.name)}
                    className={`swatch ${selectedColor === color.name ? "swatch--active" : ""}`}
                    style={{ backgroundColor: color.hex, width: "2rem", height: "2rem" }}
                    title={color.name}
                    aria-label={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Size */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-3 text-dim">{t("product.size")}</label>
              <div className="grid grid-cols-6 gap-2 mb-3">
                {SIZES.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`py-3 text-sm font-bold border-2 transition-all ${
                      selectedSize === size
                        ? "border-accent bg-accent text-white"
                        : "border-momo text-[color:var(--momo-text)] hover:border-accent"
                    }`}
                    style={{ fontFamily: "var(--font-display)", borderRadius: 0 }}
                  >
                    {size}
                  </button>
                ))}
              </div>
              {product.sizeGuide && <p className="text-sm text-dim mb-3">{product.sizeGuide}</p>}
              <SizeGuide note={product.sizeGuide} />
            </div>

            {/* Quantity + Add */}
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-momo" style={{ borderRadius: 0 }}>
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-3 text-[color:var(--momo-text)] hover:text-accent">
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="px-6 font-bold text-[color:var(--momo-text)]">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} className="p-3 text-[color:var(--momo-text)] hover:text-accent">
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <button onClick={handleAddToCart} className="btn-primary flex-1 inline-flex items-center justify-center gap-2">
                  <Check className="w-5 h-5" /> {t("product.addToCart")}
                </button>
              </div>
              <button onClick={handleToggleWishlist} className="btn-outline-light w-full inline-flex items-center justify-center gap-2">
                <Heart className={`w-5 h-5 ${isWishlisted ? "fill-current" : ""}`} />
                {isWishlisted ? t("product.savedToWishlist") : t("product.addToWishlist")}
              </button>
            </div>

            {/* Stock */}
            <div className="glass p-4" style={{ borderRadius: "12px" }}>
              <p className="text-sm">
                {product.inStock ? (
                  <span className="text-accent font-bold uppercase tracking-wide">● {t("product.inStock")}</span>
                ) : (
                  <span className="text-dim font-bold uppercase tracking-wide">{t("product.outOfStock")}</span>
                )}
              </p>
            </div>

            {/* Materials & Care + Shipping (accordions) */}
            <div className="space-y-2">
              <details className="glass p-4 group" style={{ borderRadius: "12px" }}>
                <summary className="flex items-center justify-between cursor-pointer font-bold text-sm uppercase tracking-wide list-none">
                  {t("product.materials")}
                  <Plus className="w-4 h-4 group-open:rotate-45 transition-transform" />
                </summary>
                <div className="mt-3 text-sm text-[color:var(--momo-text)] opacity-80 space-y-1.5">
                  <p>• {t("product.careFabric")}</p>
                  <p>• {t("product.careWash")}</p>
                  <p>• {t("product.careBleach")}</p>
                  <p>• {t("product.careIron")}</p>
                </div>
              </details>
              <details className="glass p-4 group" style={{ borderRadius: "12px" }}>
                <summary className="flex items-center justify-between cursor-pointer font-bold text-sm uppercase tracking-wide list-none">
                  {t("product.shipping")}
                  <Plus className="w-4 h-4 group-open:rotate-45 transition-transform" />
                </summary>
                <div className="mt-3 text-sm text-[color:var(--momo-text)] opacity-80 space-y-1.5">
                  <p>• {t("product.shipPayment")}</p>
                  <p>• {t("product.shipFree", { currency: CURRENCY_SYMBOL })}</p>
                  <p>• {t("product.shipDelivery")}</p>
                  <p>• {t("product.shipExchange")}</p>
                </div>
              </details>
            </div>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-20 pt-12 border-t border-momo">
            <h2 className="heading-subsection mb-8">{t("product.related")}</h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Reviews */}
      <ProductReviews productId={product.id} />
    </div>
  );
}
