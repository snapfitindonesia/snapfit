import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata = { title: "Reset Password — SNAPFIT" };

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Buat password baru"
      subtitle="Masukkan password baru untuk akunmu."
      panelTitle="Amankan akunmu."
      panelSub="Pilih password baru yang kuat dan mudah kamu ingat."
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
