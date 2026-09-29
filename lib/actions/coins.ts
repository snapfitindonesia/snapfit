"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { adjustCoins, ensureSignupBonus, getCoinBalance } from "@/lib/coins";
import { COIN_EXPIRE_NOTICE_DAYS } from "@/lib/coins-rules";

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
  | { loggedIn: false }
  | { loggedIn: true; balance: number; expiringSoon: number; expiringAt: string | null };

/** Saldo koin user yang login (checkout & halaman akun). Bonus member baru diberikan di sini (sekali). */
export async function getMyCoins(): Promise<MyCoins> {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return { loggedIn: false };
  await ensureSignupBonus(user.id);
  const [balance, soon] = await Promise.all([
    getCoinBalance(user.id),
    db.coinEntry.findMany({
      where: {
        userId: user.id,
        remaining: { gt: 0 },
        expiresAt: { gt: new Date(), lte: new Date(Date.now() + COIN_EXPIRE_NOTICE_DAYS * 86_400_000) },
      },
      select: { remaining: true, expiresAt: true },
      orderBy: { expiresAt: "asc" },
    }),
  ]);
  return {
    loggedIn: true,
    balance,
    expiringSoon: soon.reduce((n, l) => n + l.remaining, 0),
    expiringAt: soon[0]?.expiresAt?.toISOString() ?? null,
  };
}
