"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type CartItem = {
  variantId: string;
  productSlug: string;
  name: string;
  price: number; // rupiah, integer (snapshot saat ditambah)
  image: string;
  qty: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number; // total qty (untuk badge)
  subtotal: number;
  hydrated: boolean; // true setelah dimuat dari localStorage (hindari flash kosong)
  addItem: (item: Omit<CartItem, "qty">, qty?: number) => void;
  setQty: (variantId: string, qty: number) => void;
  removeItem: (variantId: string) => void;
  clear: () => void;
};

const STORAGE_KEY = "snapfit.cart.v1";
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Muat dari localStorage sekali (client-only, aman untuk SSR)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // abaikan storage yang korup / tak tersedia
    }
    setHydrated(true);
  }, []);

  // Semua mutasi lewat sini: hitung state baru, TULIS localStorage SEKETIKA (sinkron),
  // lalu set state. Persist sinkron mencegah kehilangan data bila halaman langsung
  // di-navigasi setelah aksi (mis. tambah → langsung ke keranjang).
  const commit = useCallback(
    (updater: (prev: CartItem[]) => CartItem[]) => {
      setItems((prev) => {
        const next = updater(prev);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // abaikan storage yang tak tersedia
        }
        return next;
      });
    },
    [],
  );

  const addItem = useCallback<CartContextValue["addItem"]>(
    (item, qty = 1) => {
      commit((prev) => {
        const existing = prev.find((i) => i.variantId === item.variantId);
        if (existing) {
          return prev.map((i) =>
            i.variantId === item.variantId ? { ...i, qty: i.qty + qty } : i,
          );
        }
        return [...prev, { ...item, qty }];
      });
    },
    [commit],
  );

  const setQty = useCallback<CartContextValue["setQty"]>(
    (variantId, qty) => {
      commit((prev) =>
        qty <= 0
          ? prev.filter((i) => i.variantId !== variantId)
          : prev.map((i) => (i.variantId === variantId ? { ...i, qty } : i)),
      );
    },
    [commit],
  );

  const removeItem = useCallback<CartContextValue["removeItem"]>(
    (variantId) => {
      commit((prev) => prev.filter((i) => i.variantId !== variantId));
    },
    [commit],
  );

  const clear = useCallback(() => commit(() => []), [commit]);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((n, i) => n + i.qty, 0);
    const subtotal = items.reduce((n, i) => n + i.price * i.qty, 0);
    return { items, count, subtotal, hydrated, addItem, setQty, removeItem, clear };
  }, [items, hydrated, addItem, setQty, removeItem, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart harus dipakai di dalam <CartProvider>");
  return ctx;
}
