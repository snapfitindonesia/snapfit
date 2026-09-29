"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ExternalLink, Eye, EyeOff, Loader2, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageInput } from "@/components/admin/image-input";
import { cn } from "@/lib/utils";
import { saveHomeSections } from "@/lib/actions/home";
import {
  DEFAULT_SECTIONS,
  SECTION_INFO,
  blankSection,
  newId,
  type HomeSection,
  type SectionType,
} from "@/lib/home/sections";

const input = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground";

/* ----------------------------- Field kecil ----------------------------- */

function Text({ label, value, onChange, placeholder, area = false, hint }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; area?: boolean; hint?: string }) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      {area ? (
        <textarea className={cn(input, "mt-1 min-h-[72px] resize-y")} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <input className={cn(input, "mt-1")} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      )}
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

function Select<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      <select className={cn(input, "mt-1")} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </label>
  );
}

function Color({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      <span className="mt-1 flex gap-2">
        <input type="color" className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-border bg-background p-1" value={value || "#ffffff"} onChange={(e) => onChange(e.target.value)} aria-label={label} />
        <input className={input} value={value} onChange={(e) => onChange(e.target.value)} placeholder="#f2f1ee (kosong = bawaan)" />
      </span>
    </label>
  );
}

function Img({ label, value, onChange, wide = false, hint }: { label: string; value: string; onChange: (v: string) => void; wide?: boolean; hint?: string }) {
  return (
    <div className="text-sm">
      <span className="font-medium">{label}</span>
      <div className="mt-1 flex items-start gap-3">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- pratinjau admin
          <img src={value} alt="" className="size-16 shrink-0 rounded-md border border-border bg-muted object-contain" />
        ) : (
          <span className="grid size-16 shrink-0 place-items-center rounded-md border border-dashed border-border text-[10px] text-muted-foreground">kosong</span>
        )}
        <div className="min-w-0 flex-1">
          <ImageInput value={value} onChange={onChange} wide={wide} />
          {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
        </div>
      </div>
    </div>
  );
}

function Check({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-2 self-end text-sm">
      <input type="checkbox" className="mt-0.5 size-4 accent-foreground" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}

const WIDE_HINT = "Foto lebar: min. 2400px, landscape (±16:9). Disimpan s/d 2400px.";
const MOBILE_HINT = "Opsional. Potrait (±4:5) untuk HP — tanpa ini foto desktop dipotong otomatis.";

/* ------------------------- Daftar item (list) ------------------------- */

function ItemList<T extends Record<string, string>>({
  items,
  onChange,
  blank,
  max,
  render,
  name,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  blank: T;
  max: number;
  render: (item: T, set: (patch: Partial<T>) => void) => React.ReactNode;
  name: string;
}) {
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="rounded-lg border border-border bg-muted/30 p-3">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{name} {i + 1}</span>
            <span className="flex gap-1">
              <IconBtn label="Naik" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp className="size-3.5" /></IconBtn>
              <IconBtn label="Turun" onClick={() => move(i, 1)} disabled={i === items.length - 1}><ArrowDown className="size-3.5" /></IconBtn>
              <IconBtn label="Hapus" onClick={() => onChange(items.filter((_, k) => k !== i))}><Trash2 className="size-3.5" /></IconBtn>
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">{render(it, (patch) => onChange(items.map((x, k) => (k === i ? { ...x, ...patch } : x))))}</div>
        </div>
      ))}
      {items.length < max && (
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, { ...blank }])}>
          <Plus className="size-4" /> Tambah {name.toLowerCase()}
        </Button>
      )}
    </div>
  );
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className="grid size-7 place-items-center rounded-md border border-border bg-background text-foreground hover:bg-muted disabled:opacity-30">
      {children}
    </button>
  );
}

/* ------------------------ Isian per jenis bagian ------------------------ */

