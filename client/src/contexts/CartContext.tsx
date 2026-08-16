import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export interface CartItem {
  /** Stable line id: productSlug-color-size (one line per unique variant) */
  lineId: string;
  productSlug: string;
  name: string;
  price: number;
  image?: string;
  color: string;
  size: string;
  quantity: number;
}

/** What callers pass to add an item (quantity defaults to 1) */
export type AddItemInput = Omit<CartItem, "lineId" | "quantity"> & { quantity?: number };

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  addItem: (item: AddItemInput) => void;
  removeItem: (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "momo_cart_v1";

function makeLineId(productSlug: string, color: string, size: string) {
  return `${productSlug}::${color}::${size}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  // Persist to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage full / unavailable — ignore */
    }
  }, [items]);

  const addItem = useCallback((input: AddItemInput) => {
    const lineId = makeLineId(input.productSlug, input.color, input.size);
    const qty = input.quantity ?? 1;
    setItems((prev) => {
      const existing = prev.find((i) => i.lineId === lineId);
      if (existing) {
        // Same variant already in cart → bump quantity
        return prev.map((i) =>
          i.lineId === lineId ? { ...i, quantity: i.quantity + qty } : i
        );
      }
      return [...prev, { ...input, lineId, quantity: qty }];
    });
    // Let the navbar cart icon shake
    window.dispatchEvent(new CustomEvent("momo:cart-add"));
  }, []);

  const removeItem = useCallback((lineId: string) => {
    setItems((prev) => prev.filter((i) => i.lineId !== lineId));
  }, []);

  const updateQuantity = useCallback((lineId: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.lineId !== lineId)
        : prev.map((i) => (i.lineId === lineId ? { ...i, quantity } : i))
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, count, subtotal, addItem, removeItem, updateQuantity, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
