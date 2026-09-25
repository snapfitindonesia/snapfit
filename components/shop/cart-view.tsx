"use client";

import Image from "@/components/ui/image";
import Link from "next/link";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/format";
import { useCart } from "@/components/shop/cart-provider";

const MAX_QTY = 99; // stok final divalidasi ulang di server saat checkout (Tahap 5)

export function CartView() {
  const { items, subtotal, count, hydrated, setQty, removeItem, clear } =
    useCart();

  // Hindari flash "kosong" sebelum localStorage dimuat
  if (!hydrated) {
    return (
      <div className="mt-8 space-y-4" aria-hidden>
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg border border-border bg-muted/50" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mt-12 flex flex-col items-center py-16 text-center">
        <div className="grid size-16 place-items-center rounded-full bg-muted">
          <ShoppingBag className="size-7 text-muted-foreground" />
        </div>
        <h2 className="mt-5 text-lg font-medium">Keranjang masih kosong</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Yuk pilih case atau pelindung yang pas untuk HP-mu.
        </p>
        <Button className="mt-6" asChild>
          <Link href="/produk">Mulai belanja</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-3 lg:gap-10">
      {/* Daftar item */}
      <ul className="lg:col-span-2 divide-y divide-border rounded-lg border border-border">
        {items.map((item) => (
          <li key={item.variantId} className="flex gap-4 p-4">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
              <Image
                src={item.image}
                alt={item.name}
                fill
                sizes="80px"
                className="object-cover"
              />
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={`/produk/${item.productSlug}`}
                  className="line-clamp-2 text-sm font-medium hover:underline"
                >
                  {item.name}
                </Link>
                <button
                  type="button"
                  aria-label="Hapus item"
                  onClick={() => removeItem(item.variantId)}
                  className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              <p className="mt-0.5 text-sm text-muted-foreground">
                {formatRupiah(item.price)}
              </p>

              <div className="mt-auto flex items-center justify-between pt-3">
                {/* Qty stepper — subtotal update seketika (state client) */}
                <div className="flex items-center rounded-md border border-border">
                  <button
                    type="button"
                    aria-label="Kurangi"
                    className="grid size-8 place-items-center disabled:opacity-40"
                    disabled={item.qty <= 1}
                    onClick={() => setQty(item.variantId, item.qty - 1)}
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="w-8 text-center text-sm tabular-nums">
                    {item.qty}
                  </span>
                  <button
                    type="button"
                    aria-label="Tambah"
                    className="grid size-8 place-items-center disabled:opacity-40"
                    disabled={item.qty >= MAX_QTY}
                    onClick={() => setQty(item.variantId, item.qty + 1)}
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>

                <span className="text-sm font-semibold">
                  {formatRupiah(item.price * item.qty)}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Ringkasan */}
      <aside className="lg:col-span-1">
        <div className="rounded-lg border border-border p-5 lg:sticky lg:top-24">
          <h2 className="text-base font-medium">Ringkasan</h2>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Subtotal ({count} item)
            </span>
            <span className="font-medium">{formatRupiah(subtotal)}</span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Ongkir & voucher dihitung saat checkout.
          </p>

          <Button size="lg" className="mt-5 w-full" asChild>
            <Link href="/checkout">Lanjut ke Checkout</Link>
          </Button>
          <button
            type="button"
            onClick={clear}
            className="mt-3 w-full text-center text-xs text-muted-foreground transition-colors hover:text-destructive"
          >
            Kosongkan keranjang
          </button>
        </div>
      </aside>
    </div>
  );
}
