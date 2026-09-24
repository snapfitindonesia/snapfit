"use client";

import { useRouter } from "next/navigation";
import { ShoppingBag, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/shop/cart-provider";
import { useStoreUI } from "@/components/shop/store-ui-provider";
import { trackAddToCart } from "@/lib/tracking";
import type { ProductListItem } from "@/lib/actions/product";

/**
 * Tombol add-to-cart di kartu produk.
 * - Stok habis → nonaktif.
 * - 1 varian → langsung masuk keranjang + buka drawer.
 * - >1 varian → arahkan ke halaman produk untuk memilih opsi.
 */
export function AddToCartButton({ product }: { product: ProductListItem }) {
  const router = useRouter();
  const { addItem } = useCart();
  const { openCart } = useStoreUI();
  const [added, setAdded] = useState(false);

  if (!product.inStock || !product.defaultVariant) {
    return (
      <Button size="sm" variant="outline" className="mt-2 w-full" disabled>
        Stok habis
      </Button>
    );
  }

  const multiVariant = product.variantCount > 1;

  function onClick() {
    if (multiVariant) {
      router.push(`/produk/${product.slug}`);
      return;
    }
    const v = product.defaultVariant!;
    addItem({
      variantId: v.id,
      productSlug: product.slug,
      name: `${product.name} — ${v.name}`,
      price: v.price,
      image: v.image,
    });
    trackAddToCart({ item_id: v.id, item_name: product.name, price: v.price, quantity: 1 });
    setAdded(true);
    openCart();
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <Button size="sm" variant="outline" className="mt-2 w-full" onClick={onClick}>
      {added ? (
        <><Check className="size-4" /> Ditambahkan</>
      ) : (
        <><ShoppingBag className="size-4" /> {multiVariant ? "Pilih Opsi" : "Keranjang"}</>
      )}
    </Button>
  );
}
