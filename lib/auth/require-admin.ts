import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ADMIN_ROLE } from "@/lib/supabase/config";

/** DEV-ONLY bypass sama seperti middleware — di produksi (NODE_ENV=production) selalu OFF. */
export function isAdminDevBypass(): boolean {
  return process.env.NODE_ENV === "development" && process.env.ADMIN_DEV_BYPASS === "true";
}

export type AdminCheck = { ok: true; email?: string } | { ok: false; reason: "login" | "role" | "mfa" };

/**
 * Cek akses admin di SERVER (dipakai requireAdmin & layout admin) — lapisan kedua selain middleware:
 * Server Action bisa dipanggil di luar jalur halaman yang dijaga middleware, jadi role DAN MFA (bila
 * ADMIN_REQUIRE_MFA=true) dicek ulang di sini. Tanpa ini, sesi admin yang baru lolos password (AAL1)
 * tetap bisa menjalankan aksi admin walau MFA diwajibkan.
 */
export async function checkAdmin(opts: { skipMfa?: boolean } = {}): Promise<AdminCheck> {
  if (isAdminDevBypass()) return { ok: true };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, reason: "login" };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "login" };
  const role = (user.app_metadata as { role?: string } | undefined)?.role;
  if (role !== ADMIN_ROLE) return { ok: false, reason: "role" };
  if (process.env.ADMIN_REQUIRE_MFA === "true" && !opts.skipMfa) {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (data?.currentLevel !== "aal2") return { ok: false, reason: "mfa" };
  }
  return { ok: true, email: user.email ?? undefined };
}

/**
 * Wajib dipanggil di awal SETIAP Server Action / API admin (cek role + MFA di server, docs/09).
 */
export async function requireAdmin(): Promise<void> {
  const r = await checkAdmin();
  if (!r.ok) {
    throw new Error(r.reason === "mfa" ? "Verifikasi 2 langkah (MFA) diperlukan." : "Tidak diizinkan (butuh akses admin).");
  }
}
