import Link from "next/link";
import { ArrowRight, MessageCircle, PackageSearch, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { waChatUrl } from "@/lib/contact";

// Pintasan belanja per perangkat di halaman 404.
const SHORTCUTS = [
  { label: "iPhone", href: "/produk?q=iphone" },
  { label: "Galaxy S", href: "/produk?q=galaxy%20s" },
  { label: "Galaxy Z Fold", href: "/produk?q=fold" },
  { label: "Galaxy Z Flip", href: "/produk?q=flip" },
  { label: "AirPods", href: "/produk?q=airpods" },
];

/**
 * Isi halaman 404 (dipakai app/(shop)/not-found.tsx — dengan header & footer toko —
 * dan app/not-found.tsx). Statis: tanpa query DB, aman dibuka bot berkali-kali.
 */
export function NotFoundContent() {
  return (
    <section data-no-popup className="relative overflow-hidden">
      {/* Angka 404 dekoratif di latar */}
      <p
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-6 select-none text-center text-[9rem] font-bold leading-none tracking-tighter text-muted/70 sm:text-[14rem]"
      >
        404
      </p>

      <div className="relative mx-auto max-w-2xl px-4 pb-16 pt-24 text-center sm:pb-24 sm:pt-36">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-ink">Error 404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Halaman tidak ditemukan</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
          Tautannya mungkin salah ketik, sudah dipindah, atau produknya tidak dijual lagi. Coba cari produk yang
          kamu butuhkan di bawah ini.
        </p>

        <form action="/produk" method="get" role="search" className="mx-auto mt-8 flex max-w-md gap-2">
          <label className="relative flex-1">
            <span className="sr-only">Cari produk</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              name="q"
              type="search"
              placeholder="Cari case, tempered glass, tipe HP…"
              className="h-[42px] w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-foreground"
            />
          </label>
          <Button type="submit" size="lg">
            Cari
          </Button>
        </form>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button asChild variant="outline">
            <Link href="/">Kembali ke beranda</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/produk">
              Lihat semua produk <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-12">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Belanja per perangkat</p>
          <ul className="mt-3 flex flex-wrap justify-center gap-2">
            {SHORTCUTS.map((b) => (
              <li key={b.label}>
                <Link
                  href={b.href}
                  className="inline-flex h-[42px] items-center rounded-[5px] border border-border px-4 text-sm font-medium transition-colors hover:border-foreground"
                >
                  {b.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="mx-auto mt-12 grid max-w-lg gap-3 text-left sm:grid-cols-2">
          <a
            href={waChatUrl("Halo SNAPFIT, saya mencari produk tapi halamannya tidak ditemukan. Bisa dibantu?")}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 rounded-lg border border-border p-4 transition-colors hover:border-foreground"
          >
            <MessageCircle className="mt-0.5 size-5 shrink-0 text-[#1a7f4b]" />
            <span>
              <span className="block text-sm font-medium">Tanya via WhatsApp</span>
              <span className="block text-xs text-muted-foreground">Kami bantu carikan produknya</span>
            </span>
          </a>
          <Link href="/lacak" className="flex items-start gap-3 rounded-lg border border-border p-4 transition-colors hover:border-foreground">
            <PackageSearch className="mt-0.5 size-5 shrink-0 text-brand-ink" />
            <span>
              <span className="block text-sm font-medium">Lacak pesanan</span>
              <span className="block text-xs text-muted-foreground">Cek status pesananmu</span>
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
