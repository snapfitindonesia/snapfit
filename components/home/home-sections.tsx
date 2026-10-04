import Link from "next/link";
import { ArrowRight, Check, Star } from "lucide-react";
import { ArticleGrid } from "@/components/articles/article-card";
import { Testimonials } from "@/components/home/testimonials";
import { NewsletterForm } from "@/components/home/newsletter-form";
import { cn } from "@/lib/utils";
import Image from "@/components/ui/image";
import { ProductCard } from "@/components/shop/product-card";
import { ArtImage } from "@/components/home/art-image";
import { ScrollRow } from "@/components/home/scroll-row";
import { Parallax } from "@/components/home/parallax";
import { RichText } from "@/lib/home/rich-text";
import type { HomeSection, SectionOf } from "@/lib/home/sections";
import type { HomeData } from "@/lib/home/data";

/*
 * Beranda "bercerita" (referensi: Nomad). Lebar gabungan: hero, banner cerita, komunitas &
 * banner ulasan SELEBAR LAYAR; deretan produk, kategori, blok gambar+teks & kartu dibatasi
 * max-w-[100rem] (1600px). Bagian di bawah layar pertama memakai cv-auto (render ditunda sampai dekat).
 */

const WRAP = "mx-auto max-w-[100rem] px-4 sm:px-6 lg:px-10";
// Baris geser: di HP/tablet menembus tepi layar (kartu berikut mengintip); di desktop tetap di
// dalam kolom isi agar halaman simetris (menembus kanan di layar lebar terlihat berat sebelah).
const BLEED = "-mx-4 px-4 scroll-px-4 sm:-mx-6 sm:px-6 sm:scroll-px-6 lg:mx-0 lg:px-0 lg:scroll-px-0";

/** Tombol pil (gaya Nomad). `dark` = di atas latar gelap/foto. */
function Cta({ label, href, dark = false, className }: { label: string; href: string; dark?: boolean; className?: string }) {
  if (!label || !href) return null;
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-[42px] items-center gap-1.5 rounded-[5px] px-5 text-sm font-medium transition-colors",
        dark ? "bg-white text-neutral-950 hover:bg-white/85" : "bg-foreground text-background hover:bg-foreground/85",
        className,
      )}
    >
      {label}
      <ArrowRight className="size-4" aria-hidden />
    </Link>
  );
}

