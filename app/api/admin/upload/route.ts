import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { compressToWebp, uploadToCdn, cdnConfig, uploadToR2, r2Config } from "@/lib/upload/cdn";

export const runtime = "nodejs";
const BUCKET = "product-images";

// Upload gambar admin:
// 1) kompres → WebP (resize 1200px, q80)
// 2) upload ke Cloudflare R2 (egress gratis) bila dikonfigurasi
// 3) atau CDN cPanel via FTPS bila dikonfigurasi
// 4) fallback: Supabase Storage
export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  }

  let file: File | null = null;
  try {
    const form = await request.formData();
    file = form.get("file") as File | null;
  } catch {
    return NextResponse.json({ error: "Form tidak valid." }, { status: 400 });
  }
  if (!file || file.size === 0) return NextResponse.json({ error: "File kosong." }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Harus file gambar." }, { status: 400 });

  // Kompres → WebP
  let webp: Buffer;
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    webp = await compressToWebp(buf);
  } catch (e) {
    return NextResponse.json({ error: `Gagal memproses gambar: ${e instanceof Error ? e.message : "error"}` }, { status: 500 });
  }

  const filename = `${Date.now()}-${crypto.randomUUID()}.webp`;

  // 1) Cloudflare R2 (bila dikonfigurasi) — egress gratis
  if (r2Config()) {
    try {
      const url = await uploadToR2(webp, filename);
      if (url) return NextResponse.json({ url, via: "r2" });
    } catch (e) {
      console.error("Upload R2 gagal, coba fallback:", e instanceof Error ? e.message : e);
    }
  }

  // 2) CDN cPanel via FTPS (bila dikonfigurasi)
  if (cdnConfig()) {
    try {
      const url = await uploadToCdn(webp, filename);
      if (url) return NextResponse.json({ url, via: "cdn" });
    } catch (e) {
      // jangan gagal total — coba fallback Supabase
      console.error("Upload CDN gagal, fallback Supabase:", e instanceof Error ? e.message : e);
    }
  }

  // 3) Fallback Supabase Storage
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Storage belum dikonfigurasi (CDN & Supabase). Tempel URL manual dulu." },
      { status: 501 },
    );
  }
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, webp, { contentType: "image/webp", upsert: false });
  if (error) return NextResponse.json({ error: `Upload gagal: ${error.message}` }, { status: 500 });

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  return NextResponse.json({ url: data.publicUrl, via: "supabase" });
}
