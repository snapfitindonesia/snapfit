import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { OAuthButtons } from "@/components/auth/oauth-buttons";

export const metadata = { title: "Masuk" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reason?: string }>;
}) {
  const { next, reason } = await searchParams;

  return (
    <AuthShell
      title="Selamat datang kembali"
      subtitle="Masuk ke akun SNAPFIT-mu."
      panelTitle="Belanja aksesori HP, tanpa ribet."
      panelSub="Case & pelindung original untuk semua tipe HP-mu — kelola pesanan & lacak pengiriman dari satu akun."
    >
      {reason === "locked" && (
        <p className="mb-4 rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          Area admin terkunci sampai auth dikonfigurasi.
        </p>
      )}
      {reason === "forbidden" && (
        <p className="mb-4 rounded-md border border-destructive/40 px-3 py-2 text-xs text-destructive">
          Akun kamu tidak punya akses admin.
        </p>
      )}
      {reason === "oauth" && (
        <p className="mb-4 rounded-md border border-destructive/40 px-3 py-2 text-xs text-destructive">
          Login Google gagal. Coba lagi.
        </p>
      )}

      <AuthForm mode="login" next={next ?? "/"} />
      <div className="mt-5">
        <OAuthButtons next={next ?? "/"} />
      </div>
    </AuthShell>
  );
}
