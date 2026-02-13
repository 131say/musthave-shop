export type CartItem = {
  id: number;
  name: string;
  price: number;
  qty: number;
  imageUrl?: string | null;
  brandName?: string | null;
  slug?: string | null;
  oldPrice?: number | null;
};

const CART_KEY = "musthave_cart";
const CART_EVENT = "cart:changed";

function emitCartChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CART_EVENT));
}

export function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as CartItem[];
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  emitCartChanged();
}

export function cartCount(items?: CartItem[]) {
  const xs = items ?? readCart();
  return xs.reduce((acc, it) => acc + (Number(it.qty) || 0), 0);
}

export function cartTotal(items?: CartItem[]) {
  const xs = items ?? readCart();
  return xs.reduce((acc, it) => acc + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);
}

export function clearCart() {
  if (typeof window === "undefined") return;
  // safer for any legacy readers that treat "missing" as empty
  localStorage.removeItem(CART_KEY);
  emitCartChanged();
}

export function addToCart(item: CartItem, opts?: { qty?: number }) {
  const items = readCart();
  const qty = Math.max(1, Number(opts?.qty ?? item.qty ?? 1) || 1);
  const idx = items.findIndex((x) => x.id === item.id);
  if (idx >= 0) {
    items[idx] = { ...items[idx], qty: items[idx].qty + qty };
  } else {
    items.push({ ...item, qty });
  }
  writeCart(items);
}

export function setQty(id: number, qty: number) {
  const items = readCart();
  const q = Math.max(0, Number(qty) || 0);
  const idx = items.findIndex((x) => x.id === id);
  if (idx < 0) return;
  if (q <= 0) items.splice(idx, 1);
  else items[idx] = { ...items[idx], qty: q };
  writeCart(items);
}

export function removeFromCart(id: number) {
  const items = readCart().filter((x) => x.id !== id);
  writeCart(items);
}

export function onCartChanged(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CART_EVENT, cb);
  return () => {
    window.removeEventListener(CART_EVENT, cb);
  };
}
