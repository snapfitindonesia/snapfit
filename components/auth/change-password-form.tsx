"use client";

import { useState } from "react";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function ChangePasswordForm() {
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setMsg(null);
    if (pass.length < 6) { setError("Password minimal 6 karakter."); return; }
    if (pass !== confirm) { setError("Konfirmasi password tidak sama."); return; }
    const supabase = createSupabaseBrowserClient();
    if (!supabase) { setError("Auth belum dikonfigurasi."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pass });
    setLoading(false);
    if (error) { setError("Gagal mengganti password. Coba lagi."); return; }
    setPass(""); setConfirm("");
    setMsg("Password berhasil diganti.");
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      <label className="block">
        <span className="text-sm font-medium">Password baru</span>
        <div className="relative mt-1.5">
          <input
            type={show ? "text" : "password"}
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            required
            autoComplete="new-password"
            className="w-full rounded-md border border-border bg-background px-3 py-2 pr-10 text-sm outline-none focus:border-foreground"
          />
          <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={show ? "Sembunyikan" : "Lihat"}>
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </label>
      <label className="block">
        <span className="text-sm font-medium">Ulangi password baru</span>
        <input
          type={show ? "text" : "password"}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          autoComplete="new-password"
          className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
        />
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {msg && <p className="text-sm text-emerald-600">{msg}</p>}
      <Button type="submit" disabled={loading}>
        {loading && <Loader2 className="size-4 animate-spin" />}
        Ganti password
      </Button>
    </form>
  );
}
