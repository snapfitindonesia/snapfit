"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/supabase/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { adjustCoins, ensureSignupBonus, getCoinBalance } from "@/lib/coins";
import { activeCashback, coinRulesSchema, type ActiveCashback, type CoinRules } from "@/lib/coins-rules";
import { COIN_RULES_KEY, COIN_RULES_TAG, getCoinRules } from "@/lib/coins-settings";

/** ADMIN: koreksi manual koin member berdasarkan email akun (+ tambah, − kurangi). */
export async function adminAdjustCoins(input: { email: string; amount: number; note: string }): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Tidak diizinkan." };
  }
  const email = input.email.trim().toLowerCase();
  const amount = Math.trunc(Number(input.amount));
  const note = input.note.trim().slice(0, 200);
  if (!email || !amount || Math.abs(amount) > 1_000_000) return { ok: false, error: "Email & jumlah (±1–1.000.000) wajib diisi." };
  if (!note) return { ok: false, error: "Alasan wajib diisi (tampil di riwayat pembeli)." };
  const userId = await findUserIdByEmail(email);
  if (!userId) return { ok: false, error: "Akun dengan email itu tidak ditemukan." };
  await adjustCoins(userId, amount, note);
  revalidatePath("/admin/koin");
  return { ok: true };
}

async function findUserIdByEmail(email: string): Promise<string | null> {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return null;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit.id;
    if (data.users.length < 200) break;
  }
  return null;
}

export type MyCoins =
  | { loggedIn: false; rules: CoinRules; cashback: ActiveCashback }
  | { loggedIn: true; rules: CoinRules; cashback: ActiveCashback; balance: number; expiringSoon: number; expiringAt: string | null };

/** Saldo koin user yang login (checkout & halaman akun). Bonus member baru diberikan di sini (sekali). */
export async function getMyCoins(): Promise<MyCoins> {
  const [user, rules] = await Promise.all([getCurrentUser().catch(() => null), getCoinRules()]);
  const cashback = activeCashback(rules);
  if (!user) return { loggedIn: false, rules, cashback };
  await ensureSignupBonus(user.id);
  const [balance, soon] = await Promise.all([
    getCoinBalance(user.id),
    db.coinEntry.findMany({
      where: {
        userId: user.id,
        remaining: { gt: 0 },
        expiresAt: { gt: new Date(), lte: new Date(Date.now() + Math.max(7, rules.expireNoticeDays) * 86_400_000) },
      },
      select: { remaining: true, expiresAt: true },
      orderBy: { expiresAt: "asc" },
    }),
  ]);
  return {
    loggedIn: true,
    rules,
    cashback,
    balance,
    expiringSoon: soon.reduce((n, l) => n + l.remaining, 0),
    expiringAt: soon[0]?.expiresAt?.toISOString() ?? null,
  };
}

/** ADMIN: simpan aturan koin (Admin → Koin Member). Berlaku untuk transaksi berikutnya. */
export async function saveCoinRules(input: CoinRules): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Tidak diizinkan." };
  }
  const parsed = coinRulesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  await db.siteSetting.upsert({
    where: { key: COIN_RULES_KEY },
    create: { key: COIN_RULES_KEY, value: parsed.data },
    update: { value: parsed.data },
  });
  revalidateTag(COIN_RULES_TAG);
  revalidatePath("/produk/[slug]", "page"); // info cashback di PDP
  revalidatePath("/admin/koin");
  return { ok: true };
}
