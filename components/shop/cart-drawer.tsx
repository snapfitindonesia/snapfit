"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/format";
import { useCart } from "@/components/shop/cart-provider";
import { useStoreUI } from "@/components/shop/store-ui-provider";

export function CartDrawer() {
  const { items, subtotal, count, setQty, removeItem, hydrated } = useCart();
  const { cartOpen, closeCart } = useStoreUI();

  // Tutup dengan Esc + kunci scroll body saat terbuka.
  useEffect(() => {
    if (!cartOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeCart();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [cartOpen, closeCart]);

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden={!cartOpen}
        onClick={closeCart}
        className={cn(
          "fixed inset-0 z-50 bg-black/40 transition-opacity duration-300",
          cartOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-label="Keranjang"
        aria-modal={cartOpen}
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-3/4 max-w-sm flex-col bg-background shadow-2xl transition-transform duration-300 ease-out",
          cartOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <ShoppingBag className="size-4" />
            Keranjang{count > 0 && <span className="text-muted-foreground">({count})</span>}
          </p>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Tutup keranjang"
            className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Isi */}
        <div className="flex-1 overflow-y-auto">
          {hydrated && items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <ShoppingBag className="size-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Keranjang masih kosong.</p>
              <Button variant="outline" size="sm" asChild onClick={closeCart}>
                <Link href="/produk">Mulai belanja</Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((it) => (
                <li key={it.variantId} className="flex gap-3 p-4">
                  <Link
                    href={`/produk/${it.productSlug}`}
                    onClick={closeCart}
                    className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-border bg-muted"
                  >
                    <Image src={it.image} alt={it.name} fill sizes="64px" className="object-cover" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium">{it.name}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{formatRupiah(it.price)}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex items-center rounded-md border border-border">
                        <button
                          type="button"
                          aria-label="Kurangi"
                          className="grid size-7 place-items-center disabled:opacity-40"
                          onClick={() => setQty(it.variantId, it.qty - 1)}
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="w-7 text-center text-sm tabular-nums">{it.qty}</span>
                        <button
                          type="button"
                          aria-label="Tambah"
                          className="grid size-7 place-items-center"
                          onClick={() => setQty(it.variantId, it.qty + 1)}
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(it.variantId)}
                        aria-label="Hapus item"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold">
                    {formatRupiah(it.price * it.qty)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-border p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-base font-bold">{formatRupiah(subtotal)}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Ongkir dihitung saat checkout.</p>
            <div className="mt-3 grid grid-cols-1 gap-2">
              <Button asChild onClick={closeCart}>
                <Link href="/checkout">Checkout</Link>
              </Button>
              <Button variant="outline" asChild onClick={closeCart}>
                <Link href="/keranjang">Lihat Keranjang</Link>
              </Button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
