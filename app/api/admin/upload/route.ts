import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { compressToWebp, uploadToCdn, cdnConfig, uploadToR2, r2Config } from "@/lib/upload/cdn";

export const runtime = "nodejs";
const BUCKET = "product-images";
const MAX_REMOTE_BYTES = 15 * 1024 * 1024;

// Upload gambar admin. Sumber:
//   a) multipart "file"           — pilih file / tempel (Ctrl+V) gambar dari clipboard
//   b) JSON { url: "https://…" }  — tempel alamat gambar (mis. dari Shopee): diunduh server
// Lalu: kompres → WebP (1200px, q80) → R2 (cdn.snapfit.id) / CDN cPanel / Supabase.
export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  }

  let buf: Buffer;
  try {
    buf = (request.headers.get("content-type") ?? "").includes("application/json")
      ? await fetchRemoteImage(request)
      : await readUploadedFile(request);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Gambar tidak valid." }, { status: 400 });
  }

  // Kompres → WebP
  let webp: Buffer;
  try {
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

async function readUploadedFile(request: Request): Promise<Buffer> {
  let file: File | null = null;
  try {
    const form = await request.formData();
    file = form.get("file") as File | null;
  } catch {
    throw new Error("Form tidak valid.");
  }
  if (!file || file.size === 0) throw new Error("File kosong.");
  if (!file.type.startsWith("image/")) throw new Error("Harus file gambar.");
  return Buffer.from(await file.arrayBuffer());
}

/** Unduh gambar dari URL publik (https) — dipakai saat admin menempel alamat gambar. */
async function fetchRemoteImage(request: Request): Promise<Buffer> {
  const { url } = (await request.json().catch(() => ({}))) as { url?: string };
  let u: URL;
  try {
    u = new URL(String(url ?? "").trim());
  } catch {
    throw new Error("Alamat gambar tidak valid.");
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("Alamat gambar harus http(s).");
  // Cegah akses ke jaringan internal (localhost / IP privat).
  if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[?::1\]?$)/i.test(u.hostname)) {
    throw new Error("Alamat gambar tidak diizinkan.");
  }
  const res = await fetch(u, {
    signal: AbortSignal.timeout(20_000),
    headers: { "User-Agent": "Mozilla/5.0 (SNAPFIT admin image import)", Accept: "image/*" },
  }).catch(() => null);
  if (!res || !res.ok) throw new Error(`Gambar tidak bisa diunduh (${res?.status ?? "timeout"}).`);
  const type = res.headers.get("content-type") ?? "";
  if (!type.startsWith("image/")) throw new Error("Alamat itu bukan gambar.");
  const len = Number(res.headers.get("content-length") ?? 0);
  if (len > MAX_REMOTE_BYTES) throw new Error("Gambar terlalu besar (maks 15 MB).");
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_REMOTE_BYTES) throw new Error("Gambar terlalu besar (maks 15 MB).");
  return buf;
}
