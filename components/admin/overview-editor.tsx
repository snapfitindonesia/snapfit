"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveDefaultOverview } from "@/lib/actions/settings";
import { parseOverview } from "@/lib/overview-parse";

export function OverviewEditor({ initial }: { initial: string }) {
  const [text, setText] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const points = parseOverview(text);

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await saveDefaultOverview(text);
    setSaving(false);
    setMsg(res.ok ? { ok: true, text: `Tersimpan: ${res.points} poin. Halaman produk diperbarui.` } : { ok: false, text: res.error ?? "Gagal menyimpan." });
  }

  return (
    <div className="space-y-4">
      <textarea
        className="min-h-[160px] w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm leading-relaxed outline-none focus:border-foreground"
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="Poin Overview"
      />
      <div className="rounded-lg border border-border p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pratinjau</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
          {points.map((p, i) => <li key={i}>{p}</li>)}
        </ul>
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving || !points.length}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Simpan
        </Button>
        {msg && <p className={`text-sm ${msg.ok ? "text-emerald-700" : "text-destructive"}`}>{msg.text}</p>}
      </div>
    </div>
  );
}
