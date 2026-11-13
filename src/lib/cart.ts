/* ---------------------------------------------------------------------------
   Marketplace cart.

   A cart holds badges freely, plus at most one username per order: every
   username needs its own character signed into the checkout ticket, and one
   SellAuth order only carries one ticket. Kept in localStorage so the cart
   survives a reload, with a tiny subscription so the header count updates.
   --------------------------------------------------------------------------- */

export type CartItem = {
  key: string;
  type: "letter" | "number" | "symbol" | "badge";
  handle?: string;
  badge?: string;
  title: string;
  subtitle: string;
  art?: string;
};

const KEY = "tourn.cart.v1";
const listeners = new Set<() => void>();

function read(): CartItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? (list as CartItem[]) : [];
  } catch {
    return [];
  }
}

function write(items: CartItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* private mode — the cart simply won't persist */
  }
  for (const listener of listeners) listener();
}

export function cartItems(): CartItem[] {
  return read();
}

export function cartCount(): number {
  return read().length;
}

export function cartUsername(): CartItem | null {
  return read().find((item) => item.type !== "badge") ?? null;
}

export function cartSubscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = () => listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function addToCart(item: CartItem): { ok: true } | { ok: false; reason: string } {
  const items = read();
  if (items.some((entry) => entry.key === item.key)) return { ok: true };
  if (item.type !== "badge" && items.some((entry) => entry.type !== "badge")) {
    return { ok: false, reason: "One username per order. Remove the other name first, or buy this one on its own." };
  }
  write([...items, item]);
  return { ok: true };
}

export function removeFromCart(key: string) {
  write(read().filter((item) => item.key !== key));
}

export function clearCart() {
  write([]);
}
