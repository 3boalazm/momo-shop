/**
 * Seed script — inserts OLTRÈ Collective's core products + variants into Neon.
 *
 * Usage:
 *   pnpm db:seed          (reads DATABASE_URL from .env)
 *
 * Idempotent: skips products whose slug already exists.
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import * as schema from "../drizzle/schema";

const CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663767986939/SipvdNwWkdPZPvtzwSvRNT";

type SeedVariant = { color: string; sizes: { size: "XS" | "S" | "M" | "L" | "XL" | "XXL"; stock: number }[] };
type SeedProduct = {
  name: string;
  slug: string;
  description: string;
  category: "tees" | "denim" | "hoodies";
  basePrice: string;
  compareAtPrice?: string;
  images: string[];
  sizeGuide: string;
  variants: SeedVariant[];
};

const ALL_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;
const stockEach = (n: number) => ALL_SIZES.map((size) => ({ size, stock: n }));

const PRODUCTS: SeedProduct[] = [
  {
    name: "Oversized T-Shirt",
    slug: "oversized-tee",
    description:
      "Premium oversized t-shirt crafted from 100% organic cotton. Designed for comfort and street presence.",
    category: "tees",
    basePrice: "650.00",
    images: [`${CDN}/product-tee-b6uhAxsz2QRty7rmhTaLxT.webp`, `${CDN}/product-tee-oFaQNAb9QPv6jirFzJkYse.png`],
    sizeGuide: "Designed to fit oversized. For a standard fit, size down one size.",
    variants: [
      { color: "Black", sizes: stockEach(20) },
      { color: "White", sizes: stockEach(15) },
      { color: "Navy", sizes: stockEach(10) },
    ],
  },
  {
    name: "Wide-Leg Denim",
    slug: "wide-leg-denim",
    description:
      "Structured wide-leg denim with premium Japanese selvedge. A timeless piece that defines modern streetwear.",
    category: "denim",
    basePrice: "1100.00",
    compareAtPrice: "1300.00",
    images: [`${CDN}/product-denim-f2JhV7QLZv9ivNm9UEWNqs.webp`, `${CDN}/product-denim-WqoVUfQ4UtBfovwd6V3tRz.png`],
    sizeGuide: "True to size. Designed for a relaxed, wide-leg fit.",
    variants: [
      { color: "Indigo", sizes: stockEach(12) },
      { color: "Black", sizes: stockEach(8) },
    ],
  },
  {
    name: "Heavyweight Hoodie",
    slug: "heavyweight-hoodie",
    description:
      "Heavyweight hoodie constructed from premium French terry. Built for substance, presence, and pure comfort.",
    category: "hoodies",
    basePrice: "1200.00",
    images: [`${CDN}/product-hoodie-8dmnhtum3PLcJt8nF9h4db.webp`, `${CDN}/product-hoodie-NTXHpJKWnjxxy9SNMZAH8U.png`],
    sizeGuide: "Designed for a comfortable, slightly oversized fit.",
    variants: [
      { color: "Black", sizes: stockEach(10) },
      { color: "Charcoal", sizes: stockEach(7) },
    ],
  },
];

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }
  const db = drizzle(neon(url), { schema });

  for (const p of PRODUCTS) {
    // Skip if slug already exists (idempotent)
    const existing = await db
      .select({ id: schema.products.id })
      .from(schema.products)
      .where(eq(schema.products.slug, p.slug));
    if (existing.length > 0) {
      console.log(`• skip "${p.name}" (already exists)`);
      continue;
    }

    const [product] = await db
      .insert(schema.products)
      .values({
        name: p.name,
        slug: p.slug,
        description: p.description,
        category: p.category,
        basePrice: p.basePrice,
        compareAtPrice: p.compareAtPrice,
        images: p.images,
        sizeGuide: p.sizeGuide,
        isActive: true,
      })
      .returning();

    // Insert variants
    const variantRows = p.variants.flatMap((v) =>
      v.sizes.map((s) => ({
        productId: product.id,
        color: v.color,
        size: s.size,
        stock: s.stock,
        sku: `${p.slug}-${slugify(v.color)}-${s.size}`.toUpperCase(),
      }))
    );
    await db.insert(schema.productVariants).values(variantRows);

    console.log(`✓ seeded "${p.name}" with ${variantRows.length} variants`);
  }

  console.log("\nSeed complete.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
