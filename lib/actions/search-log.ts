"use server";

import { db } from "@/lib/db";
import { limitAction, requestIp } from "@/lib/security/ratelimit";

/** Rapikan kata kunci: huruf kecil, spasi tunggal, maks 60 karakter. */
function normalizeTerm(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 60);
}

/**
 * Catat 1 pencarian di /produk (dipanggil setelah kata kunci stabil & hasil
 * diketahui). Untuk wawasan admin saja — gagal/diabaikan tak mengganggu toko.
 */
export async function logSearch(rawTerm: string, results: number): Promise<void> {
  const term = normalizeTerm(String(rawTerm ?? ""));
  if (term.length < 2) return;
  const n = Math.max(0, Math.min(10_000, Math.floor(Number(results) || 0)));

  const ip = await requestIp();
  const rl = await limitAction("search-log", ip, 30, "60 s");
  if (!rl.success) return;

  const zero = n === 0 ? 1 : 0;
  await db.searchTerm
    .upsert({
      where: { term },
      create: { term, count: 1, zeroCount: zero, lastResults: n },
      update: { count: { increment: 1 }, zeroCount: { increment: zero }, lastResults: n, lastAt: new Date() },
    })
    .catch((e) => console.error("logSearch gagal:", e));
}
