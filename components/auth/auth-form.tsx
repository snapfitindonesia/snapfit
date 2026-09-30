"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isTurnstileConfigured } from "@/lib/supabase/config";
import { signIn, signUp, verifySignupOtp, resendSignupOtp } from "@/lib/actions/auth";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";

export function AuthForm({
  mode,
  next = "/",
  onSuccess,
}: {
  mode: "login" | "register";
  next?: string;
  onSuccess?: () => void; // dipakai modal: tutup + refresh alih-alih navigasi
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Daftar manual: langkah 2 = masukkan kode OTP dari email.
  const [otpStep, setOtpStep] = useState(false);
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

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
        if (!isLogin && res.needsOtp) {
          setOtpStep(true);
          setCooldown(60);
          setMessage(res.message ?? null);
        } else {
          done(); // login, atau daftar tanpa konfirmasi email (langsung masuk)
        }
      } else {
        setError(res.error ?? "Terjadi kesalahan.");
      }
    } finally {
      setLoading(false);
    }
  }

  function done() {
    if (onSuccess) {
      onSuccess();
      router.refresh();
    } else {
      const dest = (isLogin ? next : next === "/" ? "/akun" : next);
      router.push(dest + (dest.includes("?") ? "&" : "?") + "login=success");
      router.refresh();
    }
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await verifySignupOtp({ email, code });
      if (res.ok) done();
      else setError(res.error ?? "Kode tidak valid.");
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    setError(null);
    setMessage(null);
    const res = await resendSignupOtp(email);
    if (res.ok) {
      setMessage(res.message ?? "Kode baru sudah dikirim.");
      setCooldown(60);
    } else setError(res.error ?? "Gagal mengirim ulang.");
  }

  if (otpStep) {
    return (
      <form onSubmit={onVerify} className="space-y-4">
        <div className="rounded-md border border-border bg-muted/40 px-3 py-2.5 text-sm">
          Kode verifikasi dikirim ke <b className="break-all">{email}</b>. Cek juga folder Promosi/Spam.
        </div>
        <label className="block">
          <span className="text-sm font-medium">Kode verifikasi</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 10))}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            required
            placeholder="6 digit"
            className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2.5 text-center font-mono text-xl tracking-[0.5em] outline-none focus:border-foreground"
          />
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {message && !error && <p className="text-sm text-foreground">{message}</p>}
        <Button type="submit" className="h-[42px] rounded-xl px-4 text-sm w-full" disabled={loading || code.length < 6}>
          {loading && <Loader2 className="size-4 animate-spin" />}
          Verifikasi & masuk
        </Button>
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={onResend}
            disabled={cooldown > 0}
            className="font-medium text-foreground hover:underline disabled:text-muted-foreground disabled:no-underline"
          >
            {cooldown > 0 ? `Kirim ulang (${cooldown} dtk)` : "Kirim ulang kode"}
          </button>
          <button
            type="button"
            onClick={() => { setOtpStep(false); setCode(""); setError(null); setMessage(null); }}
            className="text-muted-foreground hover:text-foreground"
          >
            Ganti email
          </button>
        </div>
        <p className="text-xs text-muted-foreground">Email kami juga berisi tautan — mengkliknya sama dengan memasukkan kode.</p>
      </form>
    );
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
        <div className="relative mt-1.5">
          <input
            type={showPass ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={isLogin ? "current-password" : "new-password"}
            className="w-full rounded-md border border-border bg-background px-3 py-2 pr-10 text-sm outline-none focus:border-foreground"
          />
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            aria-label={showPass ? "Sembunyikan password" : "Lihat password"}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </label>

      {isLogin && (
        <div className="-mt-1 text-right">
          <Link href="/lupa-password" className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline">
            Lupa password?
          </Link>
        </div>
      )}

      <TurnstileWidget onToken={setToken} />

      {error && <p className="text-sm text-destructive">{error}</p>}
      {message && <p className="text-sm text-foreground">{message}</p>}

      <Button type="submit" className="h-[42px] rounded-xl px-4 text-sm w-full" disabled={loading}>
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
