import { usePageTitle } from "@/hooks/usePageTitle";
import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { PRODUCT_CATEGORIES } from "@shared/const";
import ProductCard from "@/components/ProductCard";
import Reveal from "@/components/motion/Reveal";
import { useProducts } from "@/hooks/useProducts";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TranslationKey } from "@/i18n/translations";

const CAT_KEY: Record<string, TranslationKey> = {
  tees: "cat.tees",
  denim: "cat.denim",
  hoodies: "cat.hoodies",
};

export default function Shop() {
  usePageTitle("Shop All", "Browse the full OLTRÈ Collective streetwear drop — tees, denim, and hoodies. Secure online payment, shipped across Egypt.");
  const { products, loading } = useProducts();
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "price-asc" | "price-desc">("newest");

  // Pick up ?category=... from the URL (e.g. from the navbar mega menu)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get("category");
    if (cat) setSelectedCategory(cat);
  }, []);

  const filteredProducts = useMemo(() => {
    let filtered = products;

    if (selectedCategory && selectedCategory !== "all") {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }
    if (searchQuery) {
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (sortBy === "price-asc") {
      filtered = [...filtered].sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-desc") {
      filtered = [...filtered].sort((a, b) => b.price - a.price);
    }
    return filtered;
  }, [products, selectedCategory, searchQuery, sortBy]);

  return (
    <div style={{ backgroundColor: "var(--momo-bg)" }} className="min-h-screen">
      {/* Header */}
      <section className="section-padding-sm border-b border-momo">
        <div className="container">
          <span className="eyebrow mb-2 block">{t("shop.eyebrow")}</span>
          <h1 className="heading-section">{t("shop.title")}</h1>
        </div>
      </section>

      {/* Filters */}
      <section className="border-b border-momo sticky top-16 z-30 glass-nav">
        <div className="container py-5 space-y-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dim" />
            <Input
              placeholder={t("shop.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-transparent border-momo text-[color:var(--momo-text)] placeholder:text-dim"
              style={{ borderRadius: 0 }}
            />
          </div>

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex flex-wrap gap-2">
              <FilterChip active={selectedCategory === null} onClick={() => setSelectedCategory(null)}>
                {t("shop.all")}
              </FilterChip>
              {Object.entries(PRODUCT_CATEGORIES).map(([key, label]) => (
                <FilterChip key={key} active={selectedCategory === key} onClick={() => setSelectedCategory(key)}>
                  {CAT_KEY[key] ? t(CAT_KEY[key]) : label}
                </FilterChip>
              ))}
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="bg-transparent border border-momo text-[color:var(--momo-text)] text-sm px-3 py-2 focus:outline-none focus:border-accent"
              style={{ borderRadius: 0 }}
            >
              <option value="newest" style={{ color: "#000" }}>{t("shop.newest")}</option>
              <option value="price-asc" style={{ color: "#000" }}>{t("shop.priceLow")}</option>
              <option value="price-desc" style={{ color: "#000" }}>{t("shop.priceHigh")}</option>
            </select>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="section-padding container">
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="surface-2 w-full" style={{ aspectRatio: "3/4", borderRadius: "12px" }} />
                <div className="surface-2 h-4 w-2/3 mt-4" style={{ borderRadius: "4px" }} />
                <div className="surface-2 h-4 w-1/3 mt-2" style={{ borderRadius: "4px" }} />
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-lg text-dim">{t("shop.noProducts")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredProducts.map((product, i) => (
              <Reveal key={product.id} delay={(i % 3) * 0.06}>
                <ProductCard product={product} />
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
        active ? "bg-accent text-white" : "border border-momo text-[color:var(--momo-text)] hover:border-accent"
      }`}
      style={{ fontFamily: "var(--font-display)", borderRadius: 0 }}
    >
      {children}
    </button>
  );
}