function Fields({ s, set }: { s: HomeSection; set: (patch: Partial<HomeSection>) => void }) {
  const cta = "ctaLabel" in s && (
    <>
      <Text label="Teks tombol" value={s.ctaLabel} onChange={(v) => set({ ctaLabel: v })} placeholder="Belanja sekarang" />
      <Text label="Tautan tombol" value={s.ctaHref} onChange={(v) => set({ ctaHref: v })} placeholder="/produk atau /produk?q=iphone%2018" />
    </>
  );
  switch (s.type) {
    case "hero":
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Mode" value={s.mode} onChange={(v) => set({ mode: v })} options={[["produk", "Produk — latar warna + foto produk"], ["foto", "Foto penuh selebar layar + teks"]]} />
          <Select label="Warna teks" value={s.theme} onChange={(v) => set({ theme: v })} options={[["terang", "Gelap (untuk latar terang)"], ["gelap", "Putih (untuk latar gelap)"]]} />
          <div className="sm:col-span-2">
            <Img label={s.mode === "foto" ? "Foto (desktop)" : "Foto produk"} value={s.image} onChange={(v) => set({ image: v })} wide={s.mode === "foto"} hint={s.mode === "foto" ? WIDE_HINT : "Foto produk berlatar putih — putihnya melebur ke warna latar."} />
          </div>
          {s.mode === "foto" && (
            <div className="sm:col-span-2">
              <Img label="Foto versi HP" value={s.imageMobile} onChange={(v) => set({ imageMobile: v })} wide hint={MOBILE_HINT} />
            </div>
          )}
          <Color label={s.mode === "foto" ? "Warna latar/gradasi (tema terang)" : "Warna latar"} value={s.bg} onChange={(v) => set({ bg: v })} />
          {s.mode === "foto" && <Check label="Efek parallax" hint="Foto bergerak lebih lambat saat di-scroll." checked={s.parallax} onChange={(v) => set({ parallax: v })} />}
          <Text label={s.mode === "foto" ? "Badge (pil kecil)" : "Label kecil (atas judul)"} value={s.eyebrow} onChange={(v) => set({ eyebrow: v })} placeholder={s.mode === "foto" ? "BARU" : "Baru untuk iPhone 18"} />
          {s.mode === "foto" && (
            <>
              <Color label="Warna badge" value={s.badgeBg} onChange={(v) => set({ badgeBg: v })} />
              <Text label="Subjudul atas (tebal, di atas judul)" value={s.kicker} onChange={(v) => set({ kicker: v })} placeholder="Siap untuk iPhone 18" />
            </>
          )}
          <div className="sm:col-span-2"><Text label="Judul besar" value={s.title} onChange={(v) => set({ title: v })} /></div>
          <div className="sm:col-span-2"><Text label="Teks pendukung" value={s.subtitle} onChange={(v) => set({ subtitle: v })} area /></div>
          {cta}
        </div>
      );
    case "products":
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <Text label="Judul" value={s.title} onChange={(v) => set({ title: v })} placeholder="Baru untuk iPhone 18" />
          <Text label="Subjudul (opsional)" value={s.subtitle} onChange={(v) => set({ subtitle: v })} />
          <Select label="Produk yang tampil" value={s.source} onChange={(v) => set({ source: v })} options={[["terbaru", "Terbaru"], ["unggulan", "Unggulan (Katalog → Unggulan)"], ["cari", "Hasil kata kunci"]]} />
          {s.source === "cari" ? (
            <Text label="Kata kunci" value={s.query} onChange={(v) => set({ query: v })} placeholder="iphone 18" hint="Sama seperti kotak cari toko (per kata)." />
          ) : (
            <span />
          )}
          <label className="block text-sm">
            <span className="font-medium">Jumlah produk</span>
            <input type="number" min={4} max={16} className={cn(input, "mt-1")} value={s.limit} onChange={(e) => set({ limit: Math.min(16, Math.max(4, Number(e.target.value) || 4)) })} />
          </label>
          <span />
          <Text label="Teks tautan (kanan atas)" value={s.ctaLabel} onChange={(v) => set({ ctaLabel: v })} placeholder="Lihat semua" />
          <Text label="Tautan" value={s.ctaHref} onChange={(v) => set({ ctaHref: v })} placeholder="/produk?q=iphone%2018" />
        </div>
      );
    case "categories":
      return (
        <div className="space-y-4">
          <Text label="Judul" value={s.title} onChange={(v) => set({ title: v })} placeholder="Belanja per perangkat" />
          <ItemList
            name="Tombol"
            max={8}
            items={s.items}
            blank={{ label: "", href: "", image: "" }}
            onChange={(items) => set({ items })}
            render={(it, up) => (
              <>
                <Text label="Label" value={it.label} onChange={(v) => up({ label: v })} placeholder="iPhone" />
                <Text label="Tautan" value={it.href} onChange={(v) => up({ href: v })} placeholder="/produk?q=iphone" />
                <div className="sm:col-span-2"><Img label="Ikon foto (opsional)" value={it.image} onChange={(v) => up({ image: v })} /></div>
              </>
            )}
          />
        </div>
      );
    case "features":
      return (
        <div className="space-y-4">
          <Text label="Judul bagian (opsional)" value={s.title} onChange={(v) => set({ title: v })} />
          <ItemList
            name="Blok"
            max={6}
            items={s.items}
            blank={{ image: "", eyebrow: "", title: "", text: "", ctaLabel: "", href: "" }}
            onChange={(items) => set({ items })}
            render={(it, up) => (
              <>
                <div className="sm:col-span-2"><Img label="Foto" value={it.image} onChange={(v) => up({ image: v })} hint="Posisi foto kiri/kanan bergantian otomatis." /></div>
                <Text label="Label kecil" value={it.eyebrow} onChange={(v) => up({ eyebrow: v })} placeholder="Baru" />
                <Text label="Judul" value={it.title} onChange={(v) => up({ title: v })} />
                <div className="sm:col-span-2"><Text label="Teks" value={it.text} onChange={(v) => up({ text: v })} area /></div>
                <Text label="Teks tombol" value={it.ctaLabel} onChange={(v) => up({ ctaLabel: v })} />
                <Text label="Tautan" value={it.href} onChange={(v) => up({ href: v })} />
              </>
            )}
          />
        </div>
      );
    case "quote":
      return (
        <div className="grid gap-4">
          <Text label="Kutipan" value={s.text} onChange={(v) => set({ text: v })} area />
          <Text label="Dari" value={s.author} onChange={(v) => set({ author: v })} placeholder="Tim SNAPFIT" />
        </div>
      );
    case "banner":
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Img label="Foto (opsional — tanpa foto = warna polos)" value={s.image} onChange={(v) => set({ image: v })} wide hint={WIDE_HINT} /></div>
          {s.image ? (
            <>
              <div className="sm:col-span-2"><Img label="Foto versi HP" value={s.imageMobile} onChange={(v) => set({ imageMobile: v })} wide hint={MOBILE_HINT} /></div>
              <Check label="Efek parallax" hint="Foto bergerak lebih lambat saat di-scroll." checked={s.parallax} onChange={(v) => set({ parallax: v })} />
            </>
          ) : (
            <>
              <Color label="Warna latar" value={s.bg} onChange={(v) => set({ bg: v })} />
              <Select label="Warna teks" value={s.theme} onChange={(v) => set({ theme: v })} options={[["gelap", "Putih (latar gelap)"], ["terang", "Gelap (latar terang)"]]} />
            </>
          )}
          <Text label="Label kecil" value={s.eyebrow} onChange={(v) => set({ eyebrow: v })} />
          <Text label="Judul" value={s.title} onChange={(v) => set({ title: v })} />
          <div className="sm:col-span-2"><Text label="Teks" value={s.text} onChange={(v) => set({ text: v })} area /></div>
          {cta}
        </div>
      );
    case "community":
      return (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Text label="Judul" value={s.title} onChange={(v) => set({ title: v })} />
            <Text label="Subjudul" value={s.subtitle} onChange={(v) => set({ subtitle: v })} />
            <Select label="Sumber foto" value={s.source} onChange={(v) => set({ source: v })} options={[["ulasan", "Otomatis dari foto ulasan pembeli"], ["manual", "Unggah sendiri"]]} />
          </div>
          <p className="text-xs text-muted-foreground">Bagian ini tersembunyi otomatis bila fotonya kurang dari 3.</p>
          {s.source === "manual" && (
            <ItemList
              name="Foto"
              max={16}
              items={s.items}
              blank={{ image: "", caption: "", href: "" }}
              onChange={(items) => set({ items })}
              render={(it, up) => (
                <>
                  <div className="sm:col-span-2"><Img label="Foto (potrait 4:5)" value={it.image} onChange={(v) => up({ image: v })} /></div>
                  <Text label="Keterangan (di bawah foto)" value={it.caption} onChange={(v) => up({ caption: v })} placeholder="Case AirPods 4 Aramid / @namapelanggan" />
                  <Text label="Tautan produk" value={it.href} onChange={(v) => up({ href: v })} placeholder="/produk/nama-produk" hint="Salin dari alamat halaman produk (bagian setelah snapfit.id)." />
                </>
              )}
            />
          )}
        </div>
      );
    case "reviews":
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Img label="Foto latar (opsional)" value={s.image} onChange={(v) => set({ image: v })} wide hint={WIDE_HINT} /></div>
          {!s.image && <Color label="Warna latar" value={s.bg} onChange={(v) => set({ bg: v })} />}
          <div className="sm:col-span-2">
            <Text label="Judul" value={s.title} onChange={(v) => set({ title: v })} hint="{jumlah} = jumlah ulasan bintang 5, {rating} = rata-rata (mis. 4,9). Tersembunyi bila belum ada ulasan." />
          </div>
          <div className="sm:col-span-2"><Text label="Teks" value={s.text} onChange={(v) => set({ text: v })} /></div>
          {cta}
        </div>
      );
    case "cards":
      return (
        <div className="space-y-4">
          <Text label="Judul" value={s.title} onChange={(v) => set({ title: v })} />
          <ItemList
            name="Kartu"
            max={4}
            items={s.items}
            blank={{ image: "", title: "", text: "", ctaLabel: "", href: "" }}
            onChange={(items) => set({ items })}
            render={(it, up) => (
              <>
                <div className="sm:col-span-2"><Img label="Foto (opsional)" value={it.image} onChange={(v) => up({ image: v })} wide hint="Dengan foto: teks putih di atas foto. Tanpa foto: kartu abu-abu." /></div>
                <Text label="Judul" value={it.title} onChange={(v) => up({ title: v })} />
                <Text label="Teks" value={it.text} onChange={(v) => up({ text: v })} />
                <Text label="Teks tombol" value={it.ctaLabel} onChange={(v) => up({ ctaLabel: v })} />
                <Text label="Tautan" value={it.href} onChange={(v) => up({ href: v })} />
              </>
            )}
          />
        </div>
      );
  }
}

