"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveThemeColors } from "@/lib/actions/theme";
import { DEFAULT_THEME_COLORS, readableOn, type ThemeColors } from "@/lib/theme-colors";

const FIELDS: { key: keyof ThemeColors; label: string; hint: string }[] = [
  { key: "background", label: "Latar situs", hint: "Latar semua halaman." },
  { key: "card", label: "Kartu & panel", hint: "Kotak produk, filter, keranjang, popup." },
  { key: "foreground", label: "Teks", hint: "Warna teks utama." },
  { key: "primary", label: "Tombol utama", hint: "Tombol Keranjang, Checkout, Masuk. Warna teks tombol menyesuaikan otomatis." },
  { key: "brand", label: "Aksen", hint: "Oranye brand: badge, label promo, bar progres." },
];

const HEX = /^#[0-9a-fA-F]{6}$/;

export function ThemeColorsForm({ initial }: { initial: ThemeColors }) {
  const router = useRouter();
  const [c, setC] = useState<ThemeColors>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const valid = Object.values(c).every((v) => HEX.test(v));
  const dirty = JSON.stringify(c) !== JSON.stringify(initial);
  const safe = (v: string, fb: string) => (HEX.test(v) ? v : fb);
  const p = {
    bg: safe(c.background, DEFAULT_THEME_COLORS.background),
    card: safe(c.card, DEFAULT_THEME_COLORS.card),
    fg: safe(c.foreground, DEFAULT_THEME_COLORS.foreground),
    primary: safe(c.primary, DEFAULT_THEME_COLORS.primary),
    brand: safe(c.brand, DEFAULT_THEME_COLORS.brand),
  };

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await saveThemeColors(c);
    setBusy(false);
    if (res.ok) {
      setMsg({ ok: true, text: "Tersimpan — warna baru tampil di semua halaman (muat ulang halaman toko)." });
      router.refresh();
    } else setMsg({ ok: false, text: res.error ?? "Gagal menyimpan." });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-3">
        {FIELDS.map((f) => (
          <div key={f.key} className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
            <input
              type="color"
              value={safe(c[f.key], DEFAULT_THEME_COLORS[f.key])}
              onChange={(e) => setC({ ...c, [f.key]: e.target.value })}
              aria-label={f.label}
              className="size-11 shrink-0 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{f.label}</p>
              <p className="text-xs text-muted-foreground">{f.hint}</p>
            </div>
            <div className="w-28 shrink-0">
              <input
                value={c[f.key]}
                onChange={(e) => setC({ ...c, [f.key]: e.target.value.trim() })}
                maxLength={7}
                className={`w-full rounded-md border bg-background px-2.5 py-2 font-mono text-sm uppercase outline-none focus:border-foreground ${HEX.test(c[f.key]) ? "border-border" : "border-destructive"}`}
              />
              {c[f.key].toLowerCase() !== DEFAULT_THEME_COLORS[f.key] && (
                <button type="button" onClick={() => setC({ ...c, [f.key]: DEFAULT_THEME_COLORS[f.key] })} className="mt-1 text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground">
                  Bawaan ({DEFAULT_THEME_COLORS[f.key]})
                </button>
              )}
            </div>
          </div>
        ))}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button onClick={save} disabled={busy || !valid || !dirty}>
            {busy && <Loader2 className="size-4 animate-spin" />}Simpan warna
          </Button>
          <button type="button" onClick={() => setC(DEFAULT_THEME_COLORS)} className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">
            Kembalikan semua ke bawaan
          </button>
          {!valid && <span className="text-xs text-destructive">Kode warna harus format #RRGGBB.</span>}
          {msg && <span className={msg.ok ? "text-xs text-emerald-700" : "text-xs text-destructive"}>{msg.text}</span>}
        </div>
      </div>

      {/* Pratinjau langsung (sebelum disimpan) */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Pratinjau</p>
        <div className="rounded-lg border border-border p-5" style={{ background: p.bg, color: p.fg }}>
          <p className="text-lg font-bold tracking-tight">Baru untuk iPhone 18</p>
          <p className="mt-0.5 text-xs opacity-70">Teks keterangan di latar situs</p>
          <div className="mt-4 rounded-[5px] border border-black/10 p-3" style={{ background: p.card }}>
            <div className="relative aspect-[4/3] rounded-[5px] bg-black/5">
              <span className="absolute left-2 top-2 rounded-[5px] px-2 py-0.5 text-[11px] font-semibold" style={{ background: p.brand, color: readableOn(p.brand) }}>
                -20%
              </span>
            </div>
            <p className="mt-3 text-sm font-medium">SNAPFIT Case MagSafe</p>
            <p className="text-sm font-bold">Rp95.000</p>
            <div className="mt-3 flex h-[42px] items-center justify-center rounded-[5px] text-sm font-semibold" style={{ background: p.primary, color: readableOn(p.primary) }}>
              Tambah ke Keranjang
            </div>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-black/10">
            <div className="h-full w-2/3 rounded-full" style={{ background: p.brand }} />
          </div>
          <p className="mt-1.5 text-[11px] opacity-70">Contoh bar progres (aksen)</p>
        </div>
      </div>
    </div>
  );
}
