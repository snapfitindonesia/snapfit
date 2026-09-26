"use client";

/**
 * Helper upload gambar dari sisi admin (browser):
 * - uploadImageFile: file dari pilih-file / tempel (Ctrl+V)
 * - importImageUrl:  alamat gambar (mis. dari Shopee) → diunduh server → CDN
 * - readPastedImages: ambil gambar/alamat gambar dari event paste
 */

const MAX_SIDE = 1600; // kecilkan dulu di browser: body request Vercel maks ±4,5 MB

/** Perkecil gambar besar (mis. PNG hasil "Salin gambar") sebelum dikirim. */
async function shrink(file: File): Promise<Blob> {
  if (file.size < 1.5 * 1024 * 1024 || typeof createImageBitmap === "undefined") return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.92));
    return blob ?? file;
  } catch {
    return file;
  }
}

async function parse(res: Response): Promise<string> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Upload gagal");
  return data.url as string;
}

export async function uploadImageFile(file: File): Promise<string> {
  const form = new FormData();
  const blob = await shrink(file);
  form.append("file", blob, file.name || "tempel.webp");
  return parse(await fetch("/api/admin/upload", { method: "POST", body: form }));
}

export async function importImageUrl(url: string): Promise<string> {
  return parse(
    await fetch("/api/admin/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    }),
  );
}

export type PastedImages = { files: File[]; urls: string[] };

/**
 * Ambil gambar dari clipboard: file gambar ("Salin gambar") diutamakan; bila tak
 * ada, pakai <img src> dari HTML yang disalin, atau teks berupa alamat http(s).
 */
export function readPastedImages(data: DataTransfer | null): PastedImages {
  if (!data) return { files: [], urls: [] };
  const files = Array.from(data.items ?? [])
    .filter((it) => it.kind === "file" && it.type.startsWith("image/"))
    .map((it) => it.getAsFile())
    .filter((f): f is File => !!f);
  if (files.length) return { files, urls: [] };

  const urls: string[] = [];
  const html = data.getData("text/html");
  if (html) {
    for (const m of html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) {
      if (/^https?:\/\//i.test(m[1])) urls.push(m[1].replace(/&amp;/g, "&"));
    }
  }
  if (!urls.length) {
    for (const line of data.getData("text/plain").split(/\s+/)) {
      if (/^https?:\/\/\S+$/i.test(line)) urls.push(line);
    }
  }
  return { files: [], urls: [...new Set(urls)] };
}

/** True bila clipboard berisi sesuatu yang bisa dijadikan gambar. */
export function hasPastedImages(p: PastedImages): boolean {
  return p.files.length > 0 || p.urls.length > 0;
}
