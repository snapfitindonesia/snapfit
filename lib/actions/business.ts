"use server";

import { businessInquirySchema, type BusinessInquiryInput } from "@/lib/validations/business";
import { limitAction, requestIp } from "@/lib/security/ratelimit";
import { sendEmail, businessInquiryEmail } from "@/lib/email";
import { waLink } from "@/lib/wa";

export type BusinessInquiryResult = { ok: true } | { ok: false; error: string };

/**
 * Formulir Kerja Sama Bisnis → email ke admin (ADMIN_NOTIFY_EMAIL), "Balas" langsung ke pengirim.
 * Tak disimpan di database. Anti spam: maks. 3 kiriman / 10 menit / IP + kolom jebakan bot.
 * Sengaja TIDAK mengirim email konfirmasi ke alamat yang diisi (formulir publik bisa disalahgunakan
 * untuk mengirim email ke orang lain).
 */
export async function sendBusinessInquiry(input: BusinessInquiryInput): Promise<BusinessInquiryResult> {
  const parsed = businessInquirySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  const d = parsed.data;
  if (d.website) return { ok: true }; // bot: pura-pura berhasil, tak dikirim

  const ip = await requestIp();
  if (!(await limitAction("bisnis", ip, 3, "600 s")).success) {
    return { ok: false, error: "Terlalu banyak kiriman. Coba lagi beberapa menit lagi, atau hubungi kami via WhatsApp." };
  }

  const admins = (process.env.ADMIN_NOTIFY_EMAIL || "admin@snapfit.id").split(",").map((s) => s.trim()).filter(Boolean);
  const tpl = businessInquiryEmail({
    ...d,
    waUrl: waLink(d.phone, `Halo ${d.name}, terima kasih sudah menghubungi SNAPFIT untuk kerja sama (${d.type}).`) || undefined,
  });
  const results = await Promise.allSettled(admins.map((to) => sendEmail({ to, ...tpl, replyTo: d.email })));
  if (results.every((r) => r.status === "rejected")) {
    console.error("Email kerja sama gagal:", results.map((r) => (r.status === "rejected" ? r.reason : "")));
    return { ok: false, error: "Gagal mengirim. Coba lagi, atau hubungi kami via WhatsApp." };
  }
  return { ok: true };
}
