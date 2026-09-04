"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isTurnstileConfigured } from "@/lib/supabase/config";
import { signIn, signUp } from "@/lib/actions/auth";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";

export function AuthForm({
  mode,
  next = "/",
}: {
  mode: "login" | "register";
  next?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const configured = isSupabaseConfigured();
  const isLogin = mode === "login";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (isTurnstileConfigured() && !token) {
      setError("Selesaikan verifikasi keamanan dulu.");
      return;
    }

    setLoading(true);
    try {
      const fn = isLogin ? signIn : signUp;
      const res = await fn({ email, password, turnstileToken: token || undefined });
      if (res.ok) {
        if (isLogin) {
          router.push(next);
          router.refresh();
        } else {
          setMessage(res.message ?? "Pendaftaran berhasil.");
        }
      } else {
        setError(res.error ?? "Terjadi kesalahan.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {!configured && (
        <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          Auth belum dikonfigurasi (Supabase). Form ini aktif setelah key diisi.
        </p>
      )}

      <label className="block">
        <span className="text-sm font-medium">Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Password</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete={isLogin ? "current-password" : "new-password"}
          className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
        />
      </label>

      <TurnstileWidget onToken={setToken} />

      {error && <p className="text-sm text-destructive">{error}</p>}
      {message && <p className="text-sm text-foreground">{message}</p>}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="size-4 animate-spin" />}
        {isLogin ? "Masuk" : "Daftar"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {isLogin ? (
          <>
            Belum punya akun?{" "}
            <Link href="/daftar" className={cn("font-medium text-foreground hover:underline")}>
              Daftar
            </Link>
          </>
        ) : (
          <>
            Sudah punya akun?{" "}
            <Link href="/masuk" className="font-medium text-foreground hover:underline">
              Masuk
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
