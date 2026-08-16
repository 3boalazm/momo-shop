import type { CreateOrderInput } from "@shared/orderTypes";

/**
 * Thin fetch wrapper for the OLTRÈ API (Vercel serverless functions under /api).
 */
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      message = body.error || message;
      // Surface which field(s) failed validation instead of a generic message
      if (body.details?.fieldErrors) {
        const fieldMsgs = Object.entries(body.details.fieldErrors as Record<string, string[]>)
          .filter(([, msgs]) => msgs && msgs.length > 0)
          .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`);
        if (fieldMsgs.length > 0) {
          message = `${message} — ${fieldMsgs.join("; ")}`;
        }
      }
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export type CreateOrderResponse = {
  ok: boolean;
  orderNumber: string;
  orderId: number;
  total: string;
};

export function createOrder(input: CreateOrderInput) {
  return apiFetch<CreateOrderResponse>("/orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/* ---------- Admin (token-gated) ---------- */
export type AdminOrder = {
  id: number;
  orderNumber: string;
  status: string;
  total: string;
  paymentMethod: string;
  shippingFirstName: string;
  shippingLastName: string;
  shippingPhone: string;
  shippingCity: string;
  createdAt: string;
};

function adminHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export function fetchAdminOrders(token: string, status?: string) {
  const q = status && status !== "All" ? `?status=${encodeURIComponent(status)}` : "";
  return apiFetch<{ orders: AdminOrder[] }>(`/admin/orders${q}`, {
    headers: adminHeaders(token),
  });
}

/** Full order detail (with line items) */
export type AdminOrderItem = {
  id: number;
  productName: string;
  productSlug: string | null;
  color: string;
  size: string;
  quantity: number;
  pricePerUnit: string;
  subtotal: string;
};

export type AdminOrderDetail = AdminOrder & {
  shippingEmail: string;
  shippingAddress: string;
  shippingPostalCode: string | null;
  shippingCountry: string;
  subtotal: string;
  shippingCost: string;
  paymentStatus: string;
  notes: string | null;
};

export function fetchAdminOrder(token: string, id: number) {
  return apiFetch<{ order: AdminOrderDetail; items: AdminOrderItem[] }>(
    `/admin/orders?id=${id}`,
    { headers: adminHeaders(token) }
  );
}

export function updateOrderStatus(token: string, id: number, status: string) {
  return apiFetch<{ ok: boolean }>(`/admin/orders?id=${id}`, {
    method: "PATCH",
    headers: adminHeaders(token),
    body: JSON.stringify({ status }),
  });
}

export type AdminStats = {
  totalOrders: number;
  totalRevenue: string;
  ordersToday: number;
  pendingOrders: number;
  bestSeller: string;
};

export function fetchAdminStats(token: string) {
  return apiFetch<AdminStats>("/admin/stats", { headers: adminHeaders(token) });
}

/* ---------- Products (admin CRUD + public read) ---------- */
export type ApiProduct = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  basePrice: string;
  compareAtPrice: string | null;
  images: string[];
  sizeGuide: string | null;
  isActive: boolean;
  createdAt: string;
};

export type ProductPayload = {
  name: string;
  slug: string;
  description?: string;
  category: "tees" | "denim" | "hoodies";
  basePrice: number;
  compareAtPrice?: number;
  images: string[];
  sizeGuide?: string;
  isActive?: boolean;
};

/** Public list (active products). Pass all=true (admin) to include inactive. */
export function fetchProducts(all = false) {
  return apiFetch<{ products: ApiProduct[] }>(`/products${all ? "?all=1" : ""}`);
}

export function createProduct(token: string, payload: ProductPayload) {
  return apiFetch<{ product: ApiProduct }>("/products", {
    method: "POST",
    headers: adminHeaders(token),
    body: JSON.stringify(payload),
  });
}

export function updateProduct(token: string, id: number, payload: Partial<ProductPayload>) {
  return apiFetch<{ ok: boolean }>(`/products?id=${id}`, {
    method: "PATCH",
    headers: adminHeaders(token),
    body: JSON.stringify(payload),
  });
}

export function deleteProduct(token: string, id: number) {
  return apiFetch<{ ok: boolean }>(`/products?id=${id}`, {
    method: "DELETE",
    headers: adminHeaders(token),
  });
}

/* ---------- Payment (Paymob) ---------- */
export type IntentionResponse = {
  clientSecret: string;
  publicKey: string;
};

export function createPaymentIntention(orderId: number) {
  return apiFetch<IntentionResponse>("/payment/intention", {
    method: "POST",
    body: JSON.stringify({ orderId }),
  });
}

/* ---------- Dashboard Overview ---------- */
export type OverviewKpis = {
  totalRevenue: string;
  totalOrders: number;
  ordersToday: number;
  revenueToday: string;
  avgOrderValue: string;
  pendingOrders: number;
  productsSold: number;
  activeCustomers: number;
  lowStockCount: number;
};

export type RevenuePoint = { date: string; revenue: number; orders: number };
export type TopProduct = { productName: string; qty: number; revenue: string };
export type LowStockItem = {
  productName: string;
  color: string;
  size: string;
  stock: number;
  sku: string;
};
export type RecentOrder = {
  id: number;
  orderNumber: string;
  firstName: string;
  lastName: string;
  total: string;
  status: string;
  createdAt: string;
};

export type GovernorateRevenue = { governorate: string | null; revenue: string; orders: number };
export type CustomerRetention = {
  repeatCustomers: number;
  totalCustomers: number;
  newThisMonth: number;
  returningThisMonth: number;
};

export type AdminOverview = {
  kpis: OverviewKpis;
  revenueSeries: RevenuePoint[];
  recentOrders: RecentOrder[];
  topProducts: TopProduct[];
  lowStock: LowStockItem[];
  revenueByGovernorate: GovernorateRevenue[];
  customerRetention: CustomerRetention;
};

export function fetchAdminOverview(token: string) {
  return apiFetch<AdminOverview>("/admin/overview", { headers: adminHeaders(token) });
}

/* ---------- Coupons ---------- */
export type AppliedCoupon = {
  code: string;
  discountType: "percentage" | "fixed";
  value: number;
  discountAmount: number;
};

export function validateCoupon(code: string, subtotal: number) {
  return apiFetch<AppliedCoupon>("/admin/coupons?validate=1", {
    method: "POST",
    body: JSON.stringify({ code, subtotal }),
  });
}

export type AdminCoupon = {
  id: number;
  code: string;
  discountType: "percentage" | "fixed";
  value: string;
  minSubtotal: string | null;
  usageLimit: number | null;
  usageCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
};

export type CouponPayload = {
  code: string;
  discountType: "percentage" | "fixed";
  value: number;
  minSubtotal?: number;
  usageLimit?: number;
  expiresAt?: string;
  isActive?: boolean;
};

export function fetchCoupons(token: string) {
  return apiFetch<{ coupons: AdminCoupon[] }>("/admin/coupons", { headers: adminHeaders(token) });
}
export function createCoupon(token: string, payload: CouponPayload) {
  return apiFetch<{ coupon: AdminCoupon }>("/admin/coupons", {
    method: "POST", headers: adminHeaders(token), body: JSON.stringify(payload),
  });
}
export function updateCoupon(token: string, id: number, payload: Partial<CouponPayload>) {
  return apiFetch<{ ok: boolean }>(`/admin/coupons?id=${id}`, {
    method: "PATCH", headers: adminHeaders(token), body: JSON.stringify(payload),
  });
}
export function deleteCoupon(token: string, id: number) {
  return apiFetch<{ ok: boolean }>(`/admin/coupons?id=${id}`, {
    method: "DELETE", headers: adminHeaders(token),
  });
}

/* ---------- Reviews ---------- */
export type Review = {
  id: number;
  productId: number;
  authorName: string;
  rating: number;
  title: string | null;
  body: string | null;
  status: string;
  createdAt: string;
};

export function fetchReviews(productId: number) {
  return apiFetch<{ reviews: Review[]; count: number; average: number }>(
    `/reviews?productId=${productId}`
  );
}

export function submitReview(input: {
  productId: number; authorName: string; rating: number; title?: string; body?: string;
}) {
  return apiFetch<{ ok: boolean; message: string }>("/reviews", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export type AdminReview = Review & { productName: string | null };

export function fetchAdminReviews(token: string, status?: string) {
  const q = status && status !== "All" ? `?status=${encodeURIComponent(status)}` : "";
  return apiFetch<{ reviews: AdminReview[] }>(`/admin/reviews${q}`, { headers: adminHeaders(token) });
}
export function moderateReview(token: string, id: number, status: "Approved" | "Rejected") {
  return apiFetch<{ ok: boolean }>(`/admin/reviews?id=${id}`, {
    method: "PATCH", headers: adminHeaders(token), body: JSON.stringify({ status }),
  });
}
export function deleteReview(token: string, id: number) {
  return apiFetch<{ ok: boolean }>(`/admin/reviews?id=${id}`, {
    method: "DELETE", headers: adminHeaders(token),
  });
}

/* ---------- Inventory (variants) ---------- */
export type Variant = {
  id: number;
  productId: number;
  color: string;
  size: string;
  stock: number;
  sku: string;
};

export function fetchVariants(productId: number) {
  return apiFetch<{ variants: Variant[] }>(`/products?variants=${productId}`);
}

export function updateVariantStock(token: string, productId: number, variantId: number, stock: number) {
  return apiFetch<{ ok: boolean }>(`/products?variants=${productId}`, {
    method: "PATCH",
    headers: adminHeaders(token),
    body: JSON.stringify({ variantId, stock }),
  });
}

/* ---------- Order tracking (public) ---------- */
export type TrackedOrder = {
  order: {
    orderNumber: string;
    status: string;
    paymentMethod: string;
    paymentStatus: string;
    total: string;
    createdAt: string;
    shippingFirstName: string;
    shippingCity: string;
  };
  items: { productName: string; color: string; size: string; quantity: number }[];
};

export function trackOrder(orderNumber: string, phone: string) {
  return apiFetch<TrackedOrder>(
    `/orders?track=${encodeURIComponent(orderNumber)}&phone=${encodeURIComponent(phone)}`
  );
}

/* ---------- Abandoned Carts ---------- */
export type AbandonedCartItem = {
  name: string;
  color: string;
  size: string;
  quantity: number;
  price: number;
};

export type AbandonedCart = {
  id: number;
  phone: string;
  name: string | null;
  items: AbandonedCartItem[];
  subtotal: string;
  status: "Open" | "Contacted" | "Recovered" | "Dismissed";
  createdAt: string;
  updatedAt: string;
};

export function captureAbandonedCart(payload: {
  phone: string;
  name?: string;
  items: AbandonedCartItem[];
  subtotal: number;
}) {
  return apiFetch<{ ok: boolean; id: number }>("/abandoned-carts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchAbandonedCarts(token: string, status?: string) {
  const q = status && status !== "All" ? `?status=${status}` : "";
  return apiFetch<{ carts: AbandonedCart[] }>(`/abandoned-carts${q}`, { headers: adminHeaders(token) });
}

export function updateAbandonedCart(token: string, id: number, status: string) {
  return apiFetch<{ ok: boolean }>(`/abandoned-carts?id=${id}`, {
    method: "PATCH",
    headers: adminHeaders(token),
    body: JSON.stringify({ status }),
  });
}

/* ---------- Customer Auth ---------- */
export type CustomerUser = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: "user" | "support" | "manager" | "super_admin";
  loyaltyPoints?: number;
};

export function signup(payload: { name: string; email: string; password: string; phone?: string }) {
  return apiFetch<{ user: CustomerUser }>("/auth?action=signup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function login(payload: { email: string; password: string }) {
  return apiFetch<{ user: CustomerUser }>("/auth?action=login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function logout() {
  return apiFetch<{ ok: boolean }>("/auth?action=logout", { method: "POST" });
}

export function fetchCurrentUser() {
  return apiFetch<{ user: CustomerUser }>("/auth");
}

/* ---------- My Orders (authenticated customer) ---------- */
export type MyOrder = {
  id: number;
  orderNumber: string;
  status: string;
  total: string;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  shippingCity: string;
};

export function fetchMyOrders() {
  return apiFetch<{ orders: MyOrder[] }>("/orders?mine=1");
}

/* ---------- Loyalty ---------- */
export type LoyaltyTransaction = {
  id: number;
  type: "earn" | "redeem";
  points: number;
  note: string | null;
  createdAt: string;
};

export function fetchLoyaltyHistory() {
  return apiFetch<{ transactions: LoyaltyTransaction[] }>("/auth?action=loyalty-history");
}

export function redeemPoints(points: number) {
  return apiFetch<{ coupon: string; value: number }>("/auth?action=redeem-points", {
    method: "POST",
    body: JSON.stringify({ points }),
  });
}

/* ---------- Staff Management (super_admin only) ---------- */
export type StaffMember = {
  id: number;
  name: string;
  email: string;
  role: "support" | "manager" | "super_admin";
  isActive: boolean;
  createdAt: string;
  lastSignedIn: string | null;
};

export function fetchStaffList(token: string) {
  return apiFetch<{ staff: StaffMember[] }>("/auth?action=staff-list", { headers: adminHeaders(token) });
}

export function createStaff(token: string, payload: { name: string; email: string; password: string; role: string }) {
  return apiFetch<{ staff: StaffMember }>("/auth?action=staff-create", {
    method: "POST",
    headers: adminHeaders(token),
    body: JSON.stringify(payload),
  });
}

export function updateStaff(token: string, id: number, payload: { role?: string; isActive?: boolean }) {
  return apiFetch<{ ok: boolean }>("/auth?action=staff-update", {
    method: "POST",
    headers: adminHeaders(token),
    body: JSON.stringify({ id, ...payload }),
  });
}
