import Link from "next/link";
import { ChevronRight, SlidersHorizontal } from "lucide-react";
import { ProductCard } from "@/components/shop/product-card";
import type { ProductListItem } from "@/lib/actions/product";
import type { Crumb } from "@/lib/seo-pages";

const SITE = "https://www.snapfit.id";

/** Kerangka halaman landing SEO (kategori / merek). Server component. */
export function LandingView({
  path,
  crumbs,
  title,
  intro,
  chips = [],
  items,
  total,
  moreHref,
}: {
  path: string;
  crumbs: Crumb[];
  title: string;
  intro: string;
  chips?: { name: string; href: string; count: number }[];
  items: ProductListItem[];
  total: number;
  moreHref: string;
}) {
  const trail = [{ name: "Beranda", href: "/" }, ...crumbs];
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [...trail, { name: title, href: path }].map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.name,
        item: `${SITE}${c.href}`,
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: title,
      description: intro,
      url: `${SITE}${path}`,
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: total,
        itemListElement: items.slice(0, 30).map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${SITE}/produk/${p.slug}`,
          name: p.name,
        })),
      },
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        {trail.map((c) => (
          <span key={c.href} className="inline-flex items-center gap-1">
            <Link href={c.href} className="hover:text-foreground hover:underline">{c.name}</Link>
            <ChevronRight className="size-3" />
          </span>
        ))}
        <span className="text-foreground">{title}</span>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{intro}</p>
      </header>

      {chips.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {chips.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="rounded-full border border-border px-3 py-1.5 text-sm transition-colors hover:border-foreground"
            >
              {c.name} <span className="text-muted-foreground">({c.count})</span>
            </Link>
          ))}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{total} produk</p>
        <Link href={moreHref} className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline">
          <SlidersHorizontal className="size-4" /> Filter & urutkan
        </Link>
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
          {items.map((p, i) => (
            <ProductCard key={p.id} product={p} priority={i < 4} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Belum ada produk yang tersedia di sini.{" "}
          <Link href="/produk" className="font-medium text-foreground underline">Lihat semua produk</Link>
        </div>
      )}
    </div>
  );
}
