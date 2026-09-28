// Parser Overview (tanpa DB) — aman dipakai di client (editor admin).
export const MAX_OVERVIEW_POINTS = 10;

/** Teks textarea → daftar poin (1 baris = 1 poin, baris kosong & tanda "-"/"•" di depan dibuang). */
export function parseOverview(text: string | null | undefined): string[] {
  return (text ?? "")
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[-•*]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, MAX_OVERVIEW_POINTS);
}
