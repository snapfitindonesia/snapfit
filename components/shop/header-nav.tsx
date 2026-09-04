"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, ChevronDown, Menu, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CartButton } from "@/components/shop/cart-button";
import type { MegaMenuCategory } from "@/lib/actions/product";
import logo from "@/logosnapfit.png";

export function HeaderNav({ menu }: { menu: MegaMenuCategory[] }) {
  const [open, setOpen] = useState(false); // mega-menu desktop
  const [mobileOpen, setMobileOpen] = useState(false); // drawer mobile
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (timer.current) clearTimeout(timer.current);
  };
  const scheduleClose = () => {
    cancelClose();
    timer.current = setTimeout(() => setOpen(false), 150);
  };
  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="sticky top-0 z-40 pt-3">
      <div className="mx-auto max-w-6xl px-3 sm:px-4">
        <div className="relative">
          {/* Bar mengambang */}
          <div className="relative flex h-14 items-center gap-3 rounded-2xl border border-border bg-background/85 px-4 shadow-lg backdrop-blur transition-shadow hover:shadow-xl supports-[backdrop-filter]:bg-background/70 sm:px-5">
            {/* Hamburger (mobile) */}
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
              aria-expanded={mobileOpen}
              className="grid size-9 place-items-center rounded-md text-foreground md:hidden"
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>

            <Link
              href="/"
              className="absolute left-1/2 flex -translate-x-1/2 items-center md:static md:translate-x-0"
              aria-label="SnapFit — beranda"
              onClick={closeMobile}
            >
              <Image
                src={logo}
                alt="SnapFit"
                priority
                className="h-6 w-auto sm:h-7"
              />
            </Link>

            {/* Nav tengah (desktop) */}
            <nav className="mx-auto hidden items-center gap-6 md:flex">
              <Link
                href="/produk"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Semua Produk
              </Link>
              <button
                type="button"
                onMouseEnter={() => {
                  cancelClose();
                  setOpen(true);
                }}
                onMouseLeave={scheduleClose}
                onFocus={() => setOpen(true)}
                aria-expanded={open}
                className={cn(
                  "flex items-center gap-1 text-sm transition-colors",
                  open ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                Kategori
                <ChevronDown
                  className={cn("size-4 transition-transform", open && "rotate-180")}
                />
              </button>
              <Link
                href="/produk"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Bantuan
              </Link>
            </nav>

            <div className="ml-auto flex items-center gap-1">
              <Button variant="ghost" size="icon" aria-label="Cari" asChild>
                <Link href="/produk">
                  <Search className="size-5" />
                </Link>
              </Button>
              <CartButton />
            </div>
          </div>

          {/* Mega-menu mengambang (desktop) */}
          {open && (
            <div
              className="absolute inset-x-0 top-full z-50 hidden pt-2 md:block"
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
            >
              <div className="animate-in fade-in slide-in-from-top-1 rounded-2xl border border-border bg-background p-6 shadow-xl duration-200">
                <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                  {menu.map((cat) => (
                    <div key={cat.slug}>
                      <Link
                        href={`/produk?tipe=${cat.slug}`}
                        onClick={() => setOpen(false)}
                        className="group block"
                      >
                        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-border bg-muted">
                          {cat.products[0] && (
                            <Image
                              src={cat.products[0].coverImage}
                              alt={cat.name}
                              fill
                              sizes="200px"
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          )}
                        </div>
                        <p className="mt-3 text-sm font-semibold">{cat.name}</p>
                      </Link>
                      <ul className="mt-2 space-y-1.5">
                        {cat.products.map((p) => (
                          <li key={p.slug}>
                            <Link
                              href={`/produk/${p.slug}`}
                              onClick={() => setOpen(false)}
                              className="line-clamp-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                            >
                              {p.name}
                            </Link>
                          </li>
                        ))}
                        <li>
                          <Link
                            href={`/produk?tipe=${cat.slug}`}
                            onClick={() => setOpen(false)}
                            className="text-sm font-medium underline underline-offset-2"
                          >
                            Lihat semua
                          </Link>
                        </li>
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Drawer menu (mobile) */}
          {mobileOpen && (
            <div className="absolute inset-x-0 top-full z-50 pt-2 md:hidden">
              <div className="animate-in fade-in slide-in-from-top-2 max-h-[75vh] overflow-y-auto rounded-2xl border border-border bg-background p-4 shadow-xl duration-200">
                <Link
                  href="/produk"
                  onClick={closeMobile}
                  className="block rounded-md px-2 py-2.5 text-sm font-medium hover:bg-accent"
                >
                  Semua Produk
                </Link>

                <p className="mt-3 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Kategori
                </p>
                <div className="mt-1 space-y-3">
                  {menu.map((cat) => (
                    <div key={cat.slug}>
                      <Link
                        href={`/produk?tipe=${cat.slug}`}
                        onClick={closeMobile}
                        className="block rounded-md px-2 py-1.5 text-sm font-semibold hover:bg-accent"
                      >
                        {cat.name}
                      </Link>
                      <ul className="ml-2 border-l border-border pl-3">
                        {cat.products.map((p) => (
                          <li key={p.slug}>
                            <Link
                              href={`/produk/${p.slug}`}
                              onClick={closeMobile}
                              className="block py-1 text-sm text-muted-foreground hover:text-foreground"
                            >
                              {p.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                <div className="mt-3 border-t border-border pt-3">
                  <Link
                    href="/akun"
                    onClick={closeMobile}
                    className="flex items-center gap-2 rounded-md px-2 py-2.5 text-sm font-medium hover:bg-accent"
                  >
                    <User className="size-4" /> Akun
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
