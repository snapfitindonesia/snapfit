import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "@/components/ui/image";
import { ProductCard } from "@/components/shop/product-card";
import { ArtImage } from "@/components/home/art-image";
import { ScrollRow } from "@/components/home/scroll-row";
import type { HomeSection, SectionOf } from "@/lib/home/sections";
import type { HomeData } from "@/lib/home/data";

/*
 * Beranda "bercerita" (referensi: Nomad). Lebar gabungan: hero, banner cerita, komunitas &
 * banner ulasan SELEBAR LAYAR; deretan produk, kategori, blok gambar+teks & kartu dibatasi
 * max-w-6xl. Bagian di bawah layar pertama memakai cv-auto (render ditunda sampai dekat).
 */

const WRAP = "mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-10";
// Baris geser yang menembus sampai tepi kanan layar (ala Nomad): kartu pertama sejajar kolom isi.
const BLEED = "px-4 scroll-px-4 sm:px-6 sm:scroll-px-6 lg:px-[max(2.5rem,calc((100vw-90rem)/2+2.5rem))] lg:scroll-px-[max(2.5rem,calc((100vw-90rem)/2+2.5rem))]";

/** Tombol pil (gaya Nomad). `dark` = di atas latar gelap/foto. */
function Cta({ label, href, dark = false, className }: { label: string; href: string; dark?: boolean; className?: string }) {
  if (!label || !href) return null;
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-full px-5 text-sm font-medium transition-colors",
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
    return (
      <section className="relative isolate flex min-h-[560px] items-end overflow-hidden bg-neutral-900 md:min-h-[620px] md:items-center lg:min-h-[680px]">
        <ArtImage src={s.image} srcMobile={s.imageMobile || undefined} alt={s.title || "SNAPFIT"} priority={first} className="-z-10" />
        {/* Gradasi agar teks terbaca di foto apa pun */}
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/70 via-black/25 to-transparent md:bg-gradient-to-r md:from-black/60 md:via-black/20" />
        <div className={cn(WRAP, "w-full pb-12 md:pb-0")}>
          <div className="max-w-xl text-white">
            <Eyebrow dark>{s.eyebrow}</Eyebrow>
            {s.title && <Heading className="mt-3 text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">{s.title}</Heading>}
            {s.subtitle && <p className="mt-4 text-base text-white/85 text-pretty sm:text-lg">{s.subtitle}</p>}
            <Cta label={s.ctaLabel} href={s.ctaHref} dark className="mt-7" />
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
    <section className={cn("py-12 sm:py-16", !eager && "cv-auto [--cv-h:560px]")}>
      <div className={WRAP}>
        <SectionHead title={s.title} subtitle={s.subtitle} ctaLabel={s.ctaLabel} ctaHref={s.ctaHref} />
      </div>
      <ScrollRow label={s.title || "Produk"} className={BLEED}>
        {items.map((p, i) => (
          <div key={p.id} className="w-[44vw] shrink-0 snap-start sm:w-[30vw] lg:w-[17rem] xl:w-[19rem]">
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
              className="group flex h-12 items-center gap-3 rounded-full border border-border bg-background pl-5 pr-2 text-sm font-medium transition-colors hover:border-foreground sm:h-14"
            >
              {c.label}
              {c.image ? (
                <span className="relative size-9 overflow-hidden rounded-full bg-muted sm:size-10">
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
          <ArtImage src={s.image} srcMobile={s.imageMobile || undefined} alt={s.title || "SNAPFIT"} className="-z-10" />
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
  return (
    <section className="cv-auto py-12 [--cv-h:420px] sm:py-16">
      <div className={WRAP}>
        <SectionHead title={s.title} subtitle={s.subtitle} />
      </div>
      <ScrollRow label={s.title || "Komunitas"} className={BLEED}>
        {shots.map((x, i) => {
          const body = (
            <>
              <span className="relative block aspect-[4/5] overflow-hidden rounded-xl bg-muted">
                <Image src={x.image} alt={x.caption ? `Foto dari ${x.caption}` : "Foto pelanggan SNAPFIT"} fill sizes="(min-width: 1024px) 18vw, 42vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
              </span>
              {x.caption && <span className="mt-2 block truncate text-xs text-muted-foreground">{x.caption}</span>}
            </>
          );
          return (
            <div key={i} className="group w-[42vw] shrink-0 snap-start sm:w-[28vw] lg:w-[16rem] xl:w-[18rem]">
              {x.href ? <Link href={x.href}>{body}</Link> : body}
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
                {c.ctaLabel && <span className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-medium text-neutral-950">{c.ctaLabel} <ArrowRight className="size-4" aria-hidden /></span>}
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
        }
      })}
    </>
  );
}
