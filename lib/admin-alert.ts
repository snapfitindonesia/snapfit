// Peringatan ke admin lewat email (ADMIN_NOTIFY_EMAIL) untuk masalah yang butuh tindakan manual:
// push Ginee gagal, stok kurang saat lunas, backup/sinkron harian gagal, dsb. Best-effort (tak melempar).
import "server-only";
import { sendEmail, adminAlertEmail } from "@/lib/email";

export async function alertAdmin(subject: string, title: string, lines: string[]) {
  const admins = (process.env.ADMIN_NOTIFY_EMAIL || "admin@snapfit.id").split(",").map((s) => s.trim()).filter(Boolean);
  const results = await Promise.allSettled(admins.map((to) => sendEmail({ to, ...adminAlertEmail({ subject, title, lines }) })));
  for (const r of results) if (r.status === "rejected") console.error("Email peringatan admin gagal:", r.reason);
}
