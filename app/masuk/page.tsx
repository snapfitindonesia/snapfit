import Link from "next/link";
import Image from "next/image";
import { AuthForm } from "@/components/auth/auth-form";
import logo from "@/logo.png";

export const metadata = { title: "Masuk — SnapFit" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reason?: string }>;
}) {
  const { next, reason } = await searchParams;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex justify-center">
          <Image src={logo} alt="SnapFit" className="h-12 w-auto" priority />
        </Link>
        <h1 className="mt-6 text-center text-xl font-semibold">Masuk</h1>

        {reason === "locked" && (
          <p className="mt-4 rounded-md border border-border bg-muted/50 px-3 py-2 text-center text-xs text-muted-foreground">
            Area admin terkunci sampai auth dikonfigurasi.
          </p>
        )}
        {reason === "forbidden" && (
          <p className="mt-4 rounded-md border border-destructive/40 px-3 py-2 text-center text-xs text-destructive">
            Akun kamu tidak punya akses admin.
          </p>
        )}

        <div className="mt-6">
          <AuthForm mode="login" next={next ?? "/"} />
        </div>
      </div>
    </main>
  );
}
