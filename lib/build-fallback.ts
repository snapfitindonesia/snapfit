// Penanganan error data halaman toko (ISR).
// SAAT BUILD (DB bisa tak terjangkau): pakai isi cadangan agar deploy tetap jalan.
// SAAT REGENERASI ISR / runtime: LEMPAR errornya — Next lalu tetap menyajikan versi halaman TERAKHIR
// yang benar. Kalau error ditelan, halaman kosong (menu/produk hilang) justru ikut di-cache ±5 menit.

export function isBuildPhase(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

/** Di dalam `catch`: kembalikan `fallback` hanya saat build; selain itu lempar ulang error. */
export function buildFallback<T>(error: unknown, fallback: T): T {
  if (isBuildPhase()) return fallback;
  throw error;
}
