import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Search } from "lucide-react";
import { db } from "@/lib/db";
import { ReviewManager, type ReviewRow, type ProductOption } from "@/components/admin/review-manager";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

const STATUS = [
  { key: "semua", label: "Semua", where: {} },
  { key: "menunggu", label: "Menunggu persetujuan", where: { approved: false } },
  { key: "tampil", label: "Tampil", where: { approved: true } },
] as const;
const SOURCE = [
  { key: "semua", label: "Semua sumber", where: {} },
  { key: "web", label: "Web", where: { source: null } },
  { key: "tiktok", label: "TikTok Shop", where: { source: "tiktok" } },
] as const;
const RATINGS = ["5", "4", "3", "2", "1"] as const;

type SP = { status?: string; sumber?: string; bintang?: string; q?: string; page?: string };

export default async function AdminUlasanPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const status = STATUS.find((s) => s.key === sp.status) ?? STATUS[0];
  const source = SOURCE.find((s) => s.key === sp.sumber) ?? SOURCE[0];
  const rating = RATINGS.find((r) => r === sp.bintang) ?? null;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const page = Math.max(1, Math.min(10_000, Number(sp.page) || 1));

  const where: Prisma.ReviewWhereInput = {
    ...status.where,
    ...source.where,
    ...(rating ? { rating: Number(rating) } : {}),
    ...(q
      ? {
          OR: [
            { comment: { contains: q, mode: "insensitive" } },
            { author: { contains: q, mode: "insensitive" } },
            { product: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  // Hanya 1 halaman yang dimuat (dulu SEMUA ulasan sekaligus → halaman sangat panjang).
  const [products, reviews, total, pending] = await Promise.all([
    db.product.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.review.findMany({
      where,
      orderBy: [{ approved: "asc" }, { createdAt: "desc" }], // menunggu persetujuan di atas
      include: { product: { select: { name: true } } },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.review.count({ where }),
    db.review.count({ where: { approved: false } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  /** URL halaman ini dengan filter sekarang + perubahan `p` (ganti filter → kembali ke halaman 1). */
  const href = (p: Partial<SP>) => {
    const next: SP = { status: status.key, sumber: source.key, bintang: rating ?? undefined, q: q || undefined, ...p };
    const u = new URLSearchParams();
    if (next.status && next.status !== "semua") u.set("status", next.status);
    if (next.sumber && next.sumber !== "semua") u.set("sumber", next.sumber);
    if (next.bintang) u.set("bintang", next.bintang);
    if (next.q) u.set("q", next.q);
    if (next.page && next.page !== "1") u.set("page", next.page);
    const qs = u.toString();
    return qs ? `/admin/ulasan?${qs}` : "/admin/ulasan";
  };
  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs ${active ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted"}`;

  const productOptions: ProductOption[] = products.map((p) => ({ id: p.id, name: p.name }));
  const rows: ReviewRow[] = reviews.map((r) => ({
    id: r.id,
    productId: r.productId,
    productName: r.product.name,
    author: r.author,
    image: r.image,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt.toISOString(),
    approved: r.approved,
    verified: r.verified,
    photo: r.photo,
    source: r.source,
  }));
  const filtered = status.key !== "semua" || source.key !== "semua" || !!rating || !!q;

  const toolbar = (
    <div className="mb-3 space-y-2.5 rounded-lg border border-border p-3">
      {/* Pencarian: form GET biasa → filter lain ikut terbawa lewat input tersembunyi */}
      <form action="/admin/ulasan" className="flex gap-2">
        {status.key !== "semua" && <input type="hidden" name="status" value={status.key} />}
        {source.key !== "semua" && <input type="hidden" name="sumber" value={source.key} />}
        {rating && <input type="hidden" name="bintang" value={rating} />}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Cari produk, nama, atau isi ulasan…"
            aria-label="Cari ulasan"
            className="w-full rounded-md border border-border bg-background py-2 pl-8 pr-3 text-sm outline-none focus:border-foreground"
          />
        </div>
        <button type="submit" className="rounded-md border border-border px-3 text-sm hover:bg-muted">Cari</button>
      </form>
      <nav className="flex flex-wrap gap-1.5" aria-label="Filter status">
        {STATUS.map((s) => (
          <Link key={s.key} href={href({ status: s.key, page: undefined })} className={chip(s.key === status.key)}>
            {s.label}
            {s.key === "menunggu" && pending > 0 && <span className="ml-1 rounded-full bg-amber-400 px-1.5 text-[10px] font-semibold text-amber-950">{pending}</span>}
          </Link>
        ))}
      </nav>
      <nav className="flex flex-wrap gap-1.5" aria-label="Filter sumber & bintang">
        {SOURCE.map((s) => (
          <Link key={s.key} href={href({ sumber: s.key, page: undefined })} className={chip(s.key === source.key)}>
            {s.label}
          </Link>
        ))}
        <span className="mx-1 w-px bg-border" aria-hidden />
        <Link href={href({ bintang: undefined, page: undefined })} className={chip(!rating)}>Semua ★</Link>
        {RATINGS.map((r) => (
          <Link key={r} href={href({ bintang: r, page: undefined })} className={chip(r === rating)}>
            {r} ★
          </Link>
        ))}
      </nav>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{total.toLocaleString("id-ID")} ulasan{filtered ? " cocok" : ""}</span>
        {filtered && <Link href="/admin/ulasan" className="underline underline-offset-2 hover:text-foreground">Hapus filter</Link>}
      </div>
    </div>
  );

  const footer =
    pages > 1 ? (
      <div className="mt-3 flex items-center justify-between text-sm">
        {page > 1 ? (
          <Link href={href({ page: String(page - 1) })} className="rounded-md border border-border px-3 py-1.5 hover:bg-muted">← Sebelumnya</Link>
        ) : (
          <span />
        )}
        <span className="text-muted-foreground">Halaman {page} dari {pages}</span>
        {page < pages ? (
          <Link href={href({ page: String(page + 1) })} className="rounded-md border border-border px-3 py-1.5 hover:bg-muted">Berikutnya →</Link>
        ) : (
          <span />
        )}
      </div>
    ) : null;

  return (
    <div>
      <h1 className="text-xl font-semibold">Ulasan Produk</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Ulasan dari pembeli (lewat tautan di email/WA ajakan ulas) masuk sebagai <b>menunggu persetujuan</b> — setujui agar tampil di halaman produk. Bisa juga menambah ulasan manual di sini.
      </p>
      <div className="mt-6">
        <ReviewManager
          products={productOptions}
          rows={rows}
          toolbar={toolbar}
          footer={footer}
          emptyText={filtered ? "Tidak ada ulasan yang cocok dengan filter." : "Belum ada ulasan."}
        />
      </div>
    </div>
  );
}
