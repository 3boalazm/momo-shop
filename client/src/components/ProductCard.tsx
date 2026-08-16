import { Link } from "wouter";
import { toast } from "sonner";
import type { Product } from "@/data/products";
import { CURRENCY_SYMBOL } from "@shared/const";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ProductCard({ product }: { product: Product }) {
  const { t } = useLanguage();
  const onSale = typeof product.compareAtPrice === "number";
  const saved = onSale ? product.compareAtPrice! - product.price : 0;
  const { addItem } = useCart();

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Quick-add uses the first color + default size M
    addItem({
      productSlug: product.slug,
      name: product.name,
      price: product.price,
      image: product.images[0],
      color: product.colors[0]?.name || "Default",
      size: "M",
    });
    toast.success(t("product.quickAdded", { name: product.name }));
  };

  return (
    <Link href={`/product/${product.slug}`}>
      <div className="product-card group glass glass-hover overflow-hidden" style={{ borderRadius: "14px" }}>
        <div className="product-card__media" style={{ borderRadius: 0 }}>
          {onSale ? (
            <span className="badge-sale">{t("product.saveAmount", { amount: saved, currency: CURRENCY_SYMBOL })}</span>
          ) : product.isNew ? (
            <span className="badge-new">{t("product.new")}</span>
          ) : null}

          <img
            src={product.images[0]}
            alt={product.name}
            className="product-card__img product-card__img--primary"
            loading="lazy"
            decoding="async"
          />
          {product.images[1] && (
            <img
              src={product.images[1]}
              alt={`${product.name} alternate view`}
              className="product-card__img product-card__img--secondary"
              loading="lazy"
              decoding="async"
            />
          )}

          <button className="quick-add" onClick={handleQuickAdd}>
            {t("product.quickAdd")}
          </button>
        </div>

        <div className="p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide mb-1.5"
            style={{ fontFamily: "var(--font-display)" }}>
            {product.name}
          </h3>

          <div className="flex items-center gap-2 mb-3">
            <span className="text-accent font-bold">
              {product.price} {CURRENCY_SYMBOL}
            </span>
            {onSale && (
              <span className="text-dim line-through text-sm">
                {product.compareAtPrice} {CURRENCY_SYMBOL}
              </span>
            )}
          </div>

          {/* Color swatches */}
          <div className="flex items-center gap-1.5">
            {product.colors.map((c) => (
              <span
                key={c.name}
                className="swatch"
                style={{ backgroundColor: c.hex }}
                title={c.name}
                aria-label={c.name}
              />
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
