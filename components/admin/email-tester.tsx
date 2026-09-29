"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendTestEmail } from "@/lib/actions/email-test";

type Sample = { key: string; label: string; when: string; to: string };

export function EmailTester({ samples, defaultTo }: { samples: readonly Sample[]; defaultTo: string }) {
  const [key, setKey] = useState(samples[0]?.key ?? "");
  const [to, setTo] = useState(defaultTo);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const current = samples.find((s) => s.key === key);

  async function send() {
    setBusy(true);
    setMsg(null);
    const res = await sendTestEmail({ key, to });
    setBusy(false);
    if (!res.ok) setMsg({ ok: false, text: res.error ?? "Gagal mengirim." });
    else if (res.mock) setMsg({ ok: false, text: "Email belum dikonfigurasi (RESEND_API_KEY kosong) — tidak terkirim." });
    else setMsg({ ok: true, text: `Terkirim ke ${to}. Cek inbox (atau folder Promosi/Spam).` });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-4">
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
          {samples.map((s) => (
            <li key={s.key}>
              <button
                type="button"
                onClick={() => { setKey(s.key); setMsg(null); }}
                className={`block w-full px-3 py-2.5 text-left transition-colors ${key === s.key ? "bg-brand/5" : "hover:bg-muted/50"}`}
              >
                <span className={`block text-sm ${key === s.key ? "font-semibold text-brand" : "font-medium"}`}>{s.label}</span>
                <span className="block text-xs text-muted-foreground">{s.to} · {s.when}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="rounded-lg border border-border p-4">
          <p className="text-sm font-medium">Kirim email uji</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Mengirim &quot;{current?.label}&quot; dengan data contoh (subjek diawali [UJI]). Memakai 1 kuota Resend.
          </p>
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="email@contoh.com"
            className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
          />
          <Button size="sm" className="mt-2" onClick={send} disabled={busy || !to.trim()}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Kirim
          </Button>
          {msg && <p className={`mt-2 text-xs ${msg.ok ? "text-emerald-700" : "text-destructive"}`}>{msg.text}</p>}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-[#efede9]">
        <div className="border-b border-border bg-card px-3 py-2 text-xs text-muted-foreground">Pratinjau · data pembeli fiktif, produk asli</div>
        {/* key → iframe dimuat ulang saat template diganti */}
        <iframe key={key} title={`Pratinjau ${current?.label}`} src={`/api/admin/email-preview?t=${key}`} className="h-[1100px] w-full bg-[#efede9]" />
      </div>
    </div>
  );
}
