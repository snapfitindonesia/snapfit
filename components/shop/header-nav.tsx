"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "@/components/ui/image";
import { useRouter } from "next/navigation";
import { Search, ChevronDown, Menu, X, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/format";
import { CartButton } from "@/components/shop/cart-button";
import { useStoreUI } from "@/components/shop/store-ui-provider";
import type { MegaMenuBrand, MerekMenuItem, ProductListItem, NavLinkItem } from "@/lib/actions/product";
import { merekHref } from "@/lib/slug";
import logo from "@/logosnapfit.png";

export function HeaderNav({ menu, merekMenu = [], navLinks = [] }: { menu: MegaMenuBrand[]; merekMenu?: MerekMenuItem[]; navLinks?: NavLinkItem[] }) {
  const { authed, openLogin } = useStoreUI();
  const [open, setOpen] = useState(false); // mega-menu kategori desktop
  const [merekOpen, setMerekOpen] = useState(false); // mega-menu merek desktop
  const [activeBrand, setActiveBrand] = useState(0); // brand aktif di panel kanan
  const [activeMerek, setActiveMerek] = useState(0); // merek aktif di panel kanan
  const [mobileOpen, setMobileOpen] = useState(false); // drawer mobile
  const [openMenuIds, setOpenMenuIds] = useState<Set<string>>(new Set()); // accordion menu mobile
  const [openBrandKeys, setOpenBrandKeys] = useState<Set<string>>(new Set()); // accordion brand mobile
  const toggleMenu = (id: string) => setOpenMenuIds((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleBrand = (k: string) => setOpenBrandKeys((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (timer.current) clearTimeout(timer.current);
  };
  const scheduleClose = () => {
    cancelClose();
    timer.current = setTimeout(() => { setOpen(false); setMerekOpen(false); }, 150);
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

            {/* Nav tengah (desktop) — absolut di tengah header agar benar-benar center */}
            <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-6 md:flex">
              {navLinks.map((l) =>
                l.kind === "MEGA" ? (
                  <button
                    key={l.id}
                    type="button"
                    onMouseEnter={() => {
                      cancelClose();
                      setSearchOpen(false);
                      setMerekOpen(false);
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
                    {l.label}
                    <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
                  </button>
                ) : l.kind === "MEREK" ? (
                  <button
                    key={l.id}
                    type="button"
                    onMouseEnter={() => {
                      cancelClose();
                      setSearchOpen(false);
                      setOpen(false);
                      setMerekOpen(true);
                    }}
                    onMouseLeave={scheduleClose}
                    onFocus={() => setMerekOpen(true)}
                    aria-expanded={merekOpen}
                    className={cn(
                      "flex items-center gap-1 text-sm transition-colors",
                      merekOpen ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {l.label}
                    <ChevronDown className={cn("size-4 transition-transform", merekOpen && "rotate-180")} />
                  </button>
                ) : (
                  <Link
                    key={l.id}
                    href={l.url}
                    target={l.newTab ? "_blank" : undefined}
                    rel={l.newTab ? "noopener noreferrer" : undefined}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                ),
              )}
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
              <div className="animate-in fade-in slide-in-from-top-1 flex max-h-[70vh] overflow-hidden rounded-2xl border border-border bg-background shadow-xl duration-200">
                {/* Kiri: daftar brand */}
                <div className="w-48 shrink-0 border-r border-border bg-muted/30 p-2">
                  {menu.map((brand, i) => (
                    <button
                      key={brand.slug}
                      type="button"
                      onMouseEnter={() => setActiveBrand(i)}
                      onFocus={() => setActiveBrand(i)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
                        activeBrand === i ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/60",
                      )}
                    >
                      {brand.name}
                      <ChevronDown className="size-4 -rotate-90" />
                    </button>
                  ))}
                </div>

                {/* Kanan: seri + model dari brand aktif */}
                <div className="flex-1 overflow-y-auto p-5">
                  {menu[activeBrand] && (
                    <>
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-semibold">{menu[activeBrand].name}</h3>
                        <Link
                          href={`/kategori/${menu[activeBrand].slug}`}
                          onClick={() => setOpen(false)}
                          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                        >
                          Lihat semua {menu[activeBrand].name}
                        </Link>
                      </div>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-3">
                        {menu[activeBrand].lines.map((line) => (
                          <div key={line.slug}>
                            <Link
                              href={`/kategori/${line.slug}`}
                              onClick={() => setOpen(false)}
                              className="flex items-center gap-2 font-semibold text-sm hover:underline"
                            >
                              <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-muted">
                                {line.cover && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={line.cover} alt="" className="size-full object-cover" />
                                )}
                              </span>
                              {line.name}
                            </Link>
                            {line.models.length > 0 && (
                              <ul className="mt-1.5 space-y-0.5 pl-9">
                                {line.models.map((m) => (
                                  <li key={m.slug ?? m.label}>
                                    <Link
                                      href={m.slug ? `/kategori/${m.slug}` : `/produk?tipe=${line.slug}&model=${encodeURIComponent(m.label)}`}
                                      onClick={() => setOpen(false)}
                                      className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
                                    >
                                      {m.label}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Mega-menu Merek/Brands (desktop) */}
          {merekOpen && merekMenu.length > 0 && (
            <div
              className="absolute inset-x-0 top-full z-50 hidden pt-2 md:block"
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
            >
              <div className="animate-in fade-in slide-in-from-top-1 flex max-h-[70vh] overflow-hidden rounded-2xl border border-border bg-background shadow-xl duration-200">
                {/* Kiri: daftar merek */}
                <div className="w-48 shrink-0 overflow-y-auto border-r border-border bg-muted/30 p-2">
                  {merekMenu.map((m, i) => (
                    <button
                      key={m.name}
                      type="button"
                      onMouseEnter={() => setActiveMerek(i)}
                      onFocus={() => setActiveMerek(i)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
                        activeMerek === i ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/60",
                      )}
                    >
                      {m.name}
                      <ChevronDown className="size-4 -rotate-90" />
                    </button>
                  ))}
                </div>

                {/* Kanan: produk dari merek aktif */}
                <div className="flex-1 overflow-y-auto p-5">
                  {merekMenu[activeMerek] && (
                    <>
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-semibold">Produk · {merekMenu[activeMerek].name}</h3>
                        <Link
                          href={merekHref(merekMenu[activeMerek].name)}
                          onClick={() => setMerekOpen(false)}
                          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                        >
                          Lihat semua {merekMenu[activeMerek].name}
                        </Link>
                      </div>
                      <div className="grid grid-cols-4 gap-4 lg:grid-cols-5 [&>*:nth-child(5)]:hidden lg:[&>*:nth-child(5)]:block">
                        {merekMenu[activeMerek].products.slice(0, 5).map((p) => (
                          <Link
                            key={p.id}
                            href={`/produk/${p.slug}`}
                            onClick={() => setMerekOpen(false)}
                            className="group/mp block"
                          >
                            <span className="block aspect-square overflow-hidden rounded-lg border border-border bg-muted">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={p.coverImage} alt="" className="size-full object-contain p-1 transition-transform group-hover/mp:scale-105" />
                            </span>
                            <span className="mt-1.5 line-clamp-2 block text-xs text-muted-foreground group-hover/mp:text-foreground">{p.name}</span>
                          </Link>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Drawer menu (mobile) */}
          {mobileOpen && (
            <div className="absolute inset-x-0 top-full z-50 pt-2 md:hidden">
              <div className="animate-in fade-in slide-in-from-top-2 max-h-[75vh] divide-y divide-border overflow-y-auto rounded-2xl border border-border bg-background shadow-xl duration-200">
                {navLinks.map((l) => {
                  if (l.kind === "MEGA") {
                    const openM = openMenuIds.has(l.id);
                    return (
                      <div key={l.id}>
                        <button type="button" onClick={() => toggleMenu(l.id)} className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold">
                          {l.label}
                          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", openM && "rotate-180")} />
                        </button>
                        {openM && (
                          <div className="pb-1">
                            {menu.map((brand) => {
                              const openB = openBrandKeys.has(brand.slug);
                              return (
                                <div key={brand.slug}>
                                  <div className="flex items-center">
                                    <Link href={`/kategori/${brand.slug}`} onClick={closeMobile} className="flex-1 py-2 pl-6 pr-2 text-sm font-medium">
                                      {brand.name}
                                    </Link>
                                    {brand.lines.length > 0 && (
                                      <button type="button" onClick={() => toggleBrand(brand.slug)} aria-label="Buka" className="px-4 py-2 text-muted-foreground">
                                        <ChevronDown className={cn("size-4 transition-transform", openB && "rotate-180")} />
                                      </button>
                                    )}
                                  </div>
                                  {openB && brand.lines.length > 0 && (
                                    <ul className="pb-1">
                                      {brand.lines.map((line) => (
                                        <li key={line.slug}>
                                          <Link href={`/kategori/${line.slug}`} onClick={closeMobile} className="block py-1.5 pl-10 pr-3 text-sm text-muted-foreground">
                                            {line.name}
                                          </Link>
                                          {line.models.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 px-10 pb-2 pt-0.5">
                                              {line.models.map((m) => (
                                                <Link
                                                  key={m.slug ?? m.label}
                                                  href={m.slug ? `/kategori/${m.slug}` : `/produk?tipe=${line.slug}&model=${encodeURIComponent(m.label)}`}
                                                  onClick={closeMobile}
                                                  className="inline-block rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground"
                                                >
                                                  {m.label}
                                                </Link>
                                              ))}
                                            </div>
                                          )}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }
                  if (l.kind === "MEREK") {
                    const openM = openMenuIds.has(l.id);
                    return (
                      <div key={l.id}>
                        <button type="button" onClick={() => toggleMenu(l.id)} className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold">
                          {l.label}
                          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", openM && "rotate-180")} />
                        </button>
                        {openM && (
                          <div className="flex flex-wrap gap-1.5 px-4 pb-3">
                            {merekMenu.map((m) => (
                              <Link
                                key={m.name}
                                href={merekHref(m.name)}
                                onClick={closeMobile}
                                className="inline-block rounded-full border border-border px-3 py-1 text-sm text-muted-foreground"
                              >
                                {m.name}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return (
                    <Link
                      key={l.id}
                      href={l.url}
                      target={l.newTab ? "_blank" : undefined}
                      rel={l.newTab ? "noopener noreferrer" : undefined}
                      onClick={closeMobile}
                      className="block px-4 py-3 text-sm font-semibold hover:bg-accent"
                    >
                      {l.label}
                    </Link>
                  );
                })}

                <div>
                  {authed ? (
                    <Link
                      href="/akun"
                      onClick={closeMobile}
                      className="flex items-center gap-2 px-4 py-3 text-sm font-semibold hover:bg-accent"
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
                      className="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold hover:bg-accent"
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
