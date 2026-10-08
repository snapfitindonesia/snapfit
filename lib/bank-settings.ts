import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { bankAccountsSchema, DEFAULT_BANK_ACCOUNTS, type BankAccount } from "@/lib/bank-accounts";

export const BANKS_KEY = "payment.banks";
export const BANKS_TAG = "bank-accounts";

const getSaved = unstable_cache(
  async () => (await db.siteSetting.findUnique({ where: { key: BANKS_KEY } }))?.value ?? null,
  ["bank-accounts"],
  { revalidate: 3600, tags: [BANKS_TAG] },
);

/** Rekening transfer aktif (urut sesuai admin; [0] = utama). Selalu ≥ 1 rekening. */
export async function getBankAccounts(): Promise<BankAccount[]> {
  try {
    const parsed = bankAccountsSchema.safeParse(await getSaved());
    return parsed.success ? parsed.data : DEFAULT_BANK_ACCOUNTS;
  } catch {
    return DEFAULT_BANK_ACCOUNTS; // DB tak terjangkau (mis. saat build)
  }
}

/** Untuk form admin: langsung dari DB (tanpa cache). */
export async function getBankAccountsFresh(): Promise<BankAccount[]> {
  const v = (await db.siteSetting.findUnique({ where: { key: BANKS_KEY } }))?.value ?? null;
  const parsed = bankAccountsSchema.safeParse(v);
  return parsed.success ? parsed.data : DEFAULT_BANK_ACCOUNTS;
}
