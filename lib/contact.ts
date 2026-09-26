/** Kontak toko (dipakai tombol WhatsApp di storefront). Override via env. */
export const STORE_WA = process.env.NEXT_PUBLIC_STORE_WA || "6285179779770";

/** URL chat WhatsApp toko dengan pesan terisi. */
export function waChatUrl(message: string): string {
  return `https://wa.me/${STORE_WA}?text=${encodeURIComponent(message)}`;
}
