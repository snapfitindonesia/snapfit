import { Check } from "lucide-react";
import { NewsletterForm } from "@/components/home/newsletter-form";
import { cn } from "@/lib/utils";
import { TYPE } from "@/lib/typography";
import { isDarkColor, type SectionOf } from "@/lib/home/sections";

// Bagian "Langganan email" beranda — dipisah dari home-sections.tsx agar dipakai juga halaman /buy1get1
// (komponen client components/promo-page) dengan isi yang sama (Admin → Konten Beranda).

export function LineEyebrow({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
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

export function NewsletterSection({ s }: { s: SectionOf<"newsletter"> }) {
  // *teks* di judul → gradasi oranye (pengganti biru→cyan referensi, mengikuti warna brand).
  const title = s.title.split(/(\*[^*]+\*)/g);
  const perks = s.perks.split(/\r?\n/).map((p) => p.trim()).filter(Boolean).slice(0, 4);
  // Warna latar bagian (opsional) menggantikan hitam bawaan; latar terang → teks gelap.
  const light = !!s.sectionBg && !isDarkColor(s.sectionBg);
  return (
    <section
      data-newsletter
      className={cn(
        "overflow-hidden bg-[radial-gradient(900px_460px_at_90%_10%,rgb(242_101_34/0.22),transparent_60%),radial-gradient(700px_380px_at_0%_100%,rgb(251_191_36/0.14),transparent_60%)] py-[70px] text-center sm:py-[100px]",
        light ? "text-foreground" : "text-white",
        !s.sectionBg && "bg-[#0b0a09]",
      )}
      style={s.sectionBg ? { backgroundColor: s.sectionBg } : undefined}
    >
      <div className="mx-auto max-w-[720px] px-4 sm:px-6">
        <LineEyebrow dark={!light}>{s.eyebrow}</LineEyebrow>
        {s.title && (
          <h2 className={cn(TYPE.h2, "mb-3.5", light ? "text-foreground" : "text-white")}>
            {title.map((p, i) =>
              p.length > 2 && p.startsWith("*") && p.endsWith("*") ? (
                <span key={i} className={cn("bg-gradient-to-r bg-clip-text text-transparent", light ? "from-[#b93f0e] to-[#e0561a]" : "from-[#f26522] to-[#fbbf24]")}>
                  {p.slice(1, -1)}
                </span>
              ) : (
                p
              ),
            )}
          </h2>
        )}
        {s.text && <p className={cn(TYPE.sub, "mb-8", light ? "text-foreground/75" : "text-white/72")}>{s.text}</p>}
        <NewsletterForm light={light} sectionId={s.id} placeholder={s.placeholder} buttonLabel={s.buttonLabel} successText={s.successText} />
        {perks.length > 0 && (
          <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-7 gap-y-2.5">
            {perks.map((p) => (
              <li key={p} className={cn("inline-flex items-center gap-1.5 text-[13px]", light ? "text-foreground/75" : "text-white/70")}>
                <Check className={cn("size-3.5", light ? "text-brand-ink" : "text-[#fdba74]")} strokeWidth={2.4} aria-hidden />
                {p}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
