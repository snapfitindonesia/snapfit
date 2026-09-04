import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata = { title: "Daftar — SnapFit" };

export default function RegisterPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="block text-center text-lg font-semibold tracking-tight">
          snapfit<span className="text-muted-foreground">.</span>
        </Link>
        <h1 className="mt-6 text-center text-xl font-semibold">Buat akun</h1>
        <div className="mt-6">
          <AuthForm mode="register" />
        </div>
      </div>
    </main>
  );
}
