"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, ChevronDown, Menu, X, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/format";
import { CartButton } from "@/components/shop/cart-button";
import { useStoreUI } from "@/components/shop/store-ui-provider";
import type { MegaMenuCategory, ProductListItem } from "@/lib/actions/product";
import logo from "@/logosnapfit.png";

export function HeaderNav({ menu }: { menu: MegaMenuCategory[] }) {
  const { authed, openLogin } = useStoreUI();
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

  // --- Search panel ---
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductListItem[]>([]);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchPanelRef = useRef<HTMLDivElement>(null);
  const searchBtnRef = useRef<HTMLButtonElement>(null);
  const searchReq = useRef(0);

  function openSearch() {
    setOpen(false);
    setMobileOpen(false);
    setSearchOpen(true);
  }
  function closeSearch() {
    setSearchOpen(false);
    setQuery("");
    setResults([]);
  }

  useEffect(() => {
    if (!searchOpen) return;
    searchRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSearch();
    };
    // Klik di luar kolom search → tutup otomatis (tak perlu klik "x").
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (searchPanelRef.current?.contains(t)) return;
      if (searchBtnRef.current?.contains(t)) return;
      closeSearch();
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const id = ++searchReq.current;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products?q=${encodeURIComponent(term)}&take=6`);
        const data = await res.json();
        if (id === searchReq.current) setResults(data.items ?? []);
      } catch {
        if (id === searchReq.current) setResults([]);
      } finally {
        if (id === searchReq.current) setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, searchOpen]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = query.trim();
    if (!term) return;
    router.push(`/produk?q=${encodeURIComponent(term)}`);
    closeSearch();
  }

  return (
    <div className="sticky top-0 z-40 pt-3">
      <div className="mx-auto max-w-6xl px-3 sm:px-4">
        <div className="relative">
          {/* Bar mengambang */}
          <div className="relative flex h-14 items-center gap-3 rounded-2xl border border-border bg-background/85 px-4 shadow-lg backdrop-blur transition-shadow hover:shadow-xl supports-[backdrop-filter]:bg-background/70 sm:px-5">
            {/* Hamburger (mobile) */}
            <button
              type="button"
              onClick={() => {
                setSearchOpen(false);
                setMobileOpen((v) => !v);
              }}
              aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
              aria-expanded={mobileOpen}
              className="grid size-9 place-items-center rounded-md text-foreground md:hidden"
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>

            <Link
              href="/"
              className="absolute left-1/2 flex -translate-x-1/2 items-center md:static md:translate-x-0"
              aria-label="SNAPFIT — beranda"
              onClick={closeMobile}
            >
              <Image
                src={logo}
                alt="SNAPFIT"
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
                  setSearchOpen(false);
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
                href="/bantuan"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Bantuan
              </Link>
            </nav>

            <div className="ml-auto flex items-center gap-1">
              <Button
                ref={searchBtnRef}
                variant="ghost"
                size="icon"
                aria-label="Cari"
                aria-expanded={searchOpen}
                onClick={openSearch}
              >
                <Search className="size-5" />
              </Button>
              {authed ? (
                <Button variant="ghost" size="icon" aria-label="Akun" className="hidden md:inline-flex" asChild>
                  <Link href="/akun">
                    <User className="size-5" />
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Masuk / Akun"
                  className="hidden md:inline-flex"
                  onClick={openLogin}
                >
                  <User className="size-5" />
                </Button>
              )}
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
                  {authed ? (
                    <Link
                      href="/akun"
                      onClick={closeMobile}
                      className="flex items-center gap-2 rounded-md px-2 py-2.5 text-sm font-medium hover:bg-accent"
                    >
                      <User className="size-4" /> Akun
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        closeMobile();
                        openLogin();
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-2.5 text-sm font-medium hover:bg-accent"
                    >
                      <User className="size-4" /> Masuk / Daftar
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Panel search */}
          {searchOpen && (
            <div ref={searchPanelRef} className="absolute inset-x-0 top-full z-50 pt-2">
              <div className="animate-in fade-in slide-in-from-top-2 rounded-2xl border border-border bg-background p-4 shadow-xl duration-200">
                <form onSubmit={submitSearch} className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Cari produk…"
                    aria-label="Cari produk"
                    className="w-full rounded-full border border-border bg-background py-2.5 pl-11 pr-10 text-sm outline-none focus:border-foreground"
                  />
                  <button
                    type="button"
                    onClick={closeSearch}
                    aria-label="Tutup pencarian"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </form>

                <div className="mt-2">
                  {searching && (
                    <div className="flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" /> Mencari…
                    </div>
                  )}
                  {!searching && query.trim().length >= 2 && results.length === 0 && (
                    <p className="px-2 py-2 text-sm text-muted-foreground">
                      Tak ada hasil untuk “{query.trim()}”.
                    </p>
                  )}
                  {query.trim().length < 2 && (
                    <p className="px-2 py-2 text-xs text-muted-foreground">
                      Ketik minimal 2 huruf…
                    </p>
                  )}
                  {results.length > 0 && (
                    <ul className="divide-y divide-border">
                      {results.map((p) => (
                        <li key={p.id}>
                          <Link
                            href={`/produk/${p.slug}`}
                            onClick={closeSearch}
                            className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent"
                          >
                            <div className="relative size-10 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                              <Image
                                src={p.coverImage}
                                alt={p.name}
                                fill
                                sizes="40px"
                                className="object-cover"
                              />
                            </div>
                            <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                            <span className="shrink-0 text-sm font-medium">
                              {formatRupiah(p.finalPrice)}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                  {query.trim().length >= 2 && (
                    <Link
                      href={`/produk?q=${encodeURIComponent(query.trim())}`}
                      onClick={closeSearch}
                      className="mt-1 block px-2 py-2 text-sm font-medium underline underline-offset-2"
                    >
                      Lihat semua hasil
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
