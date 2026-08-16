import { z } from "zod";

// Accepts either a full URL (https://...) or a relative path bundled with the
// app itself (e.g. /images/products/foo.webp) — both are valid image sources.
const imagePathOrUrl = z
  .string()
  .refine(
    (val) => val.startsWith("/") || /^https?:\/\//.test(val),
    { message: "Must be a valid URL (https://…) or a path starting with /" }
  );

/** Create/update product payload (admin) */
export const productInputSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens"),
  description: z.string().max(5000).optional(),
  category: z.enum(["tees", "denim", "hoodies"]),
  basePrice: z.number().nonnegative(),
  compareAtPrice: z.number().nonnegative().optional(),
  images: z.array(imagePathOrUrl).min(1, "At least one image is required"),
  sizeGuide: z.string().max(2000).optional(),
  isActive: z.boolean().default(true),
});

/** Partial schema for PATCH updates */
export const productUpdateSchema = productInputSchema.partial();

export type ProductInput = z.infer<typeof productInputSchema>;
export type ProductUpdate = z.infer<typeof productUpdateSchema>;
