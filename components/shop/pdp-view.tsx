"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
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

  // Default: varian pertama yang ada stok, jika tak ada pakai varian pertama
  const firstInStock =
    product.variants.find((v) => v.stock > 0) ?? product.variants[0];
  const [variantId, setVariantId] = useState(firstInStock?.id);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  // view_item sekali saat buka PDP (docs/08)
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
    // Optimistic: badge keranjang naik seketika via context (lihat cart-provider).
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

  return (
    <div className="grid gap-8 md:grid-cols-2 md:gap-12">
      {/* Galeri — foto ganti mengikuti varian terpilih */}
      <div>
        <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-border bg-muted">
          <Image
            key={variant.id}
            src={variant.image}
            alt={`${product.name} — ${variant.name}`}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
          {hasDiscount && (
            <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
              -{product.discountPercent}%
            </span>
          )}
        </div>

        {product.variants.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {product.variants.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => selectVariant(v)}
                aria-label={v.name}
                aria-pressed={v.id === variant.id}
                className={cn(
                  "relative size-16 overflow-hidden rounded-md border-2 transition-colors",
                  v.id === variant.id ? "border-foreground" : "border-border",
                )}
              >
                <Image
                  src={v.image}
                  alt={v.name}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info + selektor + add to cart */}
      <div className="flex flex-col">
        {product.categoryName && (
          <p className="text-sm text-muted-foreground">{product.categoryName}</p>
        )}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          {product.name}
        </h1>

        <div className="mt-4 flex items-baseline gap-3">
          <span className="text-2xl font-semibold">
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

        {/* VariantPicker */}
        <div className="mt-6">
          <p className="text-sm font-medium">
            Pilih tipe:{" "}
            <span className="text-muted-foreground">{variant.name}</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {product.variants.map((v) => {
              const disabled = v.stock <= 0;
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => selectVariant(v)}
                  aria-pressed={v.id === variant.id}
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm transition-colors",
                    v.id === variant.id
                      ? "border-foreground bg-foreground text-background"
                      : "border-border hover:border-foreground",
                    disabled &&
                      "cursor-not-allowed opacity-40 line-through hover:border-border",
                  )}
                >
                  {v.name}
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

        {/* Add to cart — desktop/tablet inline; mobile ada sticky bar di bawah */}
        <div className="mt-8 hidden md:block">
          <Button
            size="lg"
            className="w-full"
            disabled={outOfStock}
            onClick={handleAdd}
          >
            {added ? (
              <>
                <Check className="size-4" /> Ditambahkan
              </>
            ) : (
              <>
                <ShoppingBag className="size-4" /> Tambah ke Keranjang
              </>
            )}
          </Button>
        </div>

      </div>

      {/* Sticky add-to-cart bar khusus mobile — duduk DI ATAS bottom nav global
          (lihat 02-design-system.md). */}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-y border-border bg-background/95 p-3 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs text-muted-foreground">
              {variant.name}
            </p>
            <p className="text-sm font-semibold">{formatRupiah(finalPrice)}</p>
          </div>
          <Button
            className="ml-auto flex-1 max-w-[60%]"
            disabled={outOfStock}
            onClick={handleAdd}
          >
            {added ? (
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
