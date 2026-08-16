import type { VercelRequest, VercelResponse } from "@vercel/node";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "../../server-lib/db.js";
import { applyCors, requireAdmin, requireManager } from "../../server-lib/utils.js";
import { productInputSchema, productUpdateSchema } from "../../shared/productTypes.js";

/**
 * /api/products            → list (GET) / create (POST)
 * /api/products?id=N       → single (GET) / update (PATCH) / delete (DELETE)
 *
 * Merged into one function to stay within Vercel's Hobby function limit.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  const db = getDb();
  const hasId = req.query.id !== undefined;
  const id = Number(req.query.id);

  // ---- Inventory routes: /api/products?variants=N ----
  if (req.query.variants !== undefined) {
    const productId = Number(req.query.variants);
    if (!Number.isInteger(productId)) {
      res.status(400).json({ error: "Invalid product id" });
      return;
    }
    if (req.method === "GET") {
      try {
        const variants = await db
          .select()
          .from(schema.productVariants)
          .where(eq(schema.productVariants.productId, productId));
        res.status(200).json({ variants });
      } catch (err) {
        console.error("[products variants] failed:", err);
        res.status(500).json({ error: "Failed to load variants" });
      }
      return;
    }
    if (req.method === "PATCH") {
      if (!(await requireAdmin(req, res))) return;
      const variantId = Number(req.body?.variantId);
      const stock = Number(req.body?.stock);
      if (!Number.isInteger(variantId) || !Number.isInteger(stock) || stock < 0) {
        res.status(400).json({ error: "variantId and a non-negative stock are required" });
        return;
      }
      try {
        await db
          .update(schema.productVariants)
          .set({ stock, updatedAt: new Date() })
          .where(eq(schema.productVariants.id, variantId));
        res.status(200).json({ ok: true });
      } catch (err) {
        console.error("[products variants] update failed:", err);
        res.status(500).json({ error: "Failed to update stock" });
      }
      return;
    }
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // ---- Single-product routes (?id=N) ----
  if (hasId) {
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "Invalid product id" });
      return;
    }

    if (req.method === "GET") {
      try {
        const [product] = await db.select().from(schema.products).where(eq(schema.products.id, id));
        if (!product) {
          res.status(404).json({ error: "Product not found" });
          return;
        }
        const variants = await db
          .select()
          .from(schema.productVariants)
          .where(eq(schema.productVariants.productId, id));
        res.status(200).json({ product, variants });
      } catch (err) {
        console.error("[products/:id] get failed:", err);
        res.status(500).json({ error: "Failed to load product" });
      }
      return;
    }

    if (req.method === "PATCH") {
      if (!(await requireManager(req, res))) return;
      const parsed = productUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid update", details: parsed.error.flatten() });
        return;
      }
      const u = parsed.data;
      try {
        await db
          .update(schema.products)
          .set({
            ...(u.name !== undefined && { name: u.name }),
            ...(u.slug !== undefined && { slug: u.slug }),
            ...(u.description !== undefined && { description: u.description }),
            ...(u.category !== undefined && { category: u.category }),
            ...(u.basePrice !== undefined && { basePrice: u.basePrice.toFixed(2) }),
            ...(u.compareAtPrice !== undefined && { compareAtPrice: u.compareAtPrice.toFixed(2) }),
            ...(u.images !== undefined && { images: u.images }),
            ...(u.sizeGuide !== undefined && { sizeGuide: u.sizeGuide }),
            ...(u.isActive !== undefined && { isActive: u.isActive }),
            updatedAt: new Date(),
          })
          .where(eq(schema.products.id, id));
        res.status(200).json({ ok: true });
      } catch (err) {
        console.error("[products/:id] update failed:", err);
        res.status(500).json({ error: "Failed to update product" });
      }
      return;
    }

    if (req.method === "DELETE") {
      if (!(await requireManager(req, res))) return;
      try {
        await db
          .update(schema.products)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(schema.products.id, id));
        res.status(200).json({ ok: true });
      } catch (err) {
        console.error("[products/:id] delete failed:", err);
        res.status(500).json({ error: "Failed to delete product" });
      }
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // ---- Collection routes ----
  if (req.method === "GET") {
    try {
      const includeInactive = req.query.all === "1";
      const rows = includeInactive
        ? await db.select().from(schema.products).orderBy(desc(schema.products.createdAt))
        : await db
            .select()
            .from(schema.products)
            .where(eq(schema.products.isActive, true))
            .orderBy(desc(schema.products.createdAt));
      res.status(200).json({ products: rows });
    } catch (err) {
      console.error("[products] list failed:", err);
      res.status(500).json({ error: "Failed to load products" });
    }
    return;
  }

  if (req.method === "POST") {
    if (!(await requireManager(req, res))) return;
    const parsed = productInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid product", details: parsed.error.flatten() });
      return;
    }
    const p = parsed.data;
    try {
      const [created] = await db
        .insert(schema.products)
        .values({
          name: p.name,
          slug: p.slug,
          description: p.description,
          category: p.category,
          basePrice: p.basePrice.toFixed(2),
          compareAtPrice: p.compareAtPrice?.toFixed(2),
          images: p.images,
          sizeGuide: p.sizeGuide,
          isActive: p.isActive,
        })
        .returning();
      res.status(201).json({ product: created });
    } catch (err) {
      if (err instanceof Error && err.message.includes("unique")) {
        res.status(409).json({ error: "A product with this slug already exists" });
        return;
      }
      console.error("[products] create failed:", err);
      res.status(500).json({ error: "Failed to create product" });
    }
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
}
