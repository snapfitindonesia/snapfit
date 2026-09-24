"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Check,
  Minus,
  Plus,
  ShoppingBag,
  Star,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  X,
  Ticket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRupiah, applyDiscount } from "@/lib/format";
import { useCart } from "@/components/shop/cart-provider";
import { useStoreUI } from "@/components/shop/store-ui-provider";
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
  discountPercent: number;
};

export type PdpProduct = {
  slug: string;
  name: string;
  description: string | null;
  coverImage: string;
  categoryName: string | null;
  discountPercent: number;
  group1Name: string | null;
  group2Name: string | null;
  gallery: string[];
  variants: PdpVariant[];
};

export type VoucherChip = { code: string; label: string; minPurchase: number };

const NO_COLOR = "Lainnya";
const colorKey = (v: PdpVariant) => v.color.trim() || NO_COLOR;
const typeLabel = (v: PdpVariant) => v.type.trim() || v.name;

export function PdpView({ product, vouchers = [] }: { product: PdpProduct; vouchers?: VoucherChip[] }) {
  const { addItem } = useCart();
  const { openCart } = useStoreUI();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  function copyVoucher(code: string) {
    try {
      navigator.clipboard?.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode((c) => (c === code ? null : c)), 1500);
    } catch {
      // abaikan bila clipboard tak tersedia
    }
  }
  const router = useRouter();

  const firstInStock =
    product.variants.find((v) => v.stock > 0) ?? product.variants[0];
  const [variantId, setVariantId] = useState(firstInStock?.id);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  // Foto yang sedang dilihat (override galeri). Default = cover produk (tampil
  // pertama); jadi null saat ganti varian → ikut foto varian terpilih.
  const [heroImage, setHeroImage] = useState<string | null>(product.coverImage || null);
  const [lightbox, setLightbox] = useState(false); // mode zoom layar penuh
  const [zoomed, setZoomed] = useState(false);
  const [drag, setDrag] = useState(0); // offset px saat menyeret gambar utama
  const dragRef = useRef({ startX: 0, active: false, moved: false });
  const touchX = useRef<number | null>(null);
  const navRef = useRef<{ prev: () => void; next: () => void }>({ prev: () => {}, next: () => {} });

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
      price: applyDiscount(firstInStock.price, firstInStock.discountPercent),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.slug]);

  // Lightbox: kunci scroll + navigasi keyboard (panah / Esc).
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightbox(false);
        setZoomed(false);
      } else if (e.key === "ArrowLeft") navRef.current.prev();
      else if (e.key === "ArrowRight") navRef.current.next();
    };
    window.addEventListener("keydown", onKey);
    const prevOv = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOv;
    };
  }, [lightbox]);

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

  const finalPrice = applyDiscount(variant.price, variant.discountPercent);
  const hasDiscount = variant.discountPercent > 0;
  const outOfStock = variant.stock <= 0;
  const maxQty = Math.max(1, variant.stock);

  function selectVariant(v: PdpVariant) {
    setVariantId(v.id);
    setQty(1);
    setAdded(false);
    setHeroImage(null); // kembali ke foto varian saat ganti pilihan
  }

  // Pilih warna → lompat ke tipe pertama yang ready-stok pada warna itu.
  function selectColor(name: string) {
    const inColor = product.variants.filter((v) => colorKey(v) === name);
    const target = inColor.find((v) => v.stock > 0) ?? inColor[0];
    if (target) selectVariant(target);
  }

  function addToCart() {
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
  }

  function handleAdd() {
    if (outOfStock) return;
    addToCart();
    setAdded(true);
    openCart(); // buka floating cart = umpan-balik jelas "masuk keranjang"
    setTimeout(() => setAdded(false), 1800);
  }

  function handleBuyNow() {
    if (outOfStock) return;
    addToCart();
    router.push("/checkout");
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

  // Galeri foto (lihat-saja): foto varian terpilih + foto fitur produk (dedupe).
  const baseUrl = (u: string) => u.split("?")[0];
  const photos: string[] = [];
  // Cover produk tampil PERTAMA, lalu foto varian terpilih, lalu galeri.
  for (const src of [product.coverImage, variant.image, ...product.gallery]) {
    if (src && !photos.some((p) => baseUrl(p) === baseUrl(src))) photos.push(src);
  }
  const displayImage = heroImage ?? variant.image;

  // Navigasi antar foto (slide) — dipakai panah + swipe + lightbox.
  const photoIndex = Math.max(0, photos.findIndex((p) => baseUrl(p) === baseUrl(displayImage)));
  const goTo = (i: number) => setHeroImage(photos[(i + photos.length) % photos.length]);
  const goPrev = () => goTo(photoIndex - 1);
  const goNext = () => goTo(photoIndex + 1);
  navRef.current = { prev: goPrev, next: goNext };

  // Drag gambar utama (mouse + sentuh) — gambar mengikuti seretan, snap saat dilepas.
  const onDragStart = (e: React.PointerEvent) => {
    dragRef.current = { startX: e.clientX, active: true, moved: false };
  };
  const onDragMove = (e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    if (Math.abs(dx) > 5) dragRef.current.moved = true;
    setDrag(dx);
  };
  const onDragEnd = (e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    dragRef.current.active = false;
    setDrag(0);
    if (photos.length > 1) {
      if (dx <= -50) goNext();
      else if (dx >= 50) goPrev();
    }
  };

  // Swipe lightbox (sentuh) — tetap pakai touch sederhana.
  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 40) (dx < 0 ? goNext : goPrev)();
    touchX.current = null;
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-10">
      {/* ============ GALERI ============ */}
      <div className="flex gap-3">
        {/* Thumbnail vertikal (desktop) */}
        {photos.length > 1 && (
          <div className="hidden max-h-[540px] w-16 shrink-0 flex-col gap-3 overflow-y-auto [scrollbar-width:none] sm:flex [&::-webkit-scrollbar]:hidden">
            {photos.map((src) => {
              const active = baseUrl(src) === baseUrl(displayImage);
              return (
                <button
                  key={src}
                  type="button"
                  onClick={() => setHeroImage(src)}
                  aria-label="Lihat foto"
                  aria-pressed={active}
                  className={cn(
                    "relative aspect-square w-full shrink-0 overflow-hidden rounded-lg border-2 bg-muted transition-colors",
                    active ? "border-foreground" : "border-transparent hover:border-border",
                  )}
                >
                  <Image src={src} alt="" fill sizes="64px" className="object-cover" />
                </button>
              );
            })}
          </div>
        )}

        {/* Gambar utama (seret = geser, klik = zoom) */}
        <div
          className="group relative aspect-square flex-1 touch-pan-y select-none overflow-hidden rounded-2xl bg-muted"
          style={{ cursor: dragRef.current.active ? "grabbing" : "grab" }}
          onClick={() => {
            if (!dragRef.current.moved) setLightbox(true);
          }}
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerLeave={onDragEnd}
        >
          {/* Track geser: semua foto berjajar, mengikuti seretan lalu snap */}
          <div
            className={cn(
              "flex h-full w-full ease-out",
              !dragRef.current.active && "transition-transform duration-300",
            )}
            style={{ transform: `translateX(calc(-${photoIndex * 100}% + ${drag}px))` }}
          >
            {photos.map((src, i) => (
              <div key={src} className="relative h-full w-full shrink-0">
                <Image
                  src={src}
                  alt={`${product.name} — ${variant.name}`}
                  fill
                  draggable={false}
                  sizes="(max-width: 1024px) 100vw, 55vw"
                  className="object-cover"
                  {...(i === 0 ? { priority: true } : { loading: "eager" as const })}
                />
              </div>
            ))}
          </div>
          {hasDiscount && (
            <span className="absolute left-4 top-4 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
              -{product.discountPercent}%
            </span>
          )}
          <span className="pointer-events-none absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-background/80 text-foreground shadow-sm backdrop-blur transition-opacity">
            <ZoomIn className="size-4" />
          </span>

          {/* Panah slide (desktop) */}
          {photos.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Foto sebelumnya"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                className="absolute left-2 top-1/2 hidden -translate-y-1/2 place-items-center rounded-full bg-background/80 p-1.5 text-foreground opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100 sm:grid"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                aria-label="Foto berikutnya"
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                className="absolute right-2 top-1/2 hidden -translate-y-1/2 place-items-center rounded-full bg-background/80 p-1.5 text-foreground opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100 sm:grid"
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Thumbnail baris (mobile) */}
      {photos.length > 1 && (
        <div className="-mt-2 flex gap-2 overflow-x-auto [scrollbar-width:none] sm:hidden [&::-webkit-scrollbar]:hidden">
          {photos.map((src) => {
            const active = baseUrl(src) === baseUrl(displayImage);
            return (
              <button
                key={src}
                type="button"
                onClick={() => setHeroImage(src)}
                aria-label="Lihat foto"
                className={cn(
                  "relative size-14 shrink-0 overflow-hidden rounded-md border-2 bg-muted",
                  active ? "border-foreground" : "border-transparent",
                )}
              >
                <Image src={src} alt="" fill sizes="56px" className="object-cover" />
              </button>
            );
          })}
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

        {/* Voucher tersedia */}
        {vouchers.length > 0 && (
          <div className="mt-4">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <Ticket className="size-4 text-brand" /> Voucher tersedia
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {vouchers.map((v) => (
                <button
                  key={v.code}
                  type="button"
                  onClick={() => copyVoucher(v.code)}
                  title={`Salin kode ${v.code}${v.minPurchase > 0 ? ` · min. ${formatRupiah(v.minPurchase)}` : ""}`}
                  className="group flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/5 px-3 py-1 text-xs font-medium text-brand transition-colors hover:bg-brand/10"
                >
                  {copiedCode === v.code ? <Check className="size-3.5" /> : <Ticket className="size-3.5" />}
                  {copiedCode === v.code ? "Kode disalin" : v.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {product.description && (
          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {product.description}
          </p>
        )}

        {/* ===== Selector varian (label kiri · pil kanan, ala referensi) ===== */}
        <div className="mt-6 space-y-4">
          {/* Level 1: WARNA — pil dengan foto kecil + teks */}
          {hasColorDim && (
            <div className="flex items-start gap-4">
              <span className="w-14 shrink-0 pt-2 text-sm text-muted-foreground">{product.group1Name || "Warna"}</span>
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
            <span className="w-14 shrink-0 pt-2 text-sm text-muted-foreground">{(hasColorDim ? product.group2Name : product.group1Name) || "Tipe"}</span>
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

        {/* Add to cart + Beli Langsung (desktop; mobile pakai sticky bar) */}
        <div className="mt-6 hidden gap-3 md:flex">
          <Button
            size="lg"
            variant="outline"
            className="flex-1"
            disabled={outOfStock}
            onClick={handleAdd}
          >
            {outOfStock ? "Stok habis" : addBtnLabel}
          </Button>
          <Button
            size="lg"
            className="flex-1"
            disabled={outOfStock}
            onClick={handleBuyNow}
          >
            Beli Langsung
          </Button>
        </div>
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
              <ul className="list-inside list-disc space-y-1">
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
        <div className="mx-auto flex max-w-6xl items-center gap-2">
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            disabled={outOfStock}
            onClick={handleAdd}
          >
            {added ? (
              <>
                <Check className="size-4" /> Ditambahkan
              </>
            ) : (
              <>
                <ShoppingBag className="size-4" /> Keranjang
              </>
            )}
          </Button>
          <Button
            size="lg"
            className="flex-1"
            disabled={outOfStock}
            onClick={handleBuyNow}
          >
            {outOfStock ? "Stok habis" : "Beli Langsung"}
          </Button>
        </div>
      </div>

      {/* Lightbox zoom foto (klik gambar utama) */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 animate-in fade-in duration-200"
          onClick={() => {
            setLightbox(false);
            setZoomed(false);
          }}
        >
          <button
            type="button"
            aria-label="Tutup"
            className="absolute right-4 top-4 z-10 grid size-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox(false);
              setZoomed(false);
            }}
          >
            <X className="size-5" />
          </button>

          {photos.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Foto sebelumnya"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                className="absolute left-3 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <ChevronLeft className="size-6" />
              </button>
              <button
                type="button"
                aria-label="Foto berikutnya"
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                className="absolute right-3 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <ChevronRight className="size-6" />
              </button>
            </>
          )}

          <div
            className="relative h-[85vh] w-[92vw] max-w-4xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {/* Track geser lightbox */}
            <div
              className="flex h-full w-full transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${photoIndex * 100}%)` }}
            >
              {photos.map((src) => (
                <div key={src} className="relative h-full w-full shrink-0">
                  <Image
                    src={src}
                    alt={`${product.name} — ${variant.name}`}
                    fill
                    loading="eager"
                    sizes="92vw"
                    className={cn(
                      "object-contain transition-transform duration-200",
                      zoomed ? "scale-150 cursor-zoom-out" : "cursor-zoom-in",
                    )}
                    onClick={() => setZoomed((z) => !z)}
                  />
                </div>
              ))}
            </div>
          </div>

          {photos.length > 1 && (
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs text-white">
              {photoIndex + 1} / {photos.length}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
