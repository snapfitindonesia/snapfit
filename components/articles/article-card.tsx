import Link from "next/link";
import Image from "@/components/ui/image";
import { formatArticleDate, type ArticleCardData } from "@/lib/articles";

/**
 * Kartu artikel (beranda & /artikel) — referensi Omnix "From the journal": hover kartu naik 5px +
 * bayangan lembut, foto membesar 1.06×, judul & tag berubah ke warna aksen.
 */
export function ArticleCard({ a, headingLevel = 3 }: { a: ArticleCardData; headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[5px] border border-border bg-card transition-[transform,box-shadow,border-color] duration-[280ms] ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-[5px] hover:border-transparent hover:shadow-[0_20px_50px_rgba(8,10,15,0.12)]">
      <div className="aspect-[16/10] shrink-0 overflow-hidden bg-muted">
        {a.coverImage && (
          <Image
            src={a.coverImage}
            alt=""
            width={750}
            height={469}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="size-full object-cover transition-transform duration-[650ms] ease-[cubic-bezier(.25,.46,.45,.94)] group-hover:scale-[1.06]"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 px-6 pt-[26px] pb-[22px]">
        <div className="flex items-center justify-between gap-3 text-xs tracking-[0.02em] text-muted-foreground">
          <time dateTime={a.publishedAt} className="whitespace-nowrap">{formatArticleDate(a.publishedAt)}</time>
          {a.author && <span className="truncate font-semibold uppercase text-foreground">{a.author}</span>}
        </div>
        <H className="text-[19px] leading-[1.3] font-bold text-foreground transition-colors duration-[220ms] group-hover:text-brand-ink">
          {/* Seluruh kartu dapat diklik (tautan meluas lewat ::after) */}
          <Link href={`/artikel/${a.slug}`} className="after:absolute after:inset-0">
            {a.title}
          </Link>
        </H>
        {a.excerpt && <p className="line-clamp-4 flex-1 text-sm leading-[1.65] text-muted-foreground">{a.excerpt}</p>}
        {a.tags.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-[7px] pt-1.5">
            {a.tags.map((t) => (
              <span
                key={t}
                className="rounded-[5px] border border-border px-[13px] py-1 text-[11.5px] font-medium text-foreground/80 transition-colors duration-200 group-hover:border-brand-ink group-hover:text-brand-ink"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

/** Grid kartu: 3 kolom desktop, 2 tablet, 1 HP (sama dengan referensi). */
export function ArticleGrid({ items, headingLevel }: { items: ArticleCardData[]; headingLevel?: 2 | 3 }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-7">
      {items.map((a) => (
        <ArticleCard key={a.slug} a={a} headingLevel={headingLevel} />
      ))}
    </div>
  );
}
