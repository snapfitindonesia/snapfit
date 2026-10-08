"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { bankAccountsSchema, type BankAccount } from "@/lib/bank-accounts";
import { BANKS_KEY, BANKS_TAG } from "@/lib/bank-settings";

/** Simpan rekening transfer manual (Admin → Rekening Transfer). */
export async function saveBankAccounts(accounts: BankAccount[]): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Tidak diizinkan." };
  }
  const parsed = bankAccountsSchema.safeParse(accounts);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    const row = typeof i?.path?.[0] === "number" ? `Rekening #${Number(i.path[0]) + 1}: ` : "";
    return { ok: false, error: row + (i?.message ?? "Data tidak valid.") };
  }
  await db.siteSetting.upsert({
    where: { key: BANKS_KEY },
    create: { key: BANKS_KEY, value: parsed.data },
    update: { value: parsed.data },
  });
  revalidateTag(BANKS_TAG);
  revalidatePath("/checkout");
  revalidatePath("/admin/rekening");
  return { ok: true };
}
