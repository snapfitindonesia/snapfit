import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { productSlug } from "@/lib/slug";

type Client = Prisma.TransactionClient | typeof db;

/** ID angka berikutnya (mulai 1001). Dipanggil saat produk dibuat. */
export async function nextShortId(client: Client = db): Promise<number> {
  const r = await client.product.aggregate({ _max: { shortId: true } });
  return Math.max(1000, r._max.shortId ?? 1000) + 1;
}

/** Teks URL dari judul; bila dipakai produk LAIN → akhiran -2, -3, … (kolom slug tetap unik). */
export async function slugForName(name: string, excludeId?: string, client: Client = db): Promise<string> {
  const base = productSlug(name) || "produk";
  for (let i = 1; i < 50; i++) {
    const cand = i === 1 ? base : `${base}-${i}`;
    const hit = await client.product.findUnique({ where: { slug: cand }, select: { id: true } });
    if (!hit || hit.id === excludeId) return cand;
  }
  return `${base}-${Date.now().toString(36)}`;
}
