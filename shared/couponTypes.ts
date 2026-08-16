import { z } from "zod";

/** Admin create/update coupon payload */
export const couponInputSchema = z.object({
  code: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[A-Z0-9_-]+$/, "Code must be uppercase letters, numbers, - or _"),
  discountType: z.enum(["percentage", "fixed"]),
  value: z.number().positive(),
  minSubtotal: z.number().nonnegative().optional(),
  usageLimit: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(), // ISO string
  isActive: z.boolean().default(true),
});

export const couponUpdateSchema = couponInputSchema.partial();

export type CouponInput = z.infer<typeof couponInputSchema>;

/** Shape returned to the client when validating a coupon at checkout */
export interface AppliedCoupon {
  code: string;
  discountType: "percentage" | "fixed";
  value: number;
  discountAmount: number; // computed EGP discount for the given subtotal
}

/**
 * Computes the discount amount for a coupon against a subtotal.
 * Percentage is capped at the subtotal; fixed never exceeds subtotal.
 */
export function computeDiscount(
  discountType: "percentage" | "fixed",
  value: number,
  subtotal: number
): number {
  let discount = 0;
  if (discountType === "percentage") {
    discount = (subtotal * value) / 100;
  } else {
    discount = value;
  }
  // Never discount more than the subtotal
  return Math.min(Math.round(discount * 100) / 100, subtotal);
}
