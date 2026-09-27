import Link from "next/link";
import { db } from "@/lib/db";
import Image from "@/components/ui/image";
import { ReviewForm } from "@/components/shop/review-form";
import { findReviewableOrder, REVIEWABLE_STATUSES } from "@/lib/review-token";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tulis ulasan", robots: { index: false, follow: false } };

// Tautan dari email/WA ajakan ulas. Token acak per pesanan = bukti pembelian
// (tanpa login). Tiap produk di pesanan bisa diulas sekali.
export default async function UlasanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const order = await findReviewableOrder(token);

  if (!order || !REVIEWABLE_STATUSES.includes(order.status)) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
        <h1 className="text-xl font-semibold tracking-tight">Tautan ulasan tidak valid</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {order ? "Pesanan ini belum dikirim, jadi belum bisa diulas." : "Periksa kembali tautan dari email atau WhatsApp kami."}
        </p>
        <Link href="/" className="mt-8 inline-block text-sm font-medium underline underline-offset-4">Kembali ke toko</Link>
      </main>
    );
  }

  const done = await db.review.findMany({ where: { orderId: order.id }, select: { productId: true } });
  const reviewed = new Set(done.map((r) => r.productId));
  // Nama tampil default: nama depan + inisial belakang (privasi), bisa diubah.
  const parts = String((order.address as { name?: string } | null)?.name ?? "").trim().split(/\s+/).filter(Boolean);
  const defaultName = parts.length ? `${parts[0]}${parts[1] ? ` ${parts[1][0].toUpperCase()}.` : ""}` : "";

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-2xl font-semibold tracking-tight">Bagaimana pesananmu?</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Ulasan jujurmu sangat membantu pembeli lain. Ulasan tampil di halaman produk setelah kami periksa.
      </p>
      <div className="mt-8 space-y-6">
        {order.products.map((p) => (
          <section key={p.id} id={`p-${p.slug}`} className="scroll-mt-24 rounded-2xl border border-border p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <span className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                <Image src={p.coverImage} alt="" fill sizes="56px" className="object-contain p-1" />
              </span>
              <h2 className="line-clamp-2 text-sm font-medium">{p.name}</h2>
            </div>
            {reviewed.has(p.id) ? (
              <p className="mt-4 rounded-lg bg-muted/50 px-4 py-3 text-sm">✓ Sudah diulas — terima kasih!</p>
            ) : (
              <ReviewForm token={token} productId={p.id} productName={p.name} defaultName={defaultName} />
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
