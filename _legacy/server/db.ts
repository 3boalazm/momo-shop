import { eq, and, like, desc, asc, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  products,
  productVariants,
  cart,
  wishlist,
  orders,
  orderItems,
  addresses,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ PRODUCTS ============

export async function getProductBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(products)
    .where(and(eq(products.slug, slug), eq(products.isActive, true)))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getAllProducts(category?: string) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(products.isActive, true)];
  if (category) {
    conditions.push(eq(products.category, category as any));
  }

  return await db
    .select()
    .from(products)
    .where(and(...conditions))
    .orderBy(desc(products.createdAt));
}

export async function searchProducts(query: string) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.isActive, true),
        like(products.name, `%${query}%`)
      )
    )
    .orderBy(desc(products.createdAt));
}

export async function getProductVariants(productId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, productId));
}

export async function getVariantBySku(sku: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.sku, sku))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ CART ============

export async function getCartItems(userId?: number, sessionId?: string) {
  const db = await getDb();
  if (!db) return [];

  const conditions = userId
    ? [eq(cart.userId, userId)]
    : [eq(cart.sessionId, sessionId || "")];

  return await db.select().from(cart).where(and(...conditions));
}

export async function addToCart(
  variantId: number,
  quantity: number,
  userId?: number,
  sessionId?: string
) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(cart).values({
    variantId,
    quantity,
    userId: userId || undefined,
    sessionId: sessionId || undefined,
  });

  return result;
}

export async function updateCartItemQuantity(cartId: number, quantity: number) {
  const db = await getDb();
  if (!db) return null;

  return await db
    .update(cart)
    .set({ quantity, updatedAt: new Date() })
    .where(eq(cart.id, cartId));
}

export async function removeFromCart(cartId: number) {
  const db = await getDb();
  if (!db) return null;

  return await db.delete(cart).where(eq(cart.id, cartId));
}

export async function clearCart(userId?: number, sessionId?: string) {
  const db = await getDb();
  if (!db) return null;

  const conditions = userId
    ? [eq(cart.userId, userId)]
    : [eq(cart.sessionId, sessionId || "")];

  return await db.delete(cart).where(and(...conditions));
}

// ============ WISHLIST ============

export async function getWishlistItems(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(wishlist)
    .where(eq(wishlist.userId, userId));
}

export async function addToWishlist(userId: number, productId: number) {
  const db = await getDb();
  if (!db) return null;

  return await db.insert(wishlist).values({ userId, productId });
}

export async function removeFromWishlist(userId: number, productId: number) {
  const db = await getDb();
  if (!db) return null;

  return await db
    .delete(wishlist)
    .where(and(eq(wishlist.userId, userId), eq(wishlist.productId, productId)));
}

// ============ ORDERS ============

export async function createOrder(orderData: any) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(orders).values(orderData);
  return result;
}

export async function getOrderByNumber(orderNumber: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(orders)
    .where(eq(orders.orderNumber, orderNumber))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserOrders(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));
}

export async function getAllOrders() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(orders).orderBy(desc(orders.createdAt));
}

export async function updateOrderStatus(orderId: number, status: string) {
  const db = await getDb();
  if (!db) return null;

  return await db
    .update(orders)
    .set({ status: status as any, updatedAt: new Date() })
    .where(eq(orders.id, orderId));
}

export async function addOrderItems(items: any[]) {
  const db = await getDb();
  if (!db) return null;

  return await db.insert(orderItems).values(items);
}

export async function getOrderItems(orderId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));
}

// ============ ADDRESSES ============

export async function getUserAddresses(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(addresses)
    .where(eq(addresses.userId, userId))
    .orderBy(desc(addresses.isDefault));
}

export async function createAddress(addressData: any) {
  const db = await getDb();
  if (!db) return null;

  return await db.insert(addresses).values(addressData);
}

export async function updateAddress(addressId: number, addressData: any) {
  const db = await getDb();
  if (!db) return null;

  return await db
    .update(addresses)
    .set({ ...addressData, updatedAt: new Date() })
    .where(eq(addresses.id, addressId));
}

export async function deleteAddress(addressId: number) {
  const db = await getDb();
  if (!db) return null;

  return await db.delete(addresses).where(eq(addresses.id, addressId));
}
