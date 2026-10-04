"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "@/components/ui/image";
import type { SectionOf } from "@/lib/home/sections";

type Item = SectionOf<"testimonials">["items"][number];

/*
 * Kolom ulasan berjalan (referensi Omnix "Customer stories"): kartu bergerak vertikal terus-menerus —
 * kolom ganjil naik, genap turun — berhenti saat kursor di atasnya; kartu naik 2px + garis oranye saat
 * di-hover. Animasi = CSS murni (styles/globals.css). Hanya SATU tata letak yang dirender (HP 1 kolom,
 * tablet 2, desktop 3 — dipilih setelah hydrate; server merender 3 kolom) → DOM tetap kecil. Tinggi
 * kotak tetap per layar → bergantinya isi tak menggeser halaman (CLS 0).
 */

const MIN_PER_COL = 4; // kartu per salinan kolom (agar salinan ≥ tinggi kotak → sambungan tak terlihat)
const SEC_PER_CARD = 9.5; // 4 kartu = 38 dtk (kecepatan referensi)

export function Stars({ n, className }: { n: number; className?: string }) {
  return (
    <span className={cn("leading-none tracking-[1.5px]", className)} aria-label={`${n} dari 5 bintang`} role="img">
      <span className="text-brand">{"★".repeat(n)}</span>
      <span className="text-foreground/15">{"★".repeat(5 - n)}</span>
    </span>
  );
}

function Card({ t }: { t: Item }) {
  const initials = t.name
    .split(/\s+/)
    .map((w) => (w.match(/[\p{L}\d]/u)?.[0] ?? "").toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join("");
  return (
    <figure className="shrink-0 rounded-[5px] border border-foreground/5 bg-card px-[22px] pt-[22px] pb-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-[box-shadow,transform,border-color] duration-[250ms] hover:-translate-y-0.5 hover:border-brand/25 hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
      <div className="mb-3 flex items-center justify-between">
        <Stars n={t.rating} className="text-sm" />
        {t.verified && (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold tracking-[0.03em] text-[#15803d] uppercase">
            <Check className="size-3" strokeWidth={3} aria-hidden />
            Terverifikasi
          </span>
        )}
      </div>
      <blockquote className="mb-[18px] text-sm leading-[1.55] text-foreground/80">{t.text}</blockquote>
      <figcaption className="flex items-center gap-2.5 border-t border-foreground/[0.07] pt-3.5">
        <span className="grid size-[30px] shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-[11px] font-bold text-foreground/70">
          {t.avatar ? <Image src={t.avatar} alt="" width={60} height={60} sizes="30px" className="size-full object-cover" /> : initials}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[12.5px] leading-[1.15] font-bold">{t.name}</span>
          {t.meta && <span className="mt-px block truncate text-[11px] leading-[1.2] text-muted-foreground">{t.meta}</span>}
        </span>
      </figcaption>
    </figure>
  );
}

/** Bagi kartu ke n kolom (bergiliran), ulangi isi kolom sampai ≥ MIN_PER_COL kartu. */
function columns(items: Item[], n: number): Item[][] {
  const cols: Item[][] = Array.from({ length: n }, () => []);
  items.forEach((t, i) => cols[i % n]!.push(t));
  return cols
    .filter((c) => c.length)
    .map((c) => {
      const out = [...c];
      for (let i = 0; out.length < MIN_PER_COL; i++) out.push(c[i % c.length]!);
      return out;
    });
}

/** Jumlah kolom sesuai lebar layar: <640 = 1, 640–1023 = 2, ≥1024 = 3 (server: 3). */
function useColumnCount(): number {
  const [n, setN] = useState(3);
  useEffect(() => {
    const sm = window.matchMedia("(min-width: 640px)");
    const lg = window.matchMedia("(min-width: 1024px)");
    const update = () => setN(lg.matches ? 3 : sm.matches ? 2 : 1);
    update();
    sm.addEventListener("change", update);
    lg.addEventListener("change", update);
    return () => {
      sm.removeEventListener("change", update);
      lg.removeEventListener("change", update);
    };
  }, []);
  return n;
}

export function TestimonialsMarquee({ items }: { items: Item[] }) {
  const cols = columns(items, useColumnCount());
  return (
    <div className="testi-marquee relative grid h-[520px] auto-rows-[100%] grid-cols-1 gap-5 overflow-hidden [mask-image:linear-gradient(transparent,#000_10%,#000_90%,transparent)] sm:h-[560px] sm:grid-cols-2 lg:h-[620px] lg:grid-cols-3">
      {cols.map((col, ci) => (
        <div key={`${cols.length}-${ci}`} className="h-full overflow-hidden">
          <div
            className="testi-col flex flex-col gap-4"
            data-reverse={ci % 2 ? "" : undefined}
            style={{ "--testi-dur": `${col.length * SEC_PER_CARD}s` } as React.CSSProperties}
          >
            {col.map((t, i) => (
              <Card key={`a${i}`} t={t} />
            ))}
            {/* Salinan ke-2 (untuk sambungan mulus) — disembunyikan dari pembaca layar */}
            <div className="contents" aria-hidden>
              {col.map((t, i) => (
                <Card key={`b${i}`} t={t} />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
