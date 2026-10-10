"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { waChatUrl } from "@/lib/contact";

/** Isi halaman error (toko & admin): coba lagi, ke beranda, atau chat WA — bukan layar "Application error" kosong. */
export function ErrorContent({ error, reset, homeHref = "/" }: { error: Error & { digest?: string }; reset: () => void; homeHref?: string }) {
  const pathname = usePathname();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <section data-no-popup className="mx-auto max-w-xl px-4 py-20 text-center sm:py-28">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-ink">Ada gangguan</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Halaman gagal dimuat</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
        Maaf, ada gangguan sementara di sisi kami. Coba muat ulang sebentar lagi — keranjangmu tetap aman.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Button size="lg" onClick={reset}>
          <RotateCcw className="size-4" /> Coba lagi
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link href={homeHref}>Ke beranda</Link>
        </Button>
        <Button size="lg" variant="outline" asChild>
          <a
            href={waChatUrl(`Halo SNAPFIT, halaman ${pathname} gagal dimuat${error.digest ? ` (kode ${error.digest})` : ""}.`)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="size-4" /> Chat WhatsApp
          </a>
        </Button>
      </div>
      {error.digest && <p className="mt-6 font-mono text-[11px] text-muted-foreground">Kode: {error.digest}</p>}
    </section>
  );
}
