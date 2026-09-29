"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { sendEmail } from "@/lib/email";
import { buildEmailSample, isEmailSampleKey } from "@/lib/email-samples";

/** ADMIN: kirim satu contoh email ke alamat pilihan (subjek diberi awalan [UJI]). */
export async function sendTestEmail(input: { key: string; to: string }): Promise<{ ok: boolean; error?: string; mock?: boolean }> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Tidak diizinkan." };
  }
  const to = z.string().trim().toLowerCase().email().safeParse(input.to);
  if (!to.success) return { ok: false, error: "Alamat email tidak valid." };
  if (!isEmailSampleKey(input.key)) return { ok: false, error: "Template tidak dikenal." };
  try {
    const { subject, html } = await buildEmailSample(input.key);
    const res = await sendEmail({ to: to.data, subject: `[UJI] ${subject}`, html });
    return { ok: true, mock: res.mock };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message.slice(0, 200) : "Gagal mengirim." };
  }
}
