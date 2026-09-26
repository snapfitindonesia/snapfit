import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata = { title: "Lupa Password" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Lupa password?"
      subtitle="Masukkan email akunmu, kami kirim tautan reset."
      panelTitle="Akun bisa dipulihkan."
      panelSub="Masukkan email terdaftar dan kami akan mengirim tautan untuk membuat password baru."
    >
      <ForgotPasswordForm />
      <p className="mt-5 text-center text-sm text-muted-foreground">
        Ingat password?{" "}
        <Link href="/masuk" className="font-medium text-foreground hover:underline">Masuk</Link>
      </p>
    </AuthShell>
  );
}
