import { ASSETS } from "@/assets";

export type ProductColor = {
  name: string;
  hex: string;
};

export type Product = {
  id: number;
  name: string;
  slug: string;
  category: "tees" | "denim" | "hoodies";
  price: number;
  compareAtPrice?: number;
  isNew?: boolean;
  images: string[];
  colors: ProductColor[];
  description: string;
  sizeGuide: string;
  inStock: boolean;
};

export const PRODUCTS: Product[] = [
  {
    id: 1,
    name: "Oversized T-Shirt",
    slug: "oversized-tee",
    category: "tees",
    price: 650,
    isNew: true,
    images: [ASSETS.products.tee.compressed, ASSETS.products.tee.original],
    colors: [
      { name: "Black", hex: "#0a0a0a" },
      { name: "White", hex: "#f5f5f5" },
      { name: "Navy", hex: "#1b2a4a" },
    ],
    description:
      "Premium oversized t-shirt crafted from 100% organic cotton. Designed for comfort and street presence, this piece is a streetwear essential.",
    sizeGuide: "Designed to fit oversized. For a standard fit, size down one size.",
    inStock: true,
  },
  {
    id: 2,
    name: "Wide-Leg Denim",
    slug: "wide-leg-denim",
    category: "denim",
    price: 1100,
    compareAtPrice: 1300,
    images: [ASSETS.products.denim.compressed, ASSETS.products.denim.original],
    colors: [
      { name: "Indigo", hex: "#2a3b5c" },
      { name: "Black", hex: "#0a0a0a" },
    ],
    description:
      "Structured wide-leg denim with premium Japanese selvedge. A timeless piece that defines modern streetwear.",
    sizeGuide: "True to size. Designed for a relaxed, wide-leg fit.",
    inStock: true,
  },
  {
    id: 3,
    name: "Heavyweight Hoodie",
    slug: "heavyweight-hoodie",
    category: "hoodies",
    price: 1200,
    isNew: true,
    images: [ASSETS.products.hoodie.compressed, ASSETS.products.hoodie.original],
    colors: [
      { name: "Black", hex: "#0a0a0a" },
      { name: "Charcoal", hex: "#3a3a3a" },
    ],
    description:
      "Heavyweight hoodie constructed from premium French terry. Built for substance, presence, and pure comfort.",
    sizeGuide: "Designed for a comfortable, slightly oversized fit.",
    inStock: true,
  },
];

export function getProductBySlug(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function getRelatedProducts(slug: string, limit = 2): Product[] {
  return PRODUCTS.filter((p) => p.slug !== slug).slice(0, limit);
}
