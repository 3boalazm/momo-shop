import { z } from "zod";

/** Customer-submitted review (public POST) */
export const reviewInputSchema = z.object({
  productId: z.number().int().positive(),
  authorName: z.string().min(1).max(100),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  body: z.string().max(2000).optional(),
});

export type ReviewInput = z.infer<typeof reviewInputSchema>;
