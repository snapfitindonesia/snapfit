import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db";
import { ArticleForm, type ArticleFormData } from "@/components/admin/article-form";

export const dynamic = "force-dynamic";

/** yyyy-mm-dd menurut WIB. */
const ymd = (d: Date) => new Date(d.getTime() + 7 * 3600_000).toISOString().slice(0, 10);

export default async function AdminArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let initial: ArticleFormData = {
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    coverImage: "",
    author: "Tim SNAPFIT",
    tags: "",
    published: false,
    publishedAt: ymd(new Date()),
  };
  if (id !== "baru") {
    const a = await db.article.findUnique({ where: { id } });
    if (!a) notFound();
    initial = {
      id: a.id,
      title: a.title,
      slug: a.slug,
      excerpt: a.excerpt,
      content: a.content,
      coverImage: a.coverImage ?? "",
      author: a.author,
      tags: a.tags.join(", "),
      published: a.published,
      publishedAt: ymd(a.publishedAt),
    };
  }
  return (
    <div>
      <Link href="/admin/artikel" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Semua artikel
      </Link>
      <h1 className="mt-2 mb-6 text-xl font-semibold">{initial.id ? "Edit artikel" : "Tulis artikel"}</h1>
      <ArticleForm key={initial.id ?? "baru"} initial={initial} />
    </div>
  );
}
