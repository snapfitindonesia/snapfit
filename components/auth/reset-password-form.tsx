"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const router = useRouter();
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [ready, setReady] = useState<boolean | null>(null); // ada sesi recovery?
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) { setReady(false); return; }
    supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pass.length < 6) { setError("Password minimal 6 karakter."); return; }
    if (pass !== confirm) { setError("Konfirmasi password tidak sama."); return; }
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pass });
    setLoading(false);
    if (error) { setError("Gagal mengganti password. Tautan mungkin sudah kadaluarsa."); return; }
    setDone(true);
    setTimeout(() => { router.push("/masuk"); router.refresh(); }, 1600);
  }

  if (ready === false) {
    return (
      <p className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive">
        Tautan reset tidak valid atau sudah kadaluarsa. Silakan minta tautan baru di halaman Lupa Password.
      </p>
    );
  }
  if (ready === null) {
    return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Memuat…</p>;
  }
  if (done) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-4 text-sm">
        <CheckCircle2 className="size-5 text-emerald-600" />
        Password berhasil diganti. Mengarahkan ke halaman masuk…
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
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
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="size-4 animate-spin" />}
        Simpan password baru
      </Button>
    </form>
  );
}
