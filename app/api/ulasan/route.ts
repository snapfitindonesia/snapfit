import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { limitAction } from "@/lib/security/ratelimit";
import { compressToWebp, uploadToR2 } from "@/lib/upload/cdn";
import { findReviewableOrder, REVIEWABLE_STATUSES } from "@/lib/review-token";

export const runtime = "nodejs";

// Ulasan dari pembeli (form /ulasan/[token]). Ulasan + foto dalam SATU request
// → tak ada foto yatim bila form batal. Masuk sebagai "menunggu moderasi".
const MAX_PHOTO_BYTES = 4 * 1024 * 1024; // sudah diperkecil di browser (batas body Vercel ±4,5 MB)

const schema = z.object({
  token: z.string(),
  productId: z.string().min(1).max(64),
  rating: z.coerce.number().int().min(1, "Pilih jumlah bintang").max(5, "Bintang maksimal 5"),
  author: z.string().trim().min(1, "Isi nama").max(40),
  comment: z.string().trim().min(5, "Ulasan minimal 5 karakter").max(1000),
});

const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

export async function POST(request: Request) {
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "anon";
  const rl = await limitAction("review", ip, 10, "600 s");
  if (!rl.success) return fail("Terlalu banyak percobaan. Coba lagi beberapa menit lagi.", 429);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("Data tidak valid.");
  }
  const parsed = schema.safeParse(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Data tidak valid.");
  const d = parsed.data;

  const order = await findReviewableOrder(d.token);
  if (!order) return fail("Tautan ulasan tidak valid.", 404);
  if (!REVIEWABLE_STATUSES.includes(order.status)) return fail("Pesanan ini belum bisa diulas.");
  if (!order.products.some((p) => p.id === d.productId)) return fail("Produk tidak ada di pesanan ini.");
  const exists = await db.review.findFirst({ where: { orderId: order.id, productId: d.productId }, select: { id: true } });
  if (exists) return fail("Produk ini sudah kamu ulas. Terima kasih!", 409);

  // Foto opsional → WebP ≤1200px di R2.
  let photo: string | null = null;
  const file = form.get("photo");
  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith("image/")) return fail("File harus berupa gambar.");
    if (file.size > MAX_PHOTO_BYTES) return fail("Foto terlalu besar. Coba foto lain.");
    try {
      const webp = await compressToWebp(Buffer.from(await file.arrayBuffer()));
      photo = await uploadToR2(webp, `ulasan-${Date.now()}-${crypto.randomUUID()}.webp`);
    } catch (e) {
      console.error("Upload foto ulasan gagal:", e);
      return fail("Foto gagal diunggah. Coba foto lain atau kirim tanpa foto.", 500);
    }
  }

  await db.review.create({
    data: {
      productId: d.productId,
      author: d.author,
      rating: d.rating,
      comment: d.comment,
      approved: false,
      verified: true,
      orderId: order.id,
      photo,
    },
  });
  revalidatePath("/admin/ulasan");
  return NextResponse.json({ ok: true });
}
