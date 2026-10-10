"use client";

import { useEffect, useRef, useState } from "react";
import Image from "@/components/ui/image";
import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { formatRupiah } from "@/lib/format";
import { useCart } from "@/components/shop/cart-provider";
import { getCartBundlesAction } from "@/lib/actions/bundles";
import { trackAddToCart } from "@/lib/tracking";
import type { BundleItem } from "@/lib/bundles-shared";

type Data = { title: string; items: BundleItem[] };

/**
 * "Sering dibeli bersama" di drawer keranjang — varian pilihan admin (Admin → Bundle Keranjang).
 * Dimuat sekali saat keranjang pertama kali dibuka (data di-cache server). Yang sudah ada di
 * keranjang disembunyikan; lebih dari satu → geser (HP) atau tombol panah + titik (desktop).
 */
export function CartBundles({ open, onNavigate }: { open: boolean; onNavigate?: () => void }) {
  const { items, addItem } = useCart();
  const [data, setData] = useState<Data | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!open || data) return;
    getCartBundlesAction().then(setData).catch(() => setData({ title: "", items: [] }));
  }, [open, data]);

  const inCart = new Set(items.map((i) => i.variantId));
  const list = (data?.items ?? []).filter((b) => !inCart.has(b.variantId) || b.variantId === added);
  if (!list.length) return null;
  const many = list.length > 1;

  // Lebar satu langkah = lebar kartu + jarak (gap-2.5 = 10px).
  const step = () => {
    const el = scroller.current;
    const card = el?.firstElementChild as HTMLElement | null;
    return card ? card.offsetWidth + 10 : 0;
  };
  const go = (i: number) => {
    const el = scroller.current;
    const st = step();
    if (!el || !st) return;
    const target = Math.max(0, Math.min(list.length - 1, i));
    el.scrollTo({ left: target * st, behavior: "smooth" });
  };
  const onScroll = () => {
    const st = step();
    if (st) setIndex(Math.round((scroller.current?.scrollLeft ?? 0) / st));
  };
  const current = Math.min(index, list.length - 1);
  const arrow =
    "flex size-8 items-center justify-center rounded-full border border-border bg-background transition-colors hover:border-foreground disabled:pointer-events-none disabled:opacity-30";

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
      <div className="flex items-center gap-2">
        {many && (
          <button type="button" onClick={() => go(current - 1)} disabled={current === 0} aria-label="Sebelumnya" className={arrow}>
            <ChevronLeft className="size-4" />
          </button>
        )}
        <h3 className="flex-1 text-center text-sm font-semibold">{data?.title}</h3>
        {many && (
          <button type="button" onClick={() => go(current + 1)} disabled={current >= list.length - 1} aria-label="Berikutnya" className={arrow}>
            <ChevronRight className="size-4" />
          </button>
        )}
      </div>
      <div
        ref={scroller}
        onScroll={onScroll}
        className="-mx-4 mt-3 flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-px-4 px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {list.map((b) => {
          const done = added === b.variantId;
          return (
            <div
              key={b.variantId}
              className={`flex shrink-0 snap-start items-start gap-3 rounded-2xl bg-muted/60 p-2.5 shadow-sm ${many ? "w-[90%]" : "w-full"}`}
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
                    {b.finalPrice < b.price && <span className="block text-xs text-muted-foreground line-through">{formatRupiah(b.price)}</span>}
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
      {many && (
        <div className="mt-3 flex justify-center gap-1.5">
          {list.map((b, i) => (
            <button
              key={b.variantId}
              type="button"
              onClick={() => go(i)}
              aria-label={`Produk ${i + 1} dari ${list.length}`}
              aria-current={i === current}
              className="flex h-6 items-center"
            >
              <span className={`block h-1.5 rounded-full transition-all ${i === current ? "w-4 bg-foreground" : "w-1.5 bg-foreground/25"}`} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
