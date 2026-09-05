"use client";

import { useEffect, useMemo, useState } from "react";
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
  color: string;
  type: string;
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

const NO_COLOR = "Lainnya";
const colorKey = (v: PdpVariant) => v.color.trim() || NO_COLOR;
const typeLabel = (v: PdpVariant) => v.type.trim() || v.name;

export function PdpView({ product }: { product: PdpProduct }) {
  const { addItem } = useCart();

  const firstInStock =
    product.variants.find((v) => v.stock > 0) ?? product.variants[0];
  const [variantId, setVariantId] = useState(firstInStock?.id);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  // Dimensi warna aktif hanya jika ada varian yang punya warna terisi.
  const hasColorDim = useMemo(
    () => product.variants.some((v) => v.color.trim() !== ""),
    [product.variants],
  );

  // Daftar warna unik (urut kemunculan), tiap warna punya 1 gambar wakil.
  const colors = useMemo(() => {
    if (!hasColorDim) return [] as { name: string; rep: PdpVariant; inStock: boolean }[];
    const seen = new Map<string, PdpVariant>();
    for (const v of product.variants) {
      const k = colorKey(v);
      if (!seen.has(k)) seen.set(k, v);
    }
    return Array.from(seen.entries()).map(([name, rep]) => ({
      name,
      rep,
      inStock: product.variants.some((v) => colorKey(v) === name && v.stock > 0),
    }));
  }, [product.variants, hasColorDim]);

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

  const selectedColor = colorKey(variant);
  // Level 2: tipe yang tersedia dalam warna terpilih (atau semua varian bila tanpa warna).
  const typeOptions = hasColorDim
    ? product.variants.filter((v) => colorKey(v) === selectedColor)
    : product.variants;

  const finalPrice = applyDiscount(variant.price, product.discountPercent);
  const hasDiscount = product.discountPercent > 0;
  const outOfStock = variant.stock <= 0;
  const maxQty = Math.max(1, variant.stock);

  function selectVariant(v: PdpVariant) {
    setVariantId(v.id);
    setQty(1);
    setAdded(false);
  }

  // Pilih warna → lompat ke tipe pertama yang ready-stok pada warna itu.
  function selectColor(name: string) {
    const inColor = product.variants.filter((v) => colorKey(v) === name);
    const target = inColor.find((v) => v.stock > 0) ?? inColor[0];
    if (target) selectVariant(target);
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

  // Thumbnail galeri: 1 per warna (bila ada dimensi warna), else 1 per varian.
  const galleryItems = hasColorDim
    ? colors.map((c) => ({ id: c.rep.id, image: c.rep.image, label: c.name }))
    : product.variants.map((v) => ({ id: v.id, image: v.image, label: v.name }));

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-10">
      {/* ============ GALERI ============ */}
      <div className="flex gap-3">
        {/* Thumbnail vertikal (desktop) */}
        {galleryItems.length > 1 && (
          <div className="hidden w-16 shrink-0 flex-col gap-3 sm:flex">
            {galleryItems.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() =>
                  hasColorDim ? selectColor(g.label) : selectVariant(product.variants.find((v) => v.id === g.id)!)
                }
                aria-label={g.label}
                aria-pressed={
                  hasColorDim ? g.label === selectedColor : g.id === variant.id
                }
                className={cn(
                  "relative aspect-square w-full overflow-hidden rounded-lg border-2 bg-muted transition-colors",
                  (hasColorDim ? g.label === selectedColor : g.id === variant.id)
                    ? "border-foreground"
                    : "border-transparent hover:border-border",
                )}
              >
                <Image src={g.image} alt={g.label} fill sizes="64px" className="object-cover" />
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
      {galleryItems.length > 1 && (
        <div className="-mt-2 flex gap-2 sm:hidden">
          {galleryItems.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() =>
                hasColorDim ? selectColor(g.label) : selectVariant(product.variants.find((v) => v.id === g.id)!)
              }
              aria-label={g.label}
              className={cn(
                "relative size-14 shrink-0 overflow-hidden rounded-md border-2 bg-muted",
                (hasColorDim ? g.label === selectedColor : g.id === variant.id)
                  ? "border-foreground"
                  : "border-transparent",
              )}
            >
              <Image src={g.image} alt={g.label} fill sizes="56px" className="object-cover" />
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

        {/* ===== Selector varian (label kiri · pil kanan, ala referensi) ===== */}
        <div className="mt-6 space-y-4">
          {/* Level 1: WARNA — pil dengan foto kecil + teks */}
          {hasColorDim && (
            <div className="flex items-start gap-4">
              <span className="w-14 shrink-0 pt-2 text-sm text-muted-foreground">Warna</span>
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => {
                  const selected = c.name === selectedColor;
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => selectColor(c.name)}
                      aria-pressed={selected}
                      aria-label={c.name}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm transition-colors",
                        selected
                          ? "border-primary bg-primary/5 font-medium text-primary ring-1 ring-primary"
                          : "border-border hover:border-foreground",
                        !c.inStock && "opacity-50",
                      )}
                    >
                      <span className="relative size-6 shrink-0 overflow-hidden rounded bg-muted">
                        <Image src={c.rep.image} alt={c.name} fill sizes="24px" className="object-cover" />
                      </span>
                      <span className={cn(!c.inStock && "line-through")}>{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Level 2: TIPE — pil teks */}
          <div className="flex items-start gap-4">
            <span className="w-14 shrink-0 pt-2 text-sm text-muted-foreground">Tipe</span>
            <div className="flex flex-wrap gap-2">
              {typeOptions.map((v) => {
                const disabled = v.stock <= 0;
                const selected = v.id === variant.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => selectVariant(v)}
                    aria-pressed={selected}
                    disabled={disabled}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                      selected
                        ? "border-primary bg-primary/5 font-medium text-primary ring-1 ring-primary"
                        : "border-border hover:border-foreground",
                      disabled && "cursor-not-allowed border-dashed text-muted-foreground line-through opacity-60 hover:border-border",
                    )}
                  >
                    {typeLabel(v)}
                  </button>
                );
              })}
            </div>
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
              <p className="font-medium text-foreground">Varian tersedia:</p>
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
