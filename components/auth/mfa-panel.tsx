"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Phase = "loading" | "enroll" | "challenge" | "error";

export function MfaPanel() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [phase, setPhase] = useState<Phase>("loading");
  const [factorId, setFactorId] = useState<string>("");
  const [qr, setQr] = useState<string>("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const init = useCallback(async () => {
    if (!supabase) {
      setPhase("error");
      setError("Auth belum dikonfigurasi.");
      return;
    }
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      setPhase("error");
      setError("Gagal memuat faktor MFA.");
      return;
    }
    const totp = data.totp?.[0];
    if (totp) {
      setFactorId(totp.id);
      setPhase("challenge");
      return;
    }
    // Belum ada faktor → enroll
    const enroll = await supabase.auth.mfa.enroll({ factorType: "totp" });
    if (enroll.error) {
      setPhase("error");
      setError("Gagal memulai pendaftaran MFA.");
      return;
    }
    setFactorId(enroll.data.id);
    setQr(enroll.data.totp.qr_code);
    setPhase("enroll");
  }, [supabase]);

  useEffect(() => {
    void init();
  }, [init]);

  async function verify() {
    if (!supabase || code.length < 6) return;
    setBusy(true);
    setError(null);
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw new Error();
      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code,
      });
      if (verify.error) throw new Error();
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Kode salah atau kedaluwarsa. Coba lagi.");
      setBusy(false);
    }
  }

  if (phase === "loading") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Memuat…
      </div>
    );
  }

  if (phase === "error") {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  return (
    <div className="space-y-4">
      {phase === "enroll" && qr && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Scan QR ini dengan Google Authenticator / Authy, lalu masukkan kodenya.
          </p>
          {/* qr_code = data URI SVG dari Supabase */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR MFA" className="mx-auto mt-3 size-40" />
        </div>
      )}
      {phase === "challenge" && (
        <p className="text-sm text-muted-foreground">
          Masukkan kode 6 digit dari aplikasi authenticator kamu.
        </p>
      )}

      <input
        inputMode="numeric"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        placeholder="123456"
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-center text-lg tracking-widest outline-none focus:border-foreground"
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button className="w-full" disabled={busy || code.length < 6} onClick={verify}>
        {busy && <Loader2 className="size-4 animate-spin" />}
        Verifikasi
      </Button>
    </div>
  );
}
