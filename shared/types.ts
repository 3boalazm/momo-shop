export type Category = "tees" | "denim" | "hoodies";
export type Size = "XS" | "S" | "M" | "L" | "XL" | "XXL";
export type OrderStatus = "Pending" | "Shipped" | "Delivered" | "Cancelled";
export type PaymentMethod = "COD";

export interface ProductData {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  category: Category;
  basePrice: string;
  images: string[];
  sizeGuide: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductVariantData {
  id: number;
  productId: number;
  color: string;
  size: Size;
  stock: number;
  sku: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItemData {
  id: number;
  userId: number | null;
  sessionId: string | null;
  variantId: number;
  quantity: number;
  addedAt: Date;
  updatedAt: Date;
}

export interface WishlistItemData {
  id: number;
  userId: number;
  productId: number;
  addedAt: Date;
}

export interface OrderData {
  id: number;
  userId: number | null;
  orderNumber: string;
  status: OrderStatus;
  subtotal: string;
  shippingCost: string;
  total: string;
  paymentMethod: PaymentMethod;
  shippingFirstName: string;
  shippingLastName: string;
  shippingEmail: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPostalCode: string;
  shippingCountry: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItemData {
  id: number;
  orderId: number;
  variantId: number;
  productName: string;
  color: string;
  size: string;
  quantity: number;
  pricePerUnit: string;
  subtotal: string;
}

export interface AddressData {
  id: number;
  userId: number;
  label: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Note: the authoritative User type now lives in drizzle/schema.ts (User, InsertUser),
// generated from the real `users` table used by the auth system.

// Cart item with product and variant details
export interface CartItemWithDetails extends CartItemData {
  product?: ProductData;
  variant?: ProductVariantData;
}

// Wishlist item with product details
export interface WishlistItemWithDetails extends WishlistItemData {
  product?: ProductData;
}
