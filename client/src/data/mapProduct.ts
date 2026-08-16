import type { Product, ProductColor } from "./products";
import type { ApiProduct } from "@/lib/api";

/**
 * Default color swatches by name — the DB stores variants (color+size+stock)
 * but the product card just needs swatch dots. We map known color names to hex;
 * unknown names get a neutral swatch.
 */
const COLOR_HEX: Record<string, string> = {
  black: "#0a0a0a",
  white: "#f5f5f5",
  navy: "#1b2a4a",
  indigo: "#2a3b5c",
  charcoal: "#3a3a3a",
  grey: "#808080",
  gray: "#808080",
  beige: "#d8c9a8",
  olive: "#5b613c",
  brown: "#5a4332",
  red: "#9b1c1c",
  blue: "#1e40af",
};

function colorToSwatch(name: string): ProductColor {
  return { name, hex: COLOR_HEX[name.toLowerCase()] || "#666666" };
}

/**
 * Maps a DB product (ApiProduct) to the frontend Product shape the UI expects.
 * Colors are derived from the variant list if provided, else a single default.
 */
export function mapApiProduct(api: ApiProduct, variantColors?: string[]): Product {
  const colors = (variantColors && variantColors.length > 0)
    ? Array.from(new Set(variantColors)).map(colorToSwatch)
    : [colorToSwatch("Black")];

  // "New" = created within the last 30 days
  const isNew = (() => {
    const created = new Date(api.createdAt).getTime();
    return Date.now() - created < 30 * 24 * 60 * 60 * 1000;
  })();

  return {
    id: api.id,
    name: api.name,
    slug: api.slug,
    category: api.category as Product["category"],
    price: Number(api.basePrice),
    compareAtPrice: api.compareAtPrice ? Number(api.compareAtPrice) : undefined,
    isNew,
    images: api.images,
    colors,
    description: api.description || "",
    sizeGuide: api.sizeGuide || "",
    inStock: api.isActive,
  };
}
