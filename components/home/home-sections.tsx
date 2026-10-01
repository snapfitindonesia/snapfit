import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
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
        "inline-flex h-[42px] items-center gap-1.5 rounded-full px-5 text-sm font-medium transition-colors",
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

/* ------------------------------- HERO -------------------------------- */

function Hero({ s, first }: { s: SectionOf<"hero">; first: boolean }) {
  const dark = s.theme === "gelap";
  const Heading = first ? "h1" : "h2";
  if (s.mode === "foto" && s.image) {
    // Gaya Nomad (diukur dari nomadgoods.com): foto full-bleed mulai dari paling atas layar, di belakang
    // bilah pengumuman & header kapsul; tinggi ±90% layar (95% di HP). Teks: desktop kiri-tengah dalam
    // kolom 1600px sejajar isi (tepi 40px), HP rata tengah di atas. Badge → subjudul → judul besar → tombol pil putih.
    // Tema terang (foto berlatar terang) → teks gelap & bilah pengumuman tetap hitam.
    const light = s.theme === "terang";
    const overlay = first && !light;
    return (
      <section
        {...(overlay ? { "data-hero-overlay": "" } : {})}
        className={cn(
          // Tinggi = rasio foto (desktop 2400×1350 = 16:9, HP 1080×1920 = 9:16) → foto tampil UTUH,
          // tak terpotong. Tanpa foto HP: HP pakai tinggi 95% layar (foto desktop dipotong otomatis).
          "relative isolate flex overflow-hidden md:aspect-video lg:items-center",
          s.imageMobile ? "aspect-[9/16]" : "h-[95svh] max-h-[1000px] min-h-[640px] md:h-auto md:max-h-none md:min-h-0",
          first && "-mt-[calc(var(--announce-h)+var(--nav-h))]",
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
            {/* Gelap tipis di atas (bilah pengumuman & header) + di sisi teks agar selalu terbaca */}
            <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-48 bg-gradient-to-b from-black/45 to-transparent" />
            <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-black/35 via-transparent to-transparent lg:bg-gradient-to-r lg:from-black/40 lg:via-black/10 lg:to-transparent" />
          </>
        )}
        <div
          className={cn(
            "mx-auto w-full max-w-[100rem] px-5 text-center sm:px-8 lg:px-10 lg:text-left",
            first ? "pt-[calc(var(--announce-h)+var(--nav-h)+2rem)] lg:pt-[calc(var(--announce-h)+var(--nav-h))]" : "pt-12 lg:pt-0",
          )}
        >
          <div className="mx-auto max-w-[40rem] lg:mx-0 lg:max-w-[48rem]">
            {s.eyebrow && (
              <span
                className="inline-block rounded-full px-2.5 pb-[3px] pt-1 text-[11px] font-bold uppercase leading-none tracking-wide text-white lg:text-xs"
                style={{ backgroundColor: s.badgeBg || "#005bd3" }}
              >
                {s.eyebrow}
              </span>
            )}
            {s.kicker && <p className="mt-2 text-xl font-bold leading-[0.95] tracking-[-0.04em] sm:text-2xl lg:mt-1.5 lg:text-[33px]">{s.kicker}</p>}
            {s.title && (
              <Heading className="mt-1 text-[40px] font-extrabold leading-[0.95] tracking-[-0.04em] text-balance sm:text-6xl lg:text-[77px]">
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
                  "mt-5 inline-flex h-[42px] items-center rounded-full px-6 text-base font-bold transition-opacity hover:opacity-85",
                  light ? "bg-foreground text-background" : "bg-white text-neutral-950",
                )}
              >
                {s.ctaLabel}
              </Link>
            )}
          </div>
        </div>
      </section>
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
          <div key={p.id} className="w-[44vw] shrink-0 snap-start sm:w-[30vw] lg:w-[calc((100%-3.75rem)/4.4)]">
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
              className="group flex h-[42px] items-center gap-3 rounded-full border border-border bg-background pl-5 pr-1.5 text-sm font-medium transition-colors hover:border-foreground"
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
            {f.eyebrow && <span className="rounded-full bg-foreground px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-background">{f.eyebrow}</span>}
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
  // Gaya "From the Nomad Community": judul besar di tengah, baris foto SELEBAR LAYAR (terpotong di
  // tepi), kartu 4:5 bersudut, keterangan di bawah, panah bulat putih di tepi. Foto → halaman produk.
  return (
    <section className="cv-auto py-14 [--cv-h:560px] sm:py-20">
      {s.title && (
        <h2 className="mb-7 px-4 text-center text-3xl font-extrabold tracking-[-0.03em] text-balance sm:mb-9 sm:text-4xl lg:text-[46px]">
          {s.title}
        </h2>
      )}
      {s.subtitle && <p className="-mt-4 mb-8 px-4 text-center text-sm text-muted-foreground sm:-mt-5">{s.subtitle}</p>}
      <ScrollRow label={s.title || "Galeri SNAPFIT"} edge className="px-4 scroll-px-4">
        {shots.map((x, i) => {
          // Ada keterangan → itulah teks tautannya; alt dikosongkan agar tak dibaca dua kali.
          const alt = x.caption ? "" : "Foto SNAPFIT";
          const body = (
            <>
              <span className="relative block aspect-[4/5] overflow-hidden rounded-2xl bg-muted">
                <Image
                  src={x.image}
                  alt={alt}
                  fill
                  sizes="(min-width: 1024px) 300px, (min-width: 640px) 30vw, 44vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </span>
              {x.caption && <span className="mt-3 block truncate text-sm text-foreground/80">{x.caption}</span>}
            </>
          );
          return (
            <div key={i} className="group w-[44vw] shrink-0 snap-start sm:w-[30vw] lg:w-[clamp(220px,14.2vw,300px)]">
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
                {c.ctaLabel && <span className="mt-4 inline-flex h-[42px] items-center gap-1.5 rounded-full bg-white px-5 text-sm font-medium text-neutral-950">{c.ctaLabel} <ArrowRight className="size-4" aria-hidden /></span>}
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
const PAD: Record<string, string> = { sm: "py-8 sm:py-10", md: "py-12 sm:py-16", lg: "py-16 sm:py-24" };
// Lebar foto tiap kolom (atribut sizes) agar varian CDN yang diunduh pas.
const SIZES: Record<string, string> = {
  "1": "(min-width: 1600px) 1520px, 100vw",
  "2": "(min-width: 640px) 50vw, 100vw",
  "3": "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  "4": "(min-width: 1024px) 25vw, 50vw",
};

/** Blok Custom: kolom foto + judul + teks berformat + tombol, gaya diatur admin. */
function Custom({ s }: { s: SectionOf<"custom"> }) {
  const blocks = s.blocks.filter((b) => b.image || b.title || b.text || (b.ctaLabel && b.href));
  if (!blocks.length && !s.title) return null;
  const light = s.textColor === "terang";
  const card = s.style === "kartu";
  const center = s.align === "center";
  const side = s.columns === "1" && !s.imageFirst; // 1 kolom: foto di samping (bergantian)

  const photo = (b: (typeof blocks)[number], extra?: string) =>
    b.image ? (
      b.ratio === "auto" ? (
        <Image src={b.image} alt={b.title || ""} width={1600} height={1200} sizes={side ? "(min-width: 768px) 50vw, 100vw" : SIZES[s.columns]} className={cn("h-auto w-full rounded-2xl", extra)} />
      ) : (
        <span className={cn("relative block overflow-hidden rounded-2xl bg-muted", RATIO[b.ratio], extra)}>
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
      className={cn("cv-auto [--cv-h:520px]", PAD[s.spacing], light && "text-white")}
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
              <div key={i} className={cn("grid items-center gap-6 md:grid-cols-2 md:gap-12", card && "rounded-3xl p-5 sm:p-8", card && (light ? "bg-white/10" : "bg-background shadow-sm"))}>
                {photo(b, i % 2 ? "md:order-last" : undefined)}
                {body(b)}
              </div>
            ))}
          </div>
        ) : (
          <div className={cn("grid gap-5 sm:gap-6", COLS[s.columns])}>
            {blocks.map((b, i) => (
              <div key={i} className={cn("flex flex-col gap-4", card && "rounded-3xl p-4 sm:p-5", card && (light ? "bg-white/10" : "bg-background shadow-sm"))}>
                {photo(b)}
                {body(b)}
              </div>
            ))}
          </div>
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
            return <Hero key={s.id} s={s} first={i === firstHero && i === 0} />;
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
            return <Custom key={s.id} s={s} />;
        }
      })}
    </>
  );
}
