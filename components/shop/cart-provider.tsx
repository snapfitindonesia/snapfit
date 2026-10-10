"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getCartPrices } from "@/lib/actions/cart";
import { applyVoucher } from "@/lib/actions/voucher";
import { mergeVoucher } from "@/lib/voucher";

export type CartItem = {
  variantId: string;
  productSlug: string;
  name: string;
  price: number; // rupiah, integer (snapshot saat ditambah; diperbarui refreshPrices)
  image: string;
  qty: number;
};

export type AppliedVoucher = {
  code: string;
  label: string;
  discount: number; // estimasi (server hitung ulang saat order)
  freeShipping: boolean;
  type: string; // POTONGAN | GRATIS_ONGKIR
  stackable: boolean;
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
  // Voucher & catatan (dibawa ke checkout)
  vouchers: AppliedVoucher[]; // maks. 1 per jenis, hanya yang bisa digabung (lib/voucher.ts)
  /** Pasang voucher; yang tak bisa digabung dengannya dilepas (dikembalikan). */
  addVoucher: (v: AppliedVoucher) => AppliedVoucher[];
  removeVoucher: (code: string) => void;
  note: string;
  setNote: (s: string) => void;
  /** Samakan harga di keranjang dengan harga terkini (flash sale berakhir, harga diubah admin/Ginee). */
  refreshPrices: () => void;
  /** Pesan "harga diperbarui" (null = tak ada perubahan). */
  priceNotice: string | null;
  dismissPriceNotice: () => void;
};

const STORAGE_KEY = "snapfit.cart.v1";
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [vouchers, setVouchers] = useState<AppliedVoucher[]>([]);
  const [note, setNote] = useState("");
  const [priceNotice, setPriceNotice] = useState<string | null>(null);
  const itemsRef = useRef<CartItem[]>([]);
  itemsRef.current = items;
  const lastRefresh = useRef(0);

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

  const clear = useCallback(() => {
    commit(() => []);
    setVouchers([]);
    setNote("");
  }, [commit]);

  const refreshPrices = useCallback(() => {
    const ids = itemsRef.current.map((i) => i.variantId);
    if (!ids.length || Date.now() - lastRefresh.current < 15_000) return;
    lastRefresh.current = Date.now();
    getCartPrices(ids)
      .then((prices) => {
        const byId = new Map(prices.map((p) => [p.variantId, p]));
        const changed = itemsRef.current.filter((i) => {
          const p = byId.get(i.variantId);
          return p && p.available && p.price !== i.price;
        });
        if (!changed.length) return;
        commit((prev) =>
          prev.map((i) => {
            const p = byId.get(i.variantId);
            return p && p.available && p.price !== i.price ? { ...i, price: p.price } : i;
          }),
        );
        setPriceNotice(
          changed.length === 1
            ? `Harga "${changed[0]!.name}" diperbarui mengikuti harga terbaru.`
            : `Harga ${changed.length} produk di keranjang diperbarui mengikuti harga terbaru.`,
        );
      })
      .catch(() => {}); // gagal jaringan → tetap pakai harga lama (server tetap menghitung ulang saat pesan)
  }, [commit]);

  // Sekali setelah keranjang dimuat dari localStorage (harga bisa basi sejak kunjungan sebelumnya).
  useEffect(() => {
    if (hydrated) refreshPrices();
  }, [hydrated, refreshPrices]);

  const dismissPriceNotice = useCallback(() => setPriceNotice(null), []);

  const subtotal = useMemo(() => items.reduce((n, i) => n + i.price * i.qty, 0), [items]);

  const addVoucher = useCallback(
    (v: AppliedVoucher) => {
      const r = mergeVoucher(vouchers, v);
      setVouchers(r.list);
      return r.replaced;
    },
    [vouchers],
  );
  const removeVoucher = useCallback((code: string) => setVouchers((cur) => cur.filter((v) => v.code !== code)), []);

  // Re-validasi voucher saat subtotal berubah (mis. min belanja tak lagi terpenuhi).
  useEffect(() => {
    if (!vouchers.length) return;
    let cancelled = false;
    Promise.all(vouchers.map((v) => applyVoucher(v.code, subtotal))).then((rs) => {
      if (cancelled) return;
      setVouchers(rs.flatMap((r) => (r.ok ? [{ code: r.code, label: r.label, discount: r.discount, freeShipping: r.freeShipping, type: r.type, stackable: r.stackable }] : [])));
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((n, i) => n + i.qty, 0);
    return { items, count, subtotal, hydrated, addItem, setQty, removeItem, clear, vouchers, addVoucher, removeVoucher, note, setNote, refreshPrices, priceNotice, dismissPriceNotice };
  }, [items, subtotal, hydrated, addItem, setQty, removeItem, clear, vouchers, addVoucher, removeVoucher, note, refreshPrices, priceNotice, dismissPriceNotice]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart harus dipakai di dalam <CartProvider>");
  return ctx;
}
