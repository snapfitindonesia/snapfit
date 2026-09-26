/**
 * Kontak toko — SATU sumber untuk semua tombol/tautan WhatsApp di storefront
 * (tombol melayang, halaman produk, lacak pesanan, bantuan, grosir, data Google).
 * Ganti nomor di sini (atau env NEXT_PUBLIC_STORE_WA, format 62…).
 */
export const STORE_WA = process.env.NEXT_PUBLIC_STORE_WA || "628164806156";

/** Format tampilan internasional, mis. "+62-816-4806-156". */
export const STORE_WA_DISPLAY = `+62-${STORE_WA.slice(2, 5)}-${STORE_WA.slice(5, 9)}-${STORE_WA.slice(9)}`;

/** URL chat WhatsApp toko dengan pesan terisi. */
export function waChatUrl(message: string): string {
  return `https://wa.me/${STORE_WA}?text=${encodeURIComponent(message)}`;
}
