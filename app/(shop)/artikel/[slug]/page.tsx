import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Image from "@/components/ui/image";
import { ArticleGrid } from "@/components/articles/article-card";
import { jsonLdHtml } from "@/lib/json-ld";
import { TYPE } from "@/lib/typography";
import { ArticleContent, plainText } from "@/lib/article-content";
import { formatArticleDate, getArticleBySlug, getPublishedArticles, readingMinutes } from "@/lib/articles";

// ISR seperti PDP: dirender saat pertama dikunjungi lalu di-cache; simpan di admin memperbarui langsung.
export const revalidate = 300;
export async function generateStaticParams() {
  return [];
}

const SITE = "https://www.snapfit.id";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = await getArticleBySlug((await params).slug);
  if (!a) notFound();
  const raw = a.excerpt || plainText(a.content);
  const description = raw.length > 158 ? `${raw.slice(0, 155).replace(/\s+\S*$/, "")}…` : raw;
  return {
    title: a.title,
    description,
    alternates: { canonical: `/artikel/${a.slug}` },
    openGraph: {
      type: "article",
      title: a.title,
      description,
      url: `/artikel/${a.slug}`,
      publishedTime: a.publishedAt,
      modifiedTime: a.updatedAt,
      authors: [a.author],
      tags: a.tags,
      images: a.coverImage ? [{ url: a.coverImage }] : undefined,
    },
    twitter: { card: "summary_large_image", title: a.title, description, images: a.coverImage ? [a.coverImage] : undefined },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const a = await getArticleBySlug((await params).slug);
  if (!a) notFound();
  const others = (await getPublishedArticles(4).catch(() => [])).filter((o) => o.slug !== a.slug).slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: a.title,
    ...(a.coverImage ? { image: [a.coverImage] } : {}),
    datePublished: a.publishedAt,
    dateModified: a.updatedAt,
    author: { "@type": "Person", name: a.author },
    publisher: { "@type": "Organization", name: "SNAPFIT Indonesia", logo: { "@type": "ImageObject", url: `${SITE}/logo.png` } },
    mainEntityOfPage: `${SITE}/artikel/${a.slug}`,
    ...(a.tags.length ? { keywords: a.tags.join(", ") } : {}),
  };

  return (
    <div className="pb-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdHtml(jsonLd)} />
      <article className="mx-auto max-w-[760px] px-4 pt-8 sm:px-6 sm:pt-12">
        <Link href="/artikel" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" aria-hidden /> Semua artikel
        </Link>
        {a.tags.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-[7px]">
            {a.tags.map((t) => (
              <span key={t} className="rounded-[5px] border border-border px-[13px] py-1 text-[11.5px] font-medium text-foreground/80">
                {t}
              </span>
            ))}
          </div>
        )}
        <h1 className="mt-4 text-[30px] leading-[1.15] font-semibold tracking-[-0.015em] text-balance sm:text-[40px] lg:text-[48px]">{a.title}</h1>
        <p className="mt-4 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground uppercase">{a.author}</span>
          <span aria-hidden>·</span>
          <time dateTime={a.publishedAt}>{formatArticleDate(a.publishedAt)}</time>
          <span aria-hidden>·</span>
          <span>{readingMinutes(a.content)} menit baca</span>
        </p>
      </article>

      {a.coverImage && (
        <div className="mx-auto mt-8 max-w-[1100px] px-4 sm:px-6">
          <Image
            src={a.coverImage}
            alt={a.title}
            width={1200}
            height={750}
            priority
            sizes="(min-width: 1100px) 1100px, 100vw"
            className="aspect-[16/10] w-full rounded-[5px] bg-muted object-cover"
          />
        </div>
      )}

      <div className="article-body mx-auto mt-10 max-w-[760px] px-4 sm:px-6">
        <ArticleContent text={a.content} />
      </div>

      {others.length > 0 && (
        <section className="mx-auto mt-20 max-w-[90rem] px-4 sm:px-6 lg:px-10">
          <h2 className={`${TYPE.h2} mb-8`}>Artikel lainnya</h2>
          <ArticleGrid items={others} />
        </section>
      )}
    </div>
  );
}
