import type { Metadata } from "next";
import Link from "next/link";
import { ArticleGrid } from "@/components/articles/article-card";
import { countPublishedArticles, getPublishedArticles } from "@/lib/articles";

export const revalidate = 300;

const PER_PAGE = 12;

export const metadata: Metadata = {
  title: "Artikel",
  description: "Panduan memilih case & aksesori HP, tips merawat perangkat, dan cerita terbaru dari SNAPFIT Indonesia.",
  alternates: { canonical: "/artikel" },
};

export default async function ArticlesPage({ searchParams }: { searchParams: Promise<{ hal?: string }> }) {
  const page = Math.max(1, Number((await searchParams).hal) || 1);
  const [items, total] = await Promise.all([
    getPublishedArticles(PER_PAGE, (page - 1) * PER_PAGE).catch(() => []),
    countPublishedArticles().catch(() => 0),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="mx-auto max-w-[90rem] px-4 py-12 sm:px-6 sm:py-16 lg:px-10">
      <div className="mb-9 max-w-[640px] sm:mb-12">
        <p className="mb-3.5 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-brand-ink uppercase before:h-0.5 before:w-[22px] before:rounded-[2px] before:bg-brand">
          Jurnal SNAPFIT
        </p>
        <h1 className="text-[30px] leading-[1.12] font-semibold tracking-[-0.015em] sm:text-[34px] lg:text-[48px]">Artikel & panduan</h1>
        <p className="mt-3.5 text-[17px] leading-[1.65] text-foreground/75">
          Panduan memilih case & aksesori, tips merawat perangkat, dan cerita terbaru dari kami.
        </p>
      </div>

      {items.length ? (
        <ArticleGrid items={items} headingLevel={2} />
      ) : (
        <h2 className="rounded-[5px] border border-dashed border-border p-10 text-center text-sm font-normal text-muted-foreground">Belum ada artikel.</h2>
      )}

      {pages > 1 && (
        <nav aria-label="Halaman" className="mt-12 flex justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={n === 1 ? "/artikel" : `/artikel?hal=${n}`}
              aria-current={n === page ? "page" : undefined}
              className={
                n === page
                  ? "grid size-10 place-items-center rounded-[5px] bg-foreground text-sm font-medium text-background"
                  : "grid size-10 place-items-center rounded-[5px] border border-border text-sm hover:border-foreground"
              }
            >
              {n}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
