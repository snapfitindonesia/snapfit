"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, ShoppingBag, User } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { label: "Beranda", href: "/", icon: Home },
  { label: "Kategori", href: "/produk", icon: LayoutGrid },
  { label: "Keranjang", href: "/keranjang", icon: ShoppingBag },
  { label: "Akun", href: "/akun", icon: User },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4 pb-[env(safe-area-inset-bottom)]">
        {ITEMS.map(({ label, href, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-xs transition-colors",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("size-5", active && "stroke-[2.25]")} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
