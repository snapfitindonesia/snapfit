"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Check, Minus, Plus, ShoppingBag, Star, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRupiah, applyDiscount } from "@/lib/format";
import { useCart } from "@/components/shop/cart-provider";
import { trackViewItem, trackAddToCart } from "@/lib/tracking";

export type PdpVariant = {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  image: string;
};

export type PdpProduct = {
  slug: string;
  name: string;
  description: string | null;
  coverImage: string;
  categoryName: string | null;
  discountPercent: number;
  variants: PdpVariant[];
};

export function PdpView({ product }: { product: PdpProduct }) {
  const { addItem } = useCart();

  const firstInStock =
    product.variants.find((v) => v.stock > 0) ?? product.variants[0];
  const [variantId, setVariantId] = useState(firstInStock?.id);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!firstInStock) return;
    trackViewItem({
      item_id: firstInStock.id,
      item_name: product.name,
      price: applyDiscount(firstInStock.price, product.discountPercent),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.slug]);

  const variant =
    product.variants.find((v) => v.id === variantId) ?? firstInStock;

  if (!variant) {
    return <p className="text-muted-foreground">Produk belum punya varian.</p>;
  }

  const finalPrice = applyDiscount(variant.price, product.discountPercent);
  const hasDiscount = product.discountPercent > 0;
  const outOfStock = variant.stock <= 0;
  const maxQty = Math.max(1, variant.stock);

  function selectVariant(v: PdpVariant) {
    setVariantId(v.id);
    setQty(1);
    setAdded(false);
  }

  function handleAdd() {
    if (outOfStock) return;
    addItem(
      {
        variantId: variant!.id,
        productSlug: product.slug,
        name: `${product.name} — ${variant!.name}`,
        price: finalPrice,
        image: variant!.image,
      },
      qty,
    );
    trackAddToCart({
      item_id: variant!.id,
      item_name: `${product.name} — ${variant!.name}`,
      price: finalPrice,
      quantity: qty,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  const addBtnLabel = added ? (
    <>
      <Check className="size-4" /> Ditambahkan
    </>
  ) : (
    <>
      <ShoppingBag className="size-4" /> Tambah ke Keranjang
    </>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-10">
      {/* ============ GALERI ============ */}
      <div className="flex gap-3">
        {/* Thumbnail vertikal (desktop) */}
        {product.variants.length > 1 && (
          <div className="hidden w-16 shrink-0 flex-col gap-3 sm:flex">
            {product.variants.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => selectVariant(v)}
                aria-label={v.name}
                aria-pressed={v.id === variant.id}
                className={cn(
                  "relative aspect-square w-full overflow-hidden rounded-lg border-2 bg-muted transition-colors",
                  v.id === variant.id ? "border-foreground" : "border-transparent hover:border-border",
                )}
              >
                <Image src={v.image} alt={v.name} fill sizes="64px" className="object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Gambar utama */}
        <div className="relative aspect-square flex-1 overflow-hidden rounded-2xl bg-muted">
          <Image
            key={variant.id}
            src={variant.image}
            alt={`${product.name} — ${variant.name}`}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 55vw"
            className="object-cover"
          />
          {hasDiscount && (
            <span className="absolute left-4 top-4 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
              -{product.discountPercent}%
            </span>
          )}
        </div>
      </div>

      {/* Thumbnail baris (mobile) */}
      {product.variants.length > 1 && (
        <div className="-mt-2 flex gap-2 sm:hidden">
          {product.variants.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => selectVariant(v)}
              aria-label={v.name}
              className={cn(
                "relative size-14 shrink-0 overflow-hidden rounded-md border-2 bg-muted",
                v.id === variant.id ? "border-foreground" : "border-transparent",
              )}
            >
              <Image src={v.image} alt={v.name} fill sizes="56px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* ============ KARTU INFO (mengambang) ============ */}
      <div className="rounded-2xl bg-background p-6 shadow-sm ring-1 ring-border/60 sm:p-8">
        {/* Rating */}
        <div className="flex items-center gap-2">
          <div className="flex text-foreground">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="size-4 fill-current" />
            ))}
          </div>
          <a href="#ulasan" className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground">
            Ulasan
          </a>
        </div>

        {/* Judul */}
        {product.categoryName && (
          <p className="mt-3 text-sm text-muted-foreground">{product.categoryName}</p>
        )}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-[28px] sm:leading-tight">
          {product.name}
        </h1>

        {/* Harga (baris sendiri) */}
        <div className="mt-3 flex items-baseline gap-3">
          <span className="text-2xl font-bold sm:text-3xl">
            {formatRupiah(finalPrice)}
          </span>
          {hasDiscount && (
            <span className="text-base text-muted-foreground line-through">
              {formatRupiah(variant.price)}
            </span>
          )}
        </div>

        {product.description && (
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {product.description}
          </p>
        )}

        {/* Swatch varian (foto + nama, ala pilihan warna Nomad) */}
        <div className="mt-6">
          <p className="text-sm font-medium">
            Tipe: <span className="text-muted-foreground">{variant.name}</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {product.variants.map((v) => {
              const disabled = v.stock <= 0;
              const selected = v.id === variant.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => selectVariant(v)}
                  aria-pressed={selected}
                  aria-label={v.name}
                  className="flex w-16 flex-col items-center gap-1 text-center"
                >
                  <span
                    className={cn(
                      "relative aspect-square w-full overflow-hidden rounded-lg border-2 bg-muted transition-colors",
                      selected ? "border-foreground" : "border-border",
                      disabled && "opacity-40",
                    )}
                  >
                    <Image src={v.image} alt={v.name} fill sizes="64px" className="object-cover" />
                  </span>
                  <span
                    className={cn(
                      "line-clamp-2 text-[11px] leading-tight",
                      selected ? "font-medium text-foreground" : "text-muted-foreground",
                      disabled && "line-through",
                    )}
                  >
                    {v.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Qty */}
        <div className="mt-6 flex items-center gap-4">
          <span className="text-sm font-medium">Jumlah</span>
          <div className="flex items-center rounded-md border border-border">
            <button
              type="button"
              aria-label="Kurangi"
              className="grid size-9 place-items-center disabled:opacity-40"
              disabled={qty <= 1}
              onClick={() => setQty((q) => Math.max(1, q - 1))}
            >
              <Minus className="size-4" />
            </button>
            <span className="w-8 text-center text-sm tabular-nums">{qty}</span>
            <button
              type="button"
              aria-label="Tambah"
              className="grid size-9 place-items-center disabled:opacity-40"
              disabled={qty >= maxQty || outOfStock}
              onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
            >
              <Plus className="size-4" />
            </button>
          </div>
          <span className="text-xs text-muted-foreground">
            {outOfStock ? "Stok habis" : `Stok ${variant.stock}`}
          </span>
        </div>

        {/* Add to cart (desktop; mobile pakai sticky bar) */}
        <Button
          size="lg"
          className="mt-6 hidden w-full md:flex"
          disabled={outOfStock}
          onClick={handleAdd}
        >
          {outOfStock ? "Stok habis" : addBtnLabel}
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Garansi Resmi · 100% Original · 7 Hari Pengembalian
        </p>

        {/* Accordion Overview / More Info (di dalam kartu, ala Nomad) */}
        <div className="mt-6 divide-y divide-border border-t border-border">
          <details className="group" open>
            <summary className="flex cursor-pointer list-none items-center justify-between py-3 text-sm font-medium">
              Overview
              <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="pb-3 text-sm text-muted-foreground">
              <p>{product.description || "Aksesori premium dari SnapFit."}</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>Garansi resmi & 100% original</li>
                <li>Material berkualitas, tahan pakai</li>
                <li>7 hari pengembalian bila tidak sesuai</li>
              </ul>
            </div>
          </details>
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between py-3 text-sm font-medium">
              More Info
              <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="pb-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Tipe tersedia:</p>
              <p className="mt-1">{product.variants.map((v) => v.name).join(" · ")}</p>
              <p className="mt-3">
                Dikirim via kurir pilihanmu (cek ongkir di checkout). Estimasi 1–3 hari
                untuk area umum.
              </p>
            </div>
          </details>
        </div>
      </div>

      {/* Sticky add-to-cart bar (mobile) — di atas bottom nav */}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-y border-border bg-background/95 p-3 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs text-muted-foreground">{variant.name}</p>
            <p className="text-sm font-semibold">{formatRupiah(finalPrice)}</p>
          </div>
          <Button
            className="ml-auto max-w-[60%] flex-1"
            disabled={outOfStock}
            onClick={handleAdd}
          >
            {outOfStock ? (
              "Habis"
            ) : added ? (
              <>
                <Check className="size-4" /> Ditambahkan
              </>
            ) : (
              <>
                <ShoppingBag className="size-4" /> Tambah
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
