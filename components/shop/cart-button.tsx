"use client";

import { useEffect, useRef, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCart } from "@/components/shop/cart-provider";
import { useStoreUI } from "@/components/shop/store-ui-provider";

export function CartButton() {
  const { count } = useCart();
  const { openCart } = useStoreUI();

  // Pulse badge saat jumlah bertambah (umpan-balik "masuk keranjang").
  const [pulse, setPulse] = useState(false);
  const prev = useRef(count);
  useEffect(() => {
    if (count > prev.current) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 500);
      prev.current = count;
      return () => clearTimeout(t);
    }
    prev.current = count;
  }, [count]);

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Keranjang${count ? `, ${count} item` : ""}`}
      className="relative"
      onClick={openCart}
    >
      <ShoppingBag className="size-5" />
      {count > 0 && (
        <span
          className={cn(
            "absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground transition-transform",
            pulse && "scale-125",
          )}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Button>
  );
}
