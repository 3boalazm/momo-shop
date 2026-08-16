import { z } from "zod";

/** Single line item in an order (sent from cart) */
export const orderItemSchema = z.object({
  productName: z.string().min(1).max(255),
  productSlug: z.string().max(255).optional(),
  color: z.string().min(1).max(100),
  size: z.string().min(1).max(10),
  quantity: z.number().int().positive().max(99),
  pricePerUnit: z.number().nonnegative(),
});

/** Full order creation payload (POST /api/orders) */
export const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, "Order must have at least one item"),
  paymentMethod: z.enum(["COD", "Online"]),
  shipping: z.object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    email: z.string().email().max(320),
    phone: z.string().min(6).max(20),
    address: z.string().min(1),
    city: z.string().min(1).max(100),
    governorate: z.string().max(100).optional(),
    postalCode: z.string().max(20).optional(),
    country: z.string().max(100).default("Egypt"),
  }),
  notes: z.string().max(1000).optional(),
  couponCode: z.string().max(50).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type OrderItemInput = z.infer<typeof orderItemSchema>;

import { computeShipping } from "./shipping.js";

/** Shipping cost rules — see shared/shipping.ts for zone fees */
export const FREE_SHIPPING_OVER = 2000; // EGP

export function computeTotals(items: OrderItemInput[], governorate?: string) {
  const subtotal = items.reduce((sum, it) => sum + it.pricePerUnit * it.quantity, 0);
  const shippingCost = computeShipping(subtotal, governorate);
  return { subtotal, shippingCost, total: subtotal + shippingCost };
}
