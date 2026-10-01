"use client";

import { useEffect, useState } from "react";
import Image from "@/components/ui/image";
import Link from "next/link";
import { Check, Plus } from "lucide-react";
import { formatRupiah } from "@/lib/format";
import { useCart } from "@/components/shop/cart-provider";
import { getCartBundlesAction } from "@/lib/actions/bundles";
import { trackAddToCart } from "@/lib/tracking";
import type { BundleItem } from "@/lib/bundles-shared";

type Data = { title: string; items: BundleItem[] };

/**
 * "Sering dibeli bersama" di drawer keranjang — varian pilihan admin (Admin → Bundle Keranjang).
 * Dimuat sekali saat keranjang pertama kali dibuka (data di-cache server). Yang sudah ada di
 * keranjang disembunyikan; lebih dari satu → bisa digeser.
 */
export function CartBundles({ open, onNavigate }: { open: boolean; onNavigate?: () => void }) {
  const { items, addItem } = useCart();
  const [data, setData] = useState<Data | null>(null);
  const [added, setAdded] = useState<string | null>(null);

  useEffect(() => {
    if (!open || data) return;
    getCartBundlesAction().then(setData).catch(() => setData({ title: "", items: [] }));
  }, [open, data]);

  const inCart = new Set(items.map((i) => i.variantId));
  const list = (data?.items ?? []).filter((b) => !inCart.has(b.variantId) || b.variantId === added);
  if (!list.length) return null;

  function add(b: BundleItem) {
    addItem({
      variantId: b.variantId,
      productSlug: b.productSlug,
      name: `${b.productName} — ${b.variantName}`,
      price: b.finalPrice,
      image: b.image,
    });
    trackAddToCart({ item_id: b.variantId, item_name: b.productName, price: b.finalPrice, quantity: 1 });
    setAdded(b.variantId);
    setTimeout(() => setAdded(null), 1200);
  }

  return (
    <section className="border-t border-border px-4 pb-4 pt-4">
      <h3 className="text-center text-sm font-semibold">{data?.title}</h3>
      <div className="-mx-4 mt-3 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {list.map((b) => {
          const done = added === b.variantId;
          return (
            <div
              key={b.variantId}
              className={`flex shrink-0 snap-center items-start gap-3 rounded-2xl bg-muted/60 p-2.5 shadow-sm ${list.length > 1 ? "w-[90%]" : "w-full"}`}
            >
              <Link href={`/produk/${b.productSlug}?varian=${b.variantId}`} onClick={onNavigate} className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-background">
                <Image src={b.image} alt="" fill sizes="56px" className="object-contain p-1" />
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/produk/${b.productSlug}?varian=${b.variantId}`} onClick={onNavigate} className="line-clamp-2 text-sm font-semibold leading-snug hover:underline">
                  {b.productName}
                </Link>
                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{b.variantName}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="shrink-0 whitespace-nowrap leading-tight">
                    {b.finalPrice < b.price && <span className="block text-[11px] text-muted-foreground line-through">{formatRupiah(b.price)}</span>}
                    <span className="text-sm font-bold">{formatRupiah(b.finalPrice)}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => add(b)}
                    disabled={done}
                    aria-label={`Tambah ${b.productName} ${b.variantName} ke keranjang`}
                    className="inline-flex h-[42px] min-w-[42px] shrink-0 items-center justify-center gap-0.5 rounded-xl border border-border bg-background px-2.5 text-sm font-semibold transition-colors hover:border-foreground disabled:border-emerald-600 disabled:text-emerald-700"
                  >
                    {done ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
                    {/* Label di layar ≥640px (drawer lebar); HP → ikon saja agar harga tak terpotong */}
                    <span className="hidden sm:inline">{done ? "Masuk" : "Tambah"}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
