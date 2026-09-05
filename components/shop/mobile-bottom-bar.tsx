"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, ShoppingBag, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/components/shop/cart-provider";
import { useStoreUI } from "@/components/shop/store-ui-provider";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

const baseCls =
  "flex h-16 w-full flex-col items-center justify-center gap-1 text-xs transition-colors";

export function MobileBottomBar() {
  const pathname = usePathname();
  const { count } = useCart();
  const { openCart, openLogin, authed } = useStoreUI();

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4 pb-[env(safe-area-inset-bottom)]">
        <li>
          <Link
            href="/"
            aria-current={isActive(pathname, "/") ? "page" : undefined}
            className={cn(baseCls, isActive(pathname, "/") ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            <Home className="size-5" /> Beranda
          </Link>
        </li>
        <li>
          <Link
            href="/produk"
            aria-current={isActive(pathname, "/produk") ? "page" : undefined}
            className={cn(baseCls, isActive(pathname, "/produk") ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            <LayoutGrid className="size-5" /> Kategori
          </Link>
        </li>
        <li>
          <button type="button" onClick={openCart} className={cn(baseCls, "relative text-muted-foreground hover:text-foreground")}>
            <span className="relative">
              <ShoppingBag className="size-5" />
              {count > 0 && (
                <span className="absolute -right-2 -top-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </span>
            Keranjang
          </button>
        </li>
        <li>
          {authed ? (
            <Link
              href="/akun"
              aria-current={isActive(pathname, "/akun") ? "page" : undefined}
              className={cn(baseCls, isActive(pathname, "/akun") ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <User className="size-5" /> Akun
            </Link>
          ) : (
            <button type="button" onClick={openLogin} className={cn(baseCls, "text-muted-foreground hover:text-foreground")}>
              <User className="size-5" /> Akun
            </button>
          )}
        </li>
      </ul>
    </nav>
  );
}
