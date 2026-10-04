// Server: baca artikel (jurnal) untuk beranda, /artikel & /artikel/[slug]. Cache bertag
// ARTICLES_TAG — dibersihkan saat admin menyimpan/menghapus artikel (lib/actions/articles.ts).
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";

export const ARTICLES_TAG = "articles";

export type ArticleCardData = {
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string | null;
  author: string;
  tags: string[];
  publishedAt: string; // ISO (serializable)
};

const CARD_SELECT = { slug: true, title: true, excerpt: true, coverImage: true, author: true, tags: true, publishedAt: true } as const;
const toCard = (a: { slug: string; title: string; excerpt: string; coverImage: string | null; author: string; tags: string[]; publishedAt: Date }): ArticleCardData => ({
  ...a,
  publishedAt: a.publishedAt.toISOString(),
});

/** Artikel terbit (publishedAt ≤ sekarang), terbaru dulu. */
export const getPublishedArticles = unstable_cache(
  async (take: number, skip = 0): Promise<ArticleCardData[]> => {
    const rows = await db.article.findMany({
      where: { published: true, publishedAt: { lte: new Date() } },
      orderBy: { publishedAt: "desc" },
      select: CARD_SELECT,
      take,
      skip,
    });
    return rows.map(toCard);
  },
  ["articles-published"],
  { revalidate: 3600, tags: [ARTICLES_TAG] },
);

export const countPublishedArticles = unstable_cache(
  async (): Promise<number> => db.article.count({ where: { published: true, publishedAt: { lte: new Date() } } }),
  ["articles-count"],
  { revalidate: 3600, tags: [ARTICLES_TAG] },
);

export type ArticleFull = ArticleCardData & { content: string; updatedAt: string };

export const getArticleBySlug = unstable_cache(
  async (slug: string): Promise<ArticleFull | null> => {
    const a = await db.article.findUnique({ where: { slug } });
    if (!a || !a.published || a.publishedAt > new Date()) return null;
    return { ...toCard(a), content: a.content, updatedAt: a.updatedAt.toISOString() };
  },
  ["article-by-slug"],
  { revalidate: 3600, tags: [ARTICLES_TAG] },
);

/** "18 Jul 2026" */
export function formatArticleDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
}

/** Perkiraan waktu baca (200 kata/menit). */
export function readingMinutes(content: string): number {
  return Math.max(1, Math.round(content.split(/\s+/).filter(Boolean).length / 200));
}
