import { getCurrentUser } from "@/lib/supabase/server";
import { EMAIL_SAMPLES } from "@/lib/email-samples";
import { EmailTester } from "@/components/admin/email-tester";

export const dynamic = "force-dynamic";

export default async function AdminEmailPage() {
  const user = await getCurrentUser().catch(() => null);
  const defaultTo = user?.email ?? (process.env.ADMIN_NOTIFY_EMAIL || "admin@snapfit.id").split(",")[0].trim();
  return (
    <div>
      <h1 className="text-xl font-semibold">Email Otomatis</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Semua email yang dikirim toko secara otomatis. Pilih untuk melihat pratinjau, lalu kirim contohnya ke inbox Anda untuk
        mengecek tampilan di Gmail/HP.
      </p>
      <div className="mt-6">
        <EmailTester samples={EMAIL_SAMPLES} defaultTo={defaultTo} />
      </div>
    </div>
  );
}
