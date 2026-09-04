import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CartButton } from "@/components/shop/cart-button";

// Nav berbasis tipe device (lihat 02-design-system.md) — data masih placeholder.
const NAV = [
  { label: "Semua", href: "/produk" },
  { label: "iPhone", href: "/produk?tipe=iphone" },
  { label: "Samsung", href: "/produk?tipe=samsung" },
  { label: "iPad & Tablet", href: "/produk?tipe=tablet" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight"
          aria-label="SnapFit — beranda"
        >
          snapfit<span className="text-muted-foreground">.</span>
        </Link>

        <nav className="hidden flex-1 items-center gap-6 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Button variant="ghost" size="icon" aria-label="Cari" asChild>
            <Link href="/produk">
              <Search className="size-5" />
            </Link>
          </Button>
          <CartButton />
        </div>
      </div>
    </header>
  );
}
