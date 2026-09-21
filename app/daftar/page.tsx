import Link from "next/link";
import Image from "next/image";
import { AuthForm } from "@/components/auth/auth-form";
import logo from "@/logosnapfit.png";

export const metadata = { title: "Daftar — SNAPFIT" };

export default function RegisterPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex justify-center">
          <Image src={logo} alt="SNAPFIT" className="h-8 w-auto" priority />
        </Link>
        <h1 className="mt-6 text-center text-xl font-semibold">Buat akun</h1>
        <div className="mt-6">
          <AuthForm mode="register" />
        </div>
      </div>
    </main>
  );
}
