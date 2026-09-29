import type { User } from "@supabase/supabase-js";
import { sendEmail, welcomeEmail } from "@/lib/email";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ensureSignupBonus } from "@/lib/coins";
import { getCoinRules } from "@/lib/coins-settings";
import { activeCashback } from "@/lib/coins-rules";

// Akun lebih tua dari ini tak dikirimi (member lama yang login pertama kali setelah fitur rilis).
const NEW_ACCOUNT_MS = 3 * 86_400_000;

/**
 * Email selamat datang — SEKALI per akun, untuk daftar via Google maupun email+password.
 * Dipanggil di /auth/callback (Google & tautan konfirmasi email), setelah signUp tanpa konfirmasi,
 * dan cadangan saat saldo koin pertama kali dibaca (Akun/checkout). Penanda di app_metadata
 * (tak bisa diubah user). Best-effort: gagal tak mengganggu login.
 */
export async function sendWelcomeIfNew(user: User | null | undefined): Promise<void> {
  try {
    if (!user?.email) return;
    const meta = (user.app_metadata ?? {}) as Record<string, unknown>;
    if (meta.welcome_sent_at) return;
    if (!user.email_confirmed_at) return; // daftar manual: tunggu email dikonfirmasi
    if (Date.now() - new Date(user.created_at).getTime() > NEW_ACCOUNT_MS) return;

    const admin = createSupabaseAdminClient();
    if (!admin) return; // tanpa service key tak bisa menandai → jangan kirim (hindari dobel)
    // Tandai DULU (anti kirim ganda bila dua permintaan bersamaan), baru kirim.
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      app_metadata: { ...meta, welcome_sent_at: new Date().toISOString() },
    });
    if (error) return;

    const rules = await getCoinRules();
    await ensureSignupBonus(user.id); // koin sudah ada saat email dibaca
    const um = (user.user_metadata ?? {}) as Record<string, unknown>;
    const name = (um.full_name || um.name || user.email.split("@")[0]) as string;
    await sendEmail({
      to: user.email,
      ...welcomeEmail({
        name,
        bonus: rules.enabled ? rules.signupBonus : 0,
        cashbackPercent: activeCashback(rules).percent,
      }),
    });
  } catch (e) {
    console.error("Email selamat datang gagal:", e);
  }
}