function Eyebrow({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  if (!children) return null;
  return (
    <p className={cn("text-xs font-semibold uppercase tracking-[0.18em]", dark ? "text-white/75" : "text-brand-ink")}>{children}</p>
  );
}

function SectionHead({ title, subtitle, ctaLabel, ctaHref }: { title: string; subtitle?: string; ctaLabel?: string; ctaHref?: string }) {
  if (!title) return null;
  return (
    <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{title}</h2>
        {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {ctaLabel && ctaHref && (
        <Link href={ctaHref} className="shrink-0 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}

/* ------------------------- JARAK BAGIAN "RAPAT" ------------------------- */

// Hero foto & Blok Custom tanpa judul/latar yang berurutan → jarak di antaranya sama dengan jarak
// antar-kartu slide (12px HP / 24px desktop), berapa pun jumlah & urutannya.
const TIGHT_TOP = "pt-3 sm:pt-6";
function isTight(s: HomeSection | undefined): boolean {
  if (!s) return false;
  if (s.type === "hero") return s.mode === "foto" && !!s.image;
  if (s.type === "custom") return !s.bg && !s.title && !s.subtitle;
  return false;
}

/* ------------------------------- HERO -------------------------------- */

/** `tightNext`: bagian berikut juga "rapat" (hero/Blok Custom foto) → tanpa jarak bawah (jarak diberi bagian berikut). */
function Hero({ s, first, tightNext = false }: { s: SectionOf<"hero">; first: boolean; tightNext?: boolean }) {
  const dark = s.theme === "gelap";
  const Heading = first ? "h1" : "h2";
  if (s.mode === "foto" && s.image) {
    // Hero di dalam kolom isi situs (maks 1600px, sejajar header kapsul & bagian lain), sudut membulat
    // seperti kapsul header, di BAWAH header. Teks: desktop kiri-tengah, HP rata tengah di atas.
    // Badge → subjudul → judul besar → tombol pil.
    const light = s.theme === "terang";
    return (
      <div className={cn(WRAP, first ? "pt-3 sm:pt-4" : TIGHT_TOP, !first && !tightNext && "pb-6")}>
      <section
        className={cn(
          "rounded-[5px] lg:rounded-[5px]",
          // Tinggi = rasio foto (desktop 2400×1350 = 16:9, HP 1080×1350 = 4:5) → foto tampil UTUH.
          // Tanpa foto HP: foto desktop dipotong otomatis ke 4:5 (bagian tengah).
          "relative isolate flex aspect-[4/5] overflow-hidden md:aspect-video md:items-center",
          !light && "text-white",
        )}
        style={{ backgroundColor: s.bg || (light ? "#f2f1ee" : "#1a0d08") }}
      >
        {/* Tanpa parallax: parallax butuh foto diperbesar (tepinya terpotong) — hero wajib tampil utuh. */}
        <div aria-hidden className="absolute inset-0 -z-10">
          <ArtImage src={s.image} srcMobile={s.imageMobile || undefined} alt={s.title || "SNAPFIT"} priority={first} />
        </div>
        {!light && (
          <>
            {/* Gelap tipis di sisi teks agar selalu terbaca */}
            <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-black/35 via-transparent to-transparent md:bg-gradient-to-r md:from-black/40 md:via-black/10 md:to-transparent" />
          </>
        )}
        <div
          className={cn(
            "w-full px-6 pt-10 text-center sm:px-10 md:pt-0 md:text-left lg:px-14",
          )}
        >
          <div className="mx-auto max-w-[40rem] md:mx-0 md:max-w-[26rem] lg:max-w-[36rem] xl:max-w-[48rem]">
            {s.eyebrow && (
              <span
                className="inline-block rounded-[5px] px-2.5 pb-[3px] pt-1 text-[11px] font-bold uppercase leading-none tracking-wide text-white lg:text-xs"
                style={{ backgroundColor: s.badgeBg || "#005bd3" }}
              >
                {s.eyebrow}
              </span>
            )}
            {s.kicker && <p className="mt-2 text-xl font-bold leading-[0.95] tracking-[-0.04em] sm:text-2xl md:text-xl lg:mt-1.5 lg:text-2xl xl:text-[33px]">{s.kicker}</p>}
            {s.title && (
              <Heading className="mt-1 text-[40px] font-extrabold leading-[0.95] tracking-[-0.04em] text-balance sm:text-5xl md:text-[44px] lg:text-[56px] xl:text-[77px]">
                {s.title}
              </Heading>
            )}
            {s.subtitle && (
              <p className={cn("mt-2 text-lg font-bold leading-tight tracking-[-0.02em] sm:text-xl", light ? "text-foreground/80" : "text-white/90")}>{s.subtitle}</p>
            )}
            {s.ctaLabel && s.ctaHref && (
              <Link
                href={s.ctaHref}
                className={cn(
                  "mt-5 inline-flex h-[42px] items-center rounded-[5px] px-6 text-base font-bold transition-opacity hover:opacity-85",
                  light ? "bg-foreground text-background" : "bg-white text-neutral-950",
                )}
              >
                {s.ctaLabel}
              </Link>
            )}
          </div>
        </div>
      </section>
      </div>
    );
  }
  // Mode produk: latar warna + foto produk (latar putih foto katalog dilebur ke warna latar).
  return (
    <section className={cn(dark ? "text-white" : "")} style={{ backgroundColor: s.bg || "#f2f1ee" }}>
      <div className={cn(WRAP, "grid items-center gap-6 py-10 sm:py-14 md:min-h-[560px] md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:gap-10 md:py-12 lg:min-h-[660px]")}>
        <div className="max-w-xl">
          <Eyebrow dark={dark}>{s.eyebrow}</Eyebrow>
          {s.title && <Heading className="mt-3 text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">{s.title}</Heading>}
          {s.subtitle && <p className={cn("mt-4 text-base text-pretty sm:text-lg", dark ? "text-white/80" : "text-foreground/70")}>{s.subtitle}</p>}
          <Cta label={s.ctaLabel} href={s.ctaHref} dark={dark} className="mt-7" />
        </div>
        {s.image && (
          <div className="relative mx-auto aspect-square w-full max-w-[17rem] sm:max-w-sm md:aspect-[5/4] md:max-w-none">
            <Image
              src={s.image}
              alt={s.title || "Produk SNAPFIT"}
              fill
              priority={first}
              sizes="(min-width: 1440px) 760px, (min-width: 768px) 54vw, 90vw"
              className={cn("object-contain", !dark && "mix-blend-multiply")}
            />
          </div>
        )}
      </div>
    </section>
  );
}

/* ----------------------------- PRODUCTS ------------------------------ */

function Products({ s, data, eager }: { s: SectionOf<"products">; data: HomeData; eager: boolean }) {
  const items = data.products[s.id] ?? [];
  if (!items.length) return null;
  return (
    <section className={cn(WRAP, "py-12 sm:py-16", !eager && "cv-auto [--cv-h:560px]")}>
      <SectionHead title={s.title} subtitle={s.subtitle} ctaLabel={s.ctaLabel} ctaHref={s.ctaHref} />
      <ScrollRow label={s.title || "Produk"} className={BLEED}>
        {items.map((p, i) => (
          <div key={p.id} className="w-[44vw] shrink-0 snap-start sm:w-[calc((100%-3.75rem)/3.4)] xl:w-[calc((100%-3.75rem)/4.4)]">
            <ProductCard product={p} priority={eager && i < 2} />
          </div>
        ))}
      </ScrollRow>
    </section>
  );
}

/* ---------------------------- CATEGORIES ----------------------------- */

function Categories({ s }: { s: SectionOf<"categories"> }) {
  const items = s.items.filter((i) => i.label && i.href);
  if (!items.length) return null;
  return (
    <section className={cn(WRAP, "cv-auto py-10 [--cv-h:180px] sm:py-12")}>
      {s.title && <h2 className="mb-5 text-center text-2xl font-semibold tracking-tight sm:text-3xl">{s.title}</h2>}
      <ul className="flex flex-wrap justify-center gap-2.5 sm:gap-3">
        {items.map((c) => (
          <li key={c.href + c.label}>
            <Link
              href={c.href}
              className="group flex h-[42px] items-center gap-3 rounded-[5px] border border-border bg-background pl-5 pr-1.5 text-sm font-medium transition-colors hover:border-foreground"
            >
              {c.label}
              {c.image ? (
                <span className="relative size-8 overflow-hidden rounded-full bg-muted">
                  <Image src={c.image} alt="" fill sizes="40px" className="object-contain mix-blend-multiply" />
                </span>
              ) : (
                <ArrowRight className="mr-2 size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ----------------------------- FEATURES ------------------------------ */

function Features({ s }: { s: SectionOf<"features"> }) {
  const items = s.items.filter((i) => i.title);
  if (!items.length) return null;
  return (
    <section className={cn(WRAP, "cv-auto space-y-4 py-10 [--cv-h:1400px] sm:space-y-5 sm:py-12")}>
      {s.title && <h2 className="mb-2 text-center text-2xl font-semibold tracking-tight sm:text-3xl">{s.title}</h2>}
      {items.map((f, i) => (
        <article key={i} className="grid overflow-hidden rounded-2xl border border-border bg-background md:grid-cols-2">
          <div className={cn("relative aspect-[4/3] bg-muted md:aspect-auto md:min-h-[380px]", i % 2 === 1 && "md:order-last")}>
            {f.image && (
              <Image
                src={f.image}
                alt={f.title}
                fill
                sizes="(min-width: 1152px) 560px, (min-width: 768px) 50vw, 100vw"
                className="object-contain p-6 mix-blend-multiply sm:p-10"
              />
            )}
          </div>
          <div className="flex flex-col items-center justify-center px-6 py-10 text-center sm:px-12">
            {f.eyebrow && <span className="rounded-[5px] bg-foreground px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-background">{f.eyebrow}</span>}
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{f.title}</h3>
            {f.text && <p className="mt-3 max-w-sm text-sm text-muted-foreground text-pretty sm:text-base">{f.text}</p>}
            <Cta label={f.ctaLabel} href={f.href} className="mt-6" />
          </div>
        </article>
      ))}
    </section>
  );
}

/* ------------------------------- QUOTE ------------------------------- */

function Quote({ s }: { s: SectionOf<"quote"> }) {
  if (!s.text) return null;
  return (
    <section className={cn(WRAP, "cv-auto py-14 text-center [--cv-h:260px] sm:py-20")}>
      <blockquote className="mx-auto max-w-3xl">
        <p className="text-xl font-medium leading-relaxed tracking-tight text-balance sm:text-2xl">“{s.text}”</p>
        {s.author && <footer className="mt-4 text-sm text-muted-foreground">— {s.author}</footer>}
      </blockquote>
    </section>
  );
}

/* ------------------------------ BANNER ------------------------------- */

function Banner({ s }: { s: SectionOf<"banner"> }) {
  if (!s.title && !s.image) return null;
  const photo = !!s.image;
  const dark = photo || s.theme === "gelap";
  return (
    <section
      className={cn("cv-auto relative isolate overflow-hidden [--cv-h:520px]", dark && "text-white")}
      style={photo ? undefined : { backgroundColor: s.bg || "#151515" }}
    >
      {photo && (
        <>
          <Parallax enabled={s.parallax}>
            <ArtImage src={s.image} srcMobile={s.imageMobile || undefined} alt={s.title || "SNAPFIT"} />
          </Parallax>
          <div aria-hidden className="absolute inset-0 -z-10 bg-black/45" />
        </>
      )}
      <div className={cn(WRAP, "flex flex-col items-center py-20 text-center sm:py-28", photo && "min-h-[440px] justify-center md:min-h-[520px]")}>
        <Eyebrow dark={dark}>{s.eyebrow}</Eyebrow>
        {s.title && <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-5xl">{s.title}</h2>}
        {s.text && <p className={cn("mt-4 max-w-xl text-base text-pretty sm:text-lg", dark ? "text-white/80" : "text-foreground/70")}>{s.text}</p>}
        <Cta label={s.ctaLabel} href={s.ctaHref} dark={dark} className="mt-7" />
      </div>
    </section>
  );
}

/* ----------------------------- COMMUNITY ----------------------------- */

function Community({ s, data }: { s: SectionOf<"community">; data: HomeData }) {
  const shots = (s.source === "ulasan" ? data.shots : s.items).filter((x) => x.image);
  if (shots.length < 3) return null; // terlalu sedikit → tampak kosong; sembunyikan
  // Gaya "From the Nomad Community": judul besar di tengah, baris foto di dalam kolom isi situs (sejajar
  // bagian lain; HP menembus tepi layar seperti deretan produk), kartu 9:16 (Story IG), keterangan di bawah. Foto → produk.
  return (
    <section className={cn(WRAP, "cv-auto py-14 [--cv-h:560px] sm:py-20")}>
      {s.title && (
        <h2 className="mb-7 px-4 text-center text-3xl font-extrabold tracking-[-0.03em] text-balance sm:mb-9 sm:text-4xl lg:text-[46px]">
          {s.title}
        </h2>
      )}
      {s.subtitle && <p className="-mt-4 mb-8 px-4 text-center text-sm text-muted-foreground sm:-mt-5">{s.subtitle}</p>}
      <ScrollRow label={s.title || "Galeri SNAPFIT"} className={BLEED}>
        {shots.map((x, i) => {
          // Ada keterangan → itulah teks tautannya; alt dikosongkan agar tak dibaca dua kali.
          const alt = x.caption ? "" : "Foto SNAPFIT";
          const body = (
            <>
              <span className="relative block aspect-[9/16] overflow-hidden rounded-2xl bg-muted">
                <Image
                  src={x.image}
                  alt={alt}
                  fill
                  sizes="(min-width: 1600px) 280px, (min-width: 1024px) 18vw, (min-width: 640px) 30vw, 44vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </span>
              {x.caption && <span className="mt-3 block truncate text-sm text-foreground/80">{x.caption}</span>}
            </>
          );
          return (
            <div key={i} className="group w-[44vw] shrink-0 snap-start sm:w-[30vw] lg:w-[calc((100%-6.25rem)/5.4)]">
              {x.href ? (
                <Link href={x.href}>{body}</Link>
              ) : (
                body
              )}
            </div>
          );
        })}
      </ScrollRow>
    </section>
  );
}

/* ------------------------------ REVIEWS ------------------------------ */

function Reviews({ s, data }: { s: SectionOf<"reviews">; data: HomeData }) {
  const r = data.reviews;
  if (!r || r.total === 0) return null;
  const fill = (t: string) =>
    t.replace(/\{jumlah\}/g, r.fiveStar.toLocaleString("id-ID")).replace(/\{rating\}/g, r.avg.toFixed(1).replace(".", ","));
  const photo = !!s.image;
  return (
    <section className="cv-auto relative isolate overflow-hidden text-white [--cv-h:420px]" style={photo ? undefined : { backgroundColor: s.bg || "#151515" }}>
      {photo && (
        <>
          <ArtImage src={s.image} alt="" className="-z-10" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-black/50" />
        </>
      )}
      <div className={cn(WRAP, "flex flex-col items-center py-20 text-center sm:py-24")}>
        <div className="flex gap-1 text-amber-400" aria-label={`Rating rata-rata ${r.avg.toFixed(1)} dari 5`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="size-5 fill-current" aria-hidden />
          ))}
        </div>
        {s.title && <h2 className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-5xl">{fill(s.title)}</h2>}
        {s.text && <p className="mt-3 max-w-xl text-base text-white/80">{fill(s.text)}</p>}
        <Cta label={s.ctaLabel} href={s.ctaHref} dark className="mt-7" />
      </div>
    </section>
  );
}

/* ------------------------------- CARDS ------------------------------- */

function Cards({ s }: { s: SectionOf<"cards"> }) {
  const items = s.items.filter((c) => c.title);
  if (!items.length) return null;
  return (
    <section className={cn(WRAP, "cv-auto py-12 [--cv-h:520px] sm:py-16")}>
      {s.title && <h2 className="mb-6 text-center text-2xl font-semibold tracking-tight sm:mb-8 sm:text-3xl">{s.title}</h2>}
      <div className={cn("grid gap-4 sm:gap-5", items.length > 1 && "sm:grid-cols-2", items.length === 3 && "lg:grid-cols-3", items.length >= 4 && "lg:grid-cols-4")}>
        {items.map((c, i) =>
          c.image ? (
            <Link key={i} href={c.href || "#"} className="group relative isolate flex min-h-[300px] items-end overflow-hidden rounded-2xl p-6 text-white sm:min-h-[380px] sm:p-8">
              <Image src={c.image} alt="" fill sizes="(min-width: 640px) 50vw, 100vw" className="-z-10 object-cover transition-transform duration-700 group-hover:scale-105" />
              <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/70 to-transparent" />
              <span>
                <span className="block text-2xl font-semibold tracking-tight">{c.title}</span>
                {c.text && <span className="mt-1.5 block max-w-sm text-sm text-white/80">{c.text}</span>}
                {c.ctaLabel && <span className="mt-4 inline-flex h-[42px] items-center gap-1.5 rounded-[5px] bg-white px-5 text-sm font-medium text-neutral-950">{c.ctaLabel} <ArrowRight className="size-4" aria-hidden /></span>}
              </span>
            </Link>
          ) : (
            <div key={i} className="flex flex-col items-start rounded-2xl bg-muted/60 p-6 sm:p-8">
              <h3 className="text-xl font-semibold tracking-tight">{c.title}</h3>
              {c.text && <p className="mt-2 max-w-sm text-sm text-muted-foreground">{c.text}</p>}
              <Cta label={c.ctaLabel} href={c.href} className="mt-5" />
            </div>
          ),
        )}
      </div>
    </section>
  );
}

/* ---------------------------- BLOK CUSTOM ---------------------------- */

const RATIO: Record<string, string> = { "1:1": "aspect-square", "4:5": "aspect-[4/5]", "4:3": "aspect-[4/3]", "16:9": "aspect-video", "3:1": "aspect-[3/1]" };
const COLS: Record<string, string> = {
  "1": "grid-cols-1",
  "2": "grid-cols-1 sm:grid-cols-2",
  "3": "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  "4": "grid-cols-2 lg:grid-cols-4",
};
// Mode geser di HP & tablet: grid baru berlaku mulai ≥1024px.
const SLIDE_COLS: Record<string, string> = { "1": "", "2": "lg:grid-cols-2", "3": "lg:grid-cols-3", "4": "lg:grid-cols-4" };
const PAD: Record<string, string> = { sm: "py-8 sm:py-10", md: "py-12 sm:py-16", lg: "py-16 sm:py-24" };
// Lebar foto tiap kolom (atribut sizes) agar varian CDN yang diunduh pas.
const SIZES: Record<string, string> = {
  "1": "(min-width: 1600px) 1520px, 100vw",
  "2": "(min-width: 640px) 50vw, 100vw",
  "3": "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  "4": "(min-width: 1024px) 25vw, 50vw",
};

/** Blok Custom: kolom foto + judul + teks berformat + tombol, gaya diatur admin. */
/**
 * `tightPrev`/`tightNext`: bersebelahan dengan bagian "rapat" (hero / Blok Custom foto) → jarak
 * di antaranya = jarak antar-blok (TIGHT_TOP), bukan padding bagian.
 */
function Custom({ s, tightPrev = false, tightNext = false }: { s: SectionOf<"custom">; tightPrev?: boolean; tightNext?: boolean }) {
  const blocks = s.blocks.filter((b) => b.image || b.title || b.text || (b.ctaLabel && b.href));
  if (!blocks.length && !s.title) return null;
  const light = s.textColor === "terang";
  const card = s.style === "kartu";
  const center = s.align === "center";
  const side = s.columns === "1" && !s.imageFirst; // 1 kolom: foto di samping (bergantian)
  const slide = s.columns !== "1" && s.mobileSlide && blocks.length > 1; // HP: geser

  const hasText = (b: (typeof blocks)[number]) => !!(b.eyebrow || b.title || b.text || (b.ctaLabel && b.href));
  const photo = (b: (typeof blocks)[number], extra?: string) =>
    b.image ? (
      b.ratio === "auto" ? (
        <Image src={b.image} alt={b.title || ""} width={b.imgW ?? 1600} height={b.imgH ?? 1200} sizes={side ? "(min-width: 768px) 50vw, 100vw" : SIZES[s.columns]} className={cn("h-auto w-full", !card && "rounded-2xl", extra)} />
      ) : (
        <span className={cn("relative block overflow-hidden bg-muted", !card && "rounded-2xl", RATIO[b.ratio], extra)}>
          <Image src={b.image} alt={b.title || ""} fill sizes={side ? "(min-width: 768px) 50vw, 100vw" : SIZES[s.columns]} className="object-cover" />
        </span>
      )
    ) : null;

  const body = (b: (typeof blocks)[number]) => (
    <div className={cn(center && "text-center", side && "md:self-center")}>
      {b.eyebrow && <p className={cn("text-xs font-bold uppercase tracking-wider", light ? "text-white/70" : "text-muted-foreground")}>{b.eyebrow}</p>}
      {b.title && <h3 className={cn("font-bold tracking-tight text-balance", s.columns === "1" ? "mt-1 text-2xl sm:text-3xl" : "mt-1 text-lg sm:text-xl")}>{b.title}</h3>}
      {b.text && (
        <RichText
          text={b.text}
          className={cn("mt-2 space-y-3 text-sm leading-relaxed sm:text-base", light ? "text-white/80" : "text-foreground/75", center && "[&_ol]:inline-block [&_ol]:text-left [&_ul]:inline-block [&_ul]:text-left")}
        />
      )}
      {b.ctaLabel && b.href && <Cta label={b.ctaLabel} href={b.href} dark={light && !card} className="mt-5" />}
    </div>
  );

  return (
    <section
      className={cn(
        // Deretan foto rapat (tanpa judul/latar) biasanya dekat layar pertama & pendek → tanpa cv-auto
        // (perkiraan tinggi 520px justru menggeser halaman = CLS).
        !isTight(s) && "cv-auto [--cv-h:520px]",
        PAD[s.spacing],
        // Di bawah hero (tanpa latar sendiri/judul): jarak dari hero = jarak antar-blok.
        isTight(s) && tightPrev && TIGHT_TOP,
        isTight(s) && tightNext && "pb-0 sm:pb-0",
        light && "text-white",
      )}
      style={s.bg ? { backgroundColor: s.bg } : undefined}
    >
      <div className={s.width === "full" ? "px-4 sm:px-6 lg:px-10" : WRAP}>
        {(s.title || s.subtitle) && (
          <div className={cn("mb-8 sm:mb-10", center ? "mx-auto max-w-3xl text-center" : "max-w-3xl")}>
            {s.title && <h2 className="text-3xl font-extrabold tracking-[-0.03em] text-balance sm:text-4xl">{s.title}</h2>}
            {s.subtitle && <p className={cn("mt-3 text-base sm:text-lg", light ? "text-white/75" : "text-muted-foreground")}>{s.subtitle}</p>}
          </div>
        )}
        {side ? (
          <div className="space-y-10 sm:space-y-14">
            {blocks.map((b, i) => (
              <div key={i} className={cn("grid items-center md:grid-cols-2", card ? "overflow-hidden rounded-3xl" : "gap-6 md:gap-12", card && hasText(b) && (light ? "bg-white/10" : "bg-background shadow-sm"))}>
                {photo(b, i % 2 ? "md:order-last" : undefined)}
                {hasText(b) && <div className={cn(card && "p-6 sm:p-10")}>{body(b)}</div>}
              </div>
            ))}
          </div>
        ) : (
          <div
            className={cn(
              slide
                ? // HP: baris geser (kartu berikut mengintip di tepi); ≥640px: grid biasa
                  cn("-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 [scrollbar-width:none] sm:-mx-6 sm:gap-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:grid lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden", SLIDE_COLS[s.columns])
                : cn("grid gap-5 sm:gap-6", COLS[s.columns]),
            )}
          >
            {blocks.map((b, i) => (
              <div key={i} className={cn("flex flex-col", slide && cn("shrink-0 snap-start lg:w-auto", s.columns === "4" ? "w-[45%] sm:w-[calc((100%-3rem)/3.3)]" : "w-[62%] sm:w-[calc((100%-1.5rem)/2.2)]"), card ? "overflow-hidden rounded-3xl" : "gap-4", card && hasText(b) && (light ? "bg-white/10" : "bg-background shadow-sm"))}>
                {photo(b)}
                {hasText(b) && <div className={cn(card && "p-4 sm:p-5")}>{body(b)}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* --------------------- ARTIKEL & LANGGANAN (ala Omnix) -------------------- */

/** Garis kecil + teks kapital di atas judul (eyebrow ala Omnix). */
function LineEyebrow({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  if (!children) return null;
  return (
    <p
      className={cn(
        "mb-3.5 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.12em] uppercase before:h-0.5 before:w-[22px] before:rounded-[2px]",
        dark ? "text-[#fdba74] before:bg-[#fdba74]" : "text-brand-ink before:bg-brand",
      )}
    >
      {children}
    </p>
  );
}

const H2_OMNIX = "text-[30px] leading-[1.12] font-semibold tracking-[-0.015em] text-balance sm:text-[34px] lg:text-[48px]";

function Articles({ s, data }: { s: SectionOf<"articles">; data: HomeData }) {
  const items = data.articles.slice(0, s.limit);
  if (!items.length) return null;
  return (
    <section className={cn(WRAP, "cv-auto py-[60px] [--cv-h:900px] sm:py-20 lg:py-[110px]")}>
      <div className="mb-9 flex flex-col items-start gap-4 md:flex-row md:items-end md:justify-between md:gap-[30px] lg:mb-[50px]">
        <div className="max-w-[640px]">
          <LineEyebrow>{s.eyebrow}</LineEyebrow>
          {s.title && <h2 className={cn(H2_OMNIX, "mb-3.5")}>{s.title}</h2>}
          {s.subtitle && <p className="text-[17px] leading-[1.65] text-foreground/75">{s.subtitle}</p>}
        </div>
        {s.ctaLabel && s.ctaHref && (
          <Link
            href={s.ctaHref}
            className="inline-flex shrink-0 items-center gap-2 border-b-2 border-foreground pb-1 text-[14.5px] font-semibold transition-all duration-200 ease-[cubic-bezier(.2,.8,.2,1)] hover:gap-3 hover:border-brand-ink hover:text-brand-ink"
          >
            {s.ctaLabel}
            <ArrowRight className="size-3.5" strokeWidth={2.4} aria-hidden />
          </Link>
        )}
      </div>
      <ArticleGrid items={items} />
    </section>
  );
}

function Newsletter({ s }: { s: SectionOf<"newsletter"> }) {
  // *teks* di judul → gradasi oranye (pengganti biru→cyan referensi, mengikuti warna brand).
  const title = s.title.split(/(\*[^*]+\*)/g);
  const perks = s.perks.split(/\r?\n/).map((p) => p.trim()).filter(Boolean).slice(0, 4);
  return (
    <section
      data-newsletter
      className="overflow-hidden bg-[radial-gradient(900px_460px_at_90%_10%,rgb(242_101_34/0.22),transparent_60%),radial-gradient(700px_380px_at_0%_100%,rgb(251_191_36/0.14),transparent_60%)] bg-[#0b0a09] py-[70px] text-center text-white sm:py-[100px]"
    >
      <div className="mx-auto max-w-[720px] px-4 sm:px-6">
        <LineEyebrow dark>{s.eyebrow}</LineEyebrow>
        {s.title && (
          <h2 className={cn(H2_OMNIX, "mb-3.5 text-white")}>
            {title.map((p, i) =>
              p.length > 2 && p.startsWith("*") && p.endsWith("*") ? (
                <span key={i} className="bg-gradient-to-r from-[#f26522] to-[#fbbf24] bg-clip-text text-transparent">
                  {p.slice(1, -1)}
                </span>
              ) : (
                p
              ),
            )}
          </h2>
        )}
        {s.text && <p className="mb-8 text-base text-white/72 sm:text-[17px]">{s.text}</p>}
        <NewsletterForm sectionId={s.id} placeholder={s.placeholder} buttonLabel={s.buttonLabel} successText={s.successText} />
        {perks.length > 0 && (
          <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-7 gap-y-2.5">
            {perks.map((p) => (
              <li key={p} className="inline-flex items-center gap-1.5 text-[13px] text-white/70">
                <Check className="size-3.5 text-[#fdba74]" strokeWidth={2.4} aria-hidden />
                {p}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/* ------------------------------ RENDER ------------------------------- */

/** Render semua bagian aktif berurutan. Bagian tanpa isi/data otomatis tak tampil. */
export function HomeSections({ sections, data }: { sections: HomeSection[]; data: HomeData }) {
  const active = sections.filter((s) => s.active);
  const firstHero = active.findIndex((s) => s.type === "hero");
  const firstProducts = active.findIndex((s) => s.type === "products");
  return (
    <>
      {active.map((s, i) => {
        switch (s.type) {
          case "hero":
            return <Hero key={s.id} s={s} first={i === firstHero && i === 0} tightNext={isTight(active[i + 1])} />;
          case "products":
            // Deretan produk pertama biasanya di/dekat layar pertama → tanpa cv-auto.
            return <Products key={s.id} s={s} data={data} eager={i === firstProducts && i <= 1} />;
          case "categories":
            return <Categories key={s.id} s={s} />;
          case "features":
            return <Features key={s.id} s={s} />;
          case "quote":
            return <Quote key={s.id} s={s} />;
          case "banner":
            return <Banner key={s.id} s={s} />;
          case "community":
            return <Community key={s.id} s={s} data={data} />;
          case "reviews":
            return <Reviews key={s.id} s={s} data={data} />;
          case "cards":
            return <Cards key={s.id} s={s} />;
          case "custom":
            return <Custom key={s.id} s={s} tightPrev={i > 0 && isTight(active[i - 1])} tightNext={isTight(active[i + 1])} />;
          case "articles":
            return <Articles key={s.id} s={s} data={data} />;
          case "testimonials":
            return <Testimonials key={s.id} s={s} />;
          case "newsletter":
            return <Newsletter key={s.id} s={s} />;
        }
      })}
    </>
  );
}
