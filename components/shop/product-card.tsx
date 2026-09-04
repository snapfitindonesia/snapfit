import Image from "next/image";
import Link from "next/link";
import { formatRupiah } from "@/lib/format";
import type { ProductListItem } from "@/lib/actions/product";

export function ProductCard({ product }: { product: ProductListItem }) {
  const hasDiscount = product.discountPercent > 0;

  return (
    <Link href={`/produk/${product.slug}`} className="group block">
      <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-muted">
        <Image
          src={product.coverImage}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {hasDiscount && (
          <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
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
  );
}
