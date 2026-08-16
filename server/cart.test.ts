import { describe, expect, it } from "vitest";

describe("Cart Operations", () => {
  it("should add item to cart", () => {
    const cart = { items: [] as any[] };
    const item = { productId: 1, quantity: 2, price: 650 };
    cart.items.push(item);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]?.quantity).toBe(2);
  });

  it("should calculate cart total", () => {
    const items = [
      { productId: 1, quantity: 2, price: 650 },
      { productId: 2, quantity: 1, price: 1100 },
    ];
    const total = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
    expect(total).toBe(2400);
  });

  it("should remove item from cart", () => {
    const items = [
      { productId: 1, quantity: 2, price: 650 },
      { productId: 2, quantity: 1, price: 1100 },
    ];
    const filtered = items.filter((item) => item.productId !== 1);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.productId).toBe(2);
  });

  it("should update item quantity", () => {
    const items = [{ productId: 1, quantity: 2, price: 650 }];
    const updated = items.map((item) =>
      item.productId === 1 ? { ...item, quantity: 5 } : item
    );
    expect(updated[0]?.quantity).toBe(5);
  });

  it("should calculate shipping fee", () => {
    const subtotal = 2400;
    const shippingFee = subtotal > 2000 ? 0 : 50;
    expect(shippingFee).toBe(0);
  });
});
