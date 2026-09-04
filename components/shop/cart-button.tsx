"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/shop/cart-provider";

export function CartButton() {
  const { count } = useCart();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Keranjang${count ? `, ${count} item` : ""}`}
      className="relative"
      asChild
    >
      <Link href="/keranjang">
        <ShoppingBag className="size-5" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Link>
    </Button>
  );
}