function summary(s: HomeSection): string {
  if ("title" in s && s.title) return s.title;
  if (s.type === "quote") return s.text.slice(0, 60);
  return "";
}

/* -------------------------------- Editor ------------------------------- */

export function HomeEditor({ initial }: { initial: HomeSection[] }) {
  const [sections, setSections] = useState<HomeSection[]>(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [open, setOpen] = useState<string | null>(null);
  const [addType, setAddType] = useState<SectionType>("banner");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const dirty = useMemo(() => JSON.stringify(sections) !== saved, [sections, saved]);

  const patch = (id: string, p: Partial<HomeSection>) =>
    setSections((all) => all.map((s) => (s.id === id ? ({ ...s, ...p } as HomeSection) : s)));
  const move = (i: number, d: -1 | 1) =>
    setSections((all) => {
      const j = i + d;
      if (j < 0 || j >= all.length) return all;
      const next = [...all];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await saveHomeSections(sections);
    setSaving(false);
    if (res.ok) {
      setSaved(JSON.stringify(sections));
      setMsg({ ok: true, text: "Tersimpan — beranda sudah diperbarui." });
    } else setMsg({ ok: false, text: res.error ?? "Gagal menyimpan." });
  }

  return (
    <div className="space-y-4 pb-24">
      {sections.map((s, i) => {
        const info = SECTION_INFO[s.type];
        const isOpen = open === s.id;
        return (
          <section key={s.id} className={cn("rounded-xl border border-border bg-background", !s.active && "opacity-60")}>
            <div className="flex items-center gap-3 p-3 sm:p-4">
              <button type="button" onClick={() => setOpen(isOpen ? null : s.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-expanded={isOpen}>
                <span className="grid size-7 shrink-0 place-items-center rounded-md bg-muted text-xs font-semibold">{i + 1}</span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {info.label}
                    {info.wide && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">selebar layar</span>}
                    {!s.active && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">disembunyikan</span>}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{summary(s) || info.hint}</span>
                </span>
                <ChevronDown className={cn("ml-auto size-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
              </button>
              <span className="flex shrink-0 gap-1">
                <IconBtn label={s.active ? "Sembunyikan" : "Tampilkan"} onClick={() => patch(s.id, { active: !s.active })}>
                  {s.active ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                </IconBtn>
                <IconBtn label="Naik" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp className="size-3.5" /></IconBtn>
                <IconBtn label="Turun" onClick={() => move(i, 1)} disabled={i === sections.length - 1}><ArrowDown className="size-3.5" /></IconBtn>
                <IconBtn
                  label="Hapus bagian"
                  onClick={() => confirm(`Hapus bagian "${info.label}"?`) && setSections((all) => all.filter((x) => x.id !== s.id))}
                >
                  <Trash2 className="size-3.5" />
                </IconBtn>
              </span>
            </div>
            {isOpen && (
              <div className="border-t border-border p-4 sm:p-5">
                <p className="mb-4 text-xs text-muted-foreground">{info.hint}</p>
                <Fields s={s} set={(p) => patch(s.id, p)} />
              </div>
            )}
          </section>
        );
      })}

      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-border p-4">
        <Select
          label="Tambah bagian"
          value={addType}
          onChange={setAddType}
          options={(Object.keys(SECTION_INFO) as SectionType[]).map((t) => [t, SECTION_INFO[t].label])}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const s = blankSection(addType);
            setSections((all) => [...all, s]);
            setOpen(s.id);
          }}
        >
          <Plus className="size-4" /> Tambah
        </Button>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur lg:left-60">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p className={cn("text-sm", msg ? (msg.ok ? "text-emerald-700" : "text-destructive") : "text-muted-foreground")}>
            {msg?.text ?? (dirty ? "Ada perubahan yang belum disimpan." : "Semua tersimpan.")}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => {
                if (!confirm("Ganti semua bagian dengan isi bawaan? (Belum tersimpan sampai klik Simpan)")) return;
                setSections(DEFAULT_SECTIONS.map((s) => ({ ...s, id: newId() })));
              }}
            >
              <RotateCcw className="size-4" /> Isi bawaan
            </Button>
            <Button type="button" variant="outline" size="lg" asChild>
              <a href="/" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" /> Lihat beranda
              </a>
            </Button>
            <Button type="button" size="lg" onClick={save} disabled={saving || !dirty}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Simpan
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
