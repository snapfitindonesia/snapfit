import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { OAuthButtons } from "@/components/auth/oauth-buttons";

export const metadata = { title: "Daftar — SNAPFIT" };

export default function RegisterPage() {
  return (
    <AuthShell
      title="Buat akun"
      subtitle="Daftar untuk checkout lebih cepat & lacak pesananmu."
      panelTitle="Gabung SNAPFIT sekarang."
      panelSub="Case & pelindung original untuk semua tipe HP-mu — daftar sekali, belanja & pantau pesanan kapan saja."
    >
      <AuthForm mode="register" />
      <div className="mt-5">
        <OAuthButtons next="/" />
      </div>
    </AuthShell>
  );
}
