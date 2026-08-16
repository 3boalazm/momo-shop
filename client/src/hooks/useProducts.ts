import { useState, useEffect } from "react";
import { fetchProducts } from "@/lib/api";
import { mapApiProduct } from "@/data/mapProduct";
import { PRODUCTS as STATIC_PRODUCTS, type Product } from "@/data/products";

interface UseProductsResult {
  products: Product[];
  loading: boolean;
  /** true if we fell back to bundled static data (API unreachable) */
  usingFallback: boolean;
}

/**
 * Loads products from the API, mapping them to the UI Product shape.
 * Falls back to the bundled static catalogue if the API is unreachable,
 * so the storefront never renders empty.
 */
export function useProducts(): UseProductsResult {
  const [products, setProducts] = useState<Product[]>(STATIC_PRODUCTS);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { products: api } = await fetchProducts();
        if (cancelled) return;
        if (api.length > 0) {
          setProducts(api.map((p) => mapApiProduct(p)));
          setUsingFallback(false);
        } else {
          // API reachable but empty — keep static so the page isn't blank
          setUsingFallback(true);
        }
      } catch {
        if (!cancelled) setUsingFallback(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { products, loading, usingFallback };
}

/** Single product by slug (API with static fallback). */
export function useProduct(slug: string) {
  const [product, setProduct] = useState<Product | undefined>(
    STATIC_PRODUCTS.find((p) => p.slug === slug)
  );
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { products: api } = await fetchProducts();
        if (cancelled) return;
        if (api.length > 0) {
          const mapped = api.map((p) => mapApiProduct(p));
          setProduct(mapped.find((p) => p.slug === slug));
          setRelated(mapped.filter((p) => p.slug !== slug).slice(0, 2));
        } else {
          setRelated(STATIC_PRODUCTS.filter((p) => p.slug !== slug).slice(0, 2));
        }
      } catch {
        if (!cancelled) {
          setRelated(STATIC_PRODUCTS.filter((p) => p.slug !== slug).slice(0, 2));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { product, related, loading };
}
