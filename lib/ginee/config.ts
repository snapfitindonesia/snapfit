// Konfigurasi Ginee OpenAPI. Kredensial (Access Key + Secret Key) HANYA dari
// .env / Vercel env — jangan pernah di-commit. Tanpa key → integrasi OFF
// (fail-closed): semua pemanggilan API di-skip dengan aman.
//
// Cara dapat kredensial: ajukan akses Open API ke Ginee (via support/account
// manager). Hasilnya Access Key + Secret Key. Lihat lib/ginee/client.ts.

/** Host produksi Ginee untuk Indonesia. */
export const GINEE_HOST = process.env.GINEE_HOST ?? "https://api.ginee.com";

/** Kode negara wajib di header X-Advai-Country. */
export const GINEE_COUNTRY = process.env.GINEE_COUNTRY ?? "ID";

export const GINEE_ACCESS_KEY = process.env.GINEE_ACCESS_KEY ?? "";
export const GINEE_SECRET_KEY = process.env.GINEE_SECRET_KEY ?? "";

/** True bila Access Key + Secret Key sudah diisi. */
export function isGineeConfigured(): boolean {
  return Boolean(GINEE_ACCESS_KEY && GINEE_SECRET_KEY);
}
