export interface CartItem {
  bookId: string;
  quantity: number;
}

export const CART_STORAGE_KEY = "ebook-store-cart";

export function readCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter(
      (item): item is CartItem =>
        typeof item?.bookId === "string" &&
        Number.isInteger(item?.quantity) &&
        item.quantity > 0 &&
        item.quantity <= 10,
    );
  } catch {
    return [];
  }
}

export function writeCart(items: CartItem[]) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("cart-updated"));
}

export function addToCart(bookId: string) {
  const cart = readCart();
  const existing = cart.find((item) => item.bookId === bookId);
  if (existing) {
    if (existing.quantity < 10) existing.quantity += 1;
  } else {
    cart.push({ bookId, quantity: 1 });
  }
  writeCart(cart);
}
