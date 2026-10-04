"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { getHomeSections } from "@/lib/home/data";
import { newsletterWelcomeEmail, sendEmail } from "@/lib/email";

export type SubscribeResult = { ok: boolean; error?: string; voucherCode?: string; already?: boolean };

const email = z.string().trim().toLowerCase().max(160).email();

/**
 * Langganan newsletter dari bagian "Langganan email" beranda. Kode voucher DIBACA DI SERVER dari
 * pengaturan bagian (bukan dari browser). `website` = honeypot: diisi bot → pura-pura berhasil.
 */
export async function subscribeNewsletter(input: { email: string; sectionId: string; website?: string }): Promise<SubscribeResult> {
  if (input.website) return { ok: true };
  const parsed = email.safeParse(input.email);
  if (!parsed.success) return { ok: false, error: "Alamat email tidak valid." };
  const addr = parsed.data;

  const section = (await getHomeSections().catch(() => [])).find((s) => s.id === input.sectionId && s.type === "newsletter");
  const voucherCode = section?.type === "newsletter" ? section.voucherCode.trim() || undefined : undefined;

  const existing = await db.subscriber.findUnique({ where: { email: addr } });
  if (existing) return { ok: true, already: true, voucherCode };
  await db.subscriber.create({ data: { email: addr, source: "beranda" } });

  const mail = newsletterWelcomeEmail({ voucherCode });
  await sendEmail({ to: addr, ...mail }).catch((e) => console.error("[newsletter] email gagal:", e));
  return { ok: true, voucherCode };
}
