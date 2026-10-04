import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const fmt = (d: Date) => d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });

export default async function AdminArticlesPage() {
  const rows = await db.article.findMany({
    orderBy: { publishedAt: "desc" },
    select: { id: true, title: true, slug: true, published: true, publishedAt: true, coverImage: true, tags: true },
  });
  const now = new Date();
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Artikel</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tampil di <a href="/artikel" target="_blank" className="underline">snapfit.id/artikel</a> dan bagian “Artikel terbaru” di Konten Beranda.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/artikel/baru"><Plus className="size-4" /> Tulis artikel</Link>
        </Button>
      </div>
      <div className="mt-6 divide-y divide-border rounded-lg border border-border">
        {rows.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">Belum ada artikel.</p>}
        {rows.map((a) => {
          const status = !a.published ? "Draf" : a.publishedAt > now ? "Terjadwal" : "Terbit";
          return (
            <Link key={a.id} href={`/admin/artikel/${a.id}`} className="flex items-center gap-4 p-3 hover:bg-muted/50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {a.coverImage ? <img src={a.coverImage} alt="" className="aspect-[16/10] w-20 shrink-0 rounded-md bg-muted object-cover" /> : <span className="aspect-[16/10] w-20 shrink-0 rounded-md bg-muted" />}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{a.title}</span>
                <span className="block truncate text-xs text-muted-foreground">/artikel/{a.slug}{a.tags.length ? ` · ${a.tags.join(", ")}` : ""}</span>
              </span>
              <span className="hidden text-xs text-muted-foreground sm:block">{fmt(a.publishedAt)}</span>
              <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${status === "Terbit" ? "bg-green-100 text-green-800" : status === "Terjadwal" ? "bg-amber-100 text-amber-800" : "bg-muted text-muted-foreground"}`}>
                {status}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
