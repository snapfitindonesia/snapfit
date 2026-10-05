import type { SectionOf } from "@/lib/home/sections";
import { Stars, TestimonialsMarquee } from "@/components/home/testimonials-marquee";

// Ulasan pelanggan (ditulis admin) — kepala bagian di server, kolom berjalan di testimonials-marquee.tsx.
export function Testimonials({ s }: { s: SectionOf<"testimonials"> }) {
  const items = s.items.filter((t) => t.name && t.text);
  if (!items.length) return null;
  const trust = s.trust.split(/(\*\*[^*]+\*\*)/g);
  return (
    <section className={`cv-auto relative overflow-hidden py-[72px] [--cv-h:900px] sm:py-24 lg:pt-[110px] lg:pb-[120px] ${s.sectionBg ? "" : "bg-muted"}`}>
      <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-10">
        <div className="relative z-[2] mx-auto mb-14 max-w-[720px] text-center">
          {s.eyebrow && (
            <div className="mb-[22px] inline-flex items-center gap-[9px] rounded-[5px] border border-foreground/[0.08] bg-card py-[7px] pr-3.5 pl-[11px] text-[11.5px] font-bold tracking-[0.06em] uppercase shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <span className="testi-pulse size-[7px] rounded-full bg-brand" aria-hidden />
              {s.eyebrow}
            </div>
          )}
          {s.title && (
            <h2 className="mb-4 text-[30px] leading-[1.12] font-semibold tracking-[-0.015em] text-balance sm:text-[34px] lg:text-[48px]">{s.title}</h2>
          )}
          {s.subtitle && <p className="mx-auto mb-5 max-w-[560px] text-[15px] leading-[1.6] text-muted-foreground">{s.subtitle}</p>}
          {s.trust && (
            <p className="inline-flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1 text-sm text-foreground/75">
              <Stars n={5} className="text-base" />
              <span>
                {trust.map((p, i) =>
                  p.startsWith("**") && p.endsWith("**") ? (
                    <b key={i} className="font-bold text-foreground">
                      {p.slice(2, -2)}
                    </b>
                  ) : (
                    p
                  ),
                )}
              </span>
            </p>
          )}
        </div>
        <TestimonialsMarquee items={items} />
      </div>
    </section>
  );
}
