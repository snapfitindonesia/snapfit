import { getCurrentUser } from "@/lib/supabase/server";
import { ADMIN_ROLE } from "@/lib/supabase/config";

/**
 * Wajib dipanggil di awal SETIAP Server Action admin (cek role di server, docs/09).
 * DEV-ONLY bypass sama seperti middleware — di produksi selalu enforce.
 */
export async function requireAdmin(): Promise<void> {
  const devBypass =
    process.env.NODE_ENV === "development" &&
    process.env.ADMIN_DEV_BYPASS === "true";
  if (devBypass) return;

  const user = await getCurrentUser();
  const role = (user?.app_metadata as { role?: string } | undefined)?.role;
  if (!user || role !== ADMIN_ROLE) {
    throw new Error("Tidak diizinkan (butuh akses admin).");
  }
}
