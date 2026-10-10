"use client";

import { useEffect } from "react";
import { Info, X } from "lucide-react";
import { useCart } from "@/components/shop/cart-provider";

/** Saat dibuka: samakan harga keranjang dengan harga terkini, lalu tampilkan pemberitahuan bila ada yang berubah. */
export function PriceNotice({ className = "" }: { className?: string }) {
  const { hydrated, refreshPrices, priceNotice, dismissPriceNotice } = useCart();
  useEffect(() => {
    if (hydrated) refreshPrices();
  }, [hydrated, refreshPrices]);
  if (!priceNotice) return null;
  return (
    <div role="status" className={`flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 ${className}`}>
      <Info className="mt-0.5 size-3.5 shrink-0" />
      <span className="flex-1">{priceNotice}</span>
      <button type="button" onClick={dismissPriceNotice} aria-label="Tutup" className="shrink-0 opacity-70 hover:opacity-100">
        <X className="size-3.5" />
      </button>
    </div>
  );
}
