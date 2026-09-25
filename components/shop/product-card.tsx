import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { formatRupiah } from "@/lib/format";
import type { ProductListItem } from "@/lib/actions/product";
import { AddToCartButton } from "@/components/shop/add-to-cart-button";

export function ProductCard({ product }: { product: ProductListItem }) {
  const hasDiscount = product.discountPercent > 0;

  return (
    <div className="group flex flex-col animate-in fade-in slide-in-from-bottom-3 duration-500">
      <Link href={`/produk/${product.slug}`} className="block">
      <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-muted">
        <Image
          src={product.coverImage}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-contain p-3 transition-transform duration-300 group-hover:scale-105"
        />
        {product.brand && (
          <span className="absolute left-3 top-3 z-10 rounded-lg bg-neutral-800 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
            {product.brand}
          </span>
        )}
        {hasDiscount && (
          <span className="absolute right-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
            -{product.discountPercent}%
          </span>
        )}
        {!product.inStock && (
          <span className="absolute inset-x-0 bottom-0 bg-background/80 py-1 text-center text-xs font-medium">
            Stok habis
          </span>
        )}
      </div>

      <div className="mt-3 space-y-1">
        {product.categoryName && (
          <p className="text-xs text-muted-foreground">{product.categoryName}</p>
        )}
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">
          {product.name}
        </h3>
        {product.ratingCount > 0 && (
          <div className="flex items-center gap-1">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className={`size-3.5 ${n <= Math.round(product.ratingAvg) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">({product.ratingCount})</span>
          </div>
        )}
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold">
            {formatRupiah(product.finalPrice)}
          </span>
          {hasDiscount && (
            <span className="text-xs text-muted-foreground line-through">
              {formatRupiah(product.minPrice)}
            </span>
          )}
        </div>
      </div>
      </Link>
      <AddToCartButton product={product} />
    </div>
  );
}
