"use client";

import { useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) { setError("Auth belum dikonfigurasi."); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setLoading(false);
    if (error) setError("Gagal mengirim. Coba lagi sebentar.");
    else setSent(true);
  }

  if (sent) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4 text-sm">
        <MailCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" />
        <p>
          Jika <b>{email}</b> terdaftar, kami sudah mengirim tautan untuk reset password. Cek inbox
          (dan folder <b>spam</b>) kamu, lalu ikuti tautannya.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
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
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="size-4 animate-spin" />}
        Kirim tautan reset
      </Button>
    </form>
  );
}
