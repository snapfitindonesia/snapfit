"use client";

// Admin → Halaman Buy 1 Get 1: atur isi & susunan /buy1get1 (desain paket, components/promo-page) seperti Konten
// Beranda — urutkan/sembunyikan bagian, ganti banner, teks, tautan, produk promo & foto kartu kategori.
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ExternalLink, Eye, EyeOff, Loader2, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageInput } from "@/components/admin/image-input";
import { cn } from "@/lib/utils";
import { savePromoPage } from "@/lib/actions/promo-page";
import { DEFAULT_PROMO_PAGE, PROMO_PAGE_PATH, SECTION_LABELS, type PromoPageConfig, type SectionKey } from "@/lib/promo-page/config";

const input = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground";
export type PromoProductOption = { id: string; name: string; archived: boolean };
export type PromoBrandOption = { slug: string; name: string };

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

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className="grid size-7 place-items-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40">
      {children}
    </button>
  );
}

const LINK_HINT = "Tautan: /produk, /kategori/iphone, /produk/… atau #produk-promo (gulir ke produk promo).";

function Banner({ value, onChange, size, wide = true }: { value: { image: string; alt: string; href: string }; onChange: (v: { image: string; alt: string; href: string }) => void; size: string; wide?: boolean }) {
  return (
    <div className="space-y-3">
      <div>
        <span className="text-sm font-medium">Gambar</span> <span className="text-xs text-muted-foreground">— ukuran ideal {size}. Kosong = placeholder abu-abu.</span>
        <div className="mt-1">
          <ImageInput value={value.image} onChange={(image) => onChange({ ...value, image })} wide={wide} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Text label="Teks alternatif" value={value.alt} onChange={(alt) => onChange({ ...value, alt })} hint="Dibaca Google & pembaca layar." />
        <Text label="Tautan saat diklik" value={value.href} onChange={(href) => onChange({ ...value, href })} hint={LINK_HINT} />
      </div>
    </div>
  );
}

export function PromoPageEditor({ initial, products, brands }: { initial: PromoPageConfig; products: PromoProductOption[]; brands: PromoBrandOption[] }) {
  const [c, setC] = useState<PromoPageConfig>(initial);
  const [open, setOpen] = useState<SectionKey | "umum" | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pq, setPq] = useState("");
  const set = <K extends keyof PromoPageConfig>(k: K, v: PromoPageConfig[K]) => {
    setC((prev) => ({ ...prev, [k]: v }));
    setMsg(null);
  };
  const move = (i: number, d: number) => {
    const s = [...c.sections];
    const j = i + d;
    if (j < 0 || j >= s.length) return;
    [s[i], s[j]] = [s[j]!, s[i]!];
    set("sections", s);
  };
  const productName = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const matches = pq.trim().length >= 2
    ? products.filter((p) => !p.archived && !c.products.productIds.includes(p.id) && p.name.toLowerCase().includes(pq.trim().toLowerCase())).slice(0, 8)
    : [];

  async function save() {
    setSaving(true);
    setMsg(null);
    const r = await savePromoPage(c).catch(() => ({ ok: false, error: "Gagal menyimpan. Coba lagi." }));
    setSaving(false);
    setMsg(r.ok ? { ok: true, text: "Tersimpan — halaman /buy1get1 sudah diperbarui." } : { ok: false, text: r.error ?? "Gagal menyimpan." });
  }

  const editor = (key: SectionKey) => {
    switch (key) {
      case "hero":
        return <Banner value={c.hero} onChange={(v) => set("hero", v)} size="1280 × 720 px" />;
      case "arrivals":
        return <Banner value={c.arrivals} onChange={(v) => set("arrivals", v)} size="1920 × 300 px" />;
      case "editorial":
        return <Banner value={c.editorial} onChange={(v) => set("editorial", v)} size="1280 × 480 px" />;
      case "products":
        return (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Text label="Label kecil" value={c.products.eyebrow} onChange={(eyebrow) => set("products", { ...c.products, eyebrow })} />
              <Text label="Judul" value={c.products.title} onChange={(title) => set("products", { ...c.products, title })} />
            </div>
            <Text label="Keterangan" value={c.products.caption} onChange={(caption) => set("products", { ...c.products, caption })} />
            <div>
              <span className="text-sm font-medium">Produk peserta promo</span>{" "}
              <span className="text-xs text-muted-foreground">({c.products.productIds.length}/48 · urutan = urutan tampil)</span>
              <div className="relative mt-1">
                <input className={input} value={pq} onChange={(e) => setPq(e.target.value)} placeholder="Ketik nama produk (min. 2 huruf) untuk menambah…" aria-label="Cari produk untuk ditambahkan" />
                {matches.length > 0 && (
                  <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-background shadow-md">
                    {matches.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                          onClick={() => {
                            set("products", { ...c.products, productIds: [...c.products.productIds, p.id].slice(0, 48) });
                            setPq("");
                          }}
                        >
                          <Plus className="size-3.5 shrink-0" /> {p.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <ol className="mt-2 space-y-1.5">
                {c.products.productIds.map((id, i) => {
                  const p = productName.get(id);
                  const ids = c.products.productIds;
                  const reorder = (d: number) => {
                    const next = [...ids];
                    const j = i + d;
                    if (j < 0 || j >= next.length) return;
                    [next[i], next[j]] = [next[j]!, next[i]!];
                    set("products", { ...c.products, productIds: next });
                  };
                  return (
                    <li key={id} className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-sm">
                      <span className="w-6 text-right text-xs text-muted-foreground">{i + 1}.</span>
                      <span className={cn("min-w-0 flex-1 truncate", !p && "text-destructive")}>
                        {p?.name ?? "Produk sudah dihapus"}
                        {p?.archived && <span className="ml-1 text-xs text-amber-700">(diarsip — tak tampil)</span>}
                      </span>
                      <IconBtn label="Naik" onClick={() => reorder(-1)} disabled={i === 0}><ArrowUp className="size-3.5" /></IconBtn>
                      <IconBtn label="Turun" onClick={() => reorder(1)} disabled={i === ids.length - 1}><ArrowDown className="size-3.5" /></IconBtn>
                      <IconBtn label="Hapus dari promo" onClick={() => set("products", { ...c.products, productIds: ids.filter((x) => x !== id) })}><Trash2 className="size-3.5" /></IconBtn>
                    </li>
                  );
                })}
              </ol>
              {!c.products.productIds.length && <p className="mt-2 text-xs text-muted-foreground">Belum ada produk — bagian ini menampilkan &ldquo;Produk promo segera hadir&rdquo;.</p>}
            </div>
          </div>
        );
      case "categories":
        return (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Text label="Label kecil" value={c.categories.eyebrow} onChange={(eyebrow) => set("categories", { ...c.categories, eyebrow })} />
              <Text label="Judul" value={c.categories.title} onChange={(title) => set("categories", { ...c.categories, title })} />
            </div>
            <Text label="Keterangan" value={c.categories.caption} onChange={(caption) => set("categories", { ...c.categories, caption })} />
            <p className="text-xs text-muted-foreground">
              Kartu = 6 merek perangkat pertama (urutan Admin → Kategori). Foto 410 × 490 px; kosong = foto seri pertama, lalu placeholder.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {brands.map((b, i) => (
                <div key={b.slug} className={cn("rounded-md border border-border p-3", i >= 6 && "opacity-60")}>
                  <p className="mb-1 text-sm font-medium">{b.name}{i >= 6 && <span className="ml-1 text-xs font-normal text-muted-foreground">(tak tampil di kartu — hanya menu)</span>}</p>
                  <ImageInput
                    value={c.categories.images[b.slug] ?? ""}
                    onChange={(url) => {
                      const images = { ...c.categories.images };
                      if (url) images[b.slug] = url;
                      else delete images[b.slug];
                      set("categories", { ...c.categories, images });
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      case "brands":
        return (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Text label="Label kecil" value={c.brands.eyebrow} onChange={(eyebrow) => set("brands", { ...c.brands, eyebrow })} />
              <Text label="Judul" value={c.brands.title} onChange={(title) => set("brands", { ...c.brands, title })} />
              <Text label="Teks tautan kanan" value={c.brands.linkLabel} onChange={(linkLabel) => set("brands", { ...c.brands, linkLabel })} hint="Kosong = tautan disembunyikan." />
              <Text label="Tujuan tautan kanan" value={c.brands.linkHref} onChange={(linkHref) => set("brands", { ...c.brands, linkHref })} />
            </div>
            <p className="text-xs text-muted-foreground">6 kotak gambar 380 × 380 px.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {c.brands.items.map((item, i) => (
                <div key={i} className="space-y-2 rounded-md border border-border p-3">
                  <p className="text-sm font-medium">Kotak {i + 1}</p>
                  <ImageInput value={item.image} onChange={(image) => set("brands", { ...c.brands, items: c.brands.items.map((x, j) => (j === i ? { ...x, image } : x)) })} square />
                  <Text label="Nama" value={item.alt} onChange={(alt) => set("brands", { ...c.brands, items: c.brands.items.map((x, j) => (j === i ? { ...x, alt } : x)) })} />
                  <Text label="Tautan" value={item.href} onChange={(href) => set("brands", { ...c.brands, items: c.brands.items.map((x, j) => (j === i ? { ...x, href } : x)) })} />
                </div>
              ))}
            </div>
          </div>
        );
      case "signup":
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            <Text label="Label kecil" value={c.signup.eyebrow} onChange={(eyebrow) => set("signup", { ...c.signup, eyebrow })} />
            <Text label="Judul" value={c.signup.title} onChange={(title) => set("signup", { ...c.signup, title })} />
            <Text label="Teks" value={c.signup.text} onChange={(text) => set("signup", { ...c.signup, text })} />
            <Text label="Teks tombol" value={c.signup.ctaLabel} onChange={(ctaLabel) => set("signup", { ...c.signup, ctaLabel })} hint="Membuka form newsletter (masuk ke Pelanggan → Langganan Email)." />
          </div>
        );
      case "benefits":
        return (
          <div className="grid gap-3 sm:grid-cols-3">
            {c.benefits.map((b, i) => (
              <div key={i} className="space-y-2 rounded-md border border-border p-3">
                <Text label={`Poin ${i + 1}`} value={b.title} onChange={(title) => set("benefits", c.benefits.map((x, j) => (j === i ? { ...x, title } : x)))} />
                <Text label="Keterangan" value={b.caption} onChange={(caption) => set("benefits", c.benefits.map((x, j) => (j === i ? { ...x, caption } : x)))} />
              </div>
            ))}
          </div>
        );
      case "seo":
        return (
          <div className="space-y-3">
            <Text label="Judul" value={c.seo.title} onChange={(title) => set("seo", { ...c.seo, title })} />
            <Text label="Paragraf" area value={c.seo.text} onChange={(text) => set("seo", { ...c.seo, text })} />
            <Text label="Lanjutan (setelah “Baca selengkapnya”)" area value={c.seo.more} onChange={(more) => set("seo", { ...c.seo, more })} hint="Kosong = tombol Baca selengkapnya disembunyikan." />
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Simpan
        </Button>
        <Button type="button" variant="outline" asChild>
          <a href={PROMO_PAGE_PATH} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-4" /> Lihat halaman</a>
        </Button>
        <Button type="button" variant="ghost" onClick={() => { if (confirm("Kembalikan semua isi ke bawaan? (belum tersimpan sampai klik Simpan)")) setC(DEFAULT_PROMO_PAGE); }}>
          <RotateCcw className="size-4" /> Isi bawaan
        </Button>
        {msg && <span className={cn("text-sm", msg.ok ? "text-emerald-700" : "text-destructive")} role="status">{msg.text}</span>}
      </div>

      {/* Pengaturan umum (bukan bagian yang bisa diurutkan) */}
      <div className="rounded-xl border border-border bg-card">
        <button type="button" className="flex w-full items-center justify-between px-4 py-3 text-left" onClick={() => setOpen(open === "umum" ? null : "umum")} aria-expanded={open === "umum"}>
          <span><span className="text-sm font-semibold">Pengaturan umum</span> <span className="text-xs text-muted-foreground">— judul SEO, banner atas HP, baris info, pencarian, footer</span></span>
          <ChevronDown className={cn("size-4 transition-transform", open === "umum" && "rotate-180")} />
        </button>
        {open === "umum" && (
          <div className="space-y-4 border-t border-border p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Text label="Judul halaman (tab & Google)" value={c.title} onChange={(v) => set("title", v)} />
              <Text label="Placeholder pencarian" value={c.searchPlaceholder} onChange={(v) => set("searchPlaceholder", v)} />
            </div>
            <Text label="Deskripsi (Google)" area value={c.description} onChange={(v) => set("description", v)} />
            <fieldset className="space-y-3 rounded-md border border-border p-3">
              <legend className="px-1 text-sm font-medium">Banner atas (HP)</legend>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={c.appBanner.show} onChange={(e) => set("appBanner", { ...c.appBanner, show: e.target.checked })} /> Tampilkan</label>
              <div className="grid gap-3 sm:grid-cols-3">
                <Text label="Teks" value={c.appBanner.text} onChange={(text) => set("appBanner", { ...c.appBanner, text })} />
                <Text label="Tombol" value={c.appBanner.ctaLabel} onChange={(ctaLabel) => set("appBanner", { ...c.appBanner, ctaLabel })} />
                <Text label="Tautan" value={c.appBanner.href} onChange={(href) => set("appBanner", { ...c.appBanner, href })} />
              </div>
            </fieldset>
            <fieldset className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-3">
              <legend className="px-1 text-sm font-medium">Baris info paling atas (desktop)</legend>
              <Text label="Angka bulat" value={c.utility.badge} onChange={(badge) => set("utility", { ...c.utility, badge })} />
              <Text label="Teks kiri" value={c.utility.text} onChange={(text) => set("utility", { ...c.utility, text })} />
              <Text label="Catatan kiri" value={c.utility.note} onChange={(note) => set("utility", { ...c.utility, note })} />
              <Text label="Tautan kiri" value={c.utility.href} onChange={(href) => set("utility", { ...c.utility, href })} />
              <Text label="Teks kanan" value={c.utility.rightText} onChange={(rightText) => set("utility", { ...c.utility, rightText })} />
              <Text label="Tautan kanan" value={c.utility.rightHref} onChange={(rightHref) => set("utility", { ...c.utility, rightHref })} />
            </fieldset>
            <fieldset className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-3">
              <legend className="px-1 text-sm font-medium">Footer</legend>
              <Text label="Slogan" value={c.footer.tagline} onChange={(tagline) => set("footer", { ...c.footer, tagline })} />
              <Text label="Bawah kiri" value={c.footer.bottomLeft} onChange={(bottomLeft) => set("footer", { ...c.footer, bottomLeft })} />
              <Text label="Bawah kanan" value={c.footer.bottomRight} onChange={(bottomRight) => set("footer", { ...c.footer, bottomRight })} />
            </fieldset>
          </div>
        )}
      </div>

      {/* Bagian halaman — urutan & tampil seperti Konten Beranda */}
      <div className="space-y-2">
        {c.sections.map((s, i) => (
          <div key={s.key} className={cn("rounded-xl border border-border bg-card", !s.active && "opacity-60")}>
            <div className="flex items-center gap-2 px-4 py-3">
              <button type="button" className="flex min-w-0 flex-1 items-center justify-between text-left" onClick={() => setOpen(open === s.key ? null : s.key)} aria-expanded={open === s.key}>
                <span className="min-w-0">
                  <span className="text-sm font-semibold">{SECTION_LABELS[s.key].label}</span>
                  {!s.active && <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[11px]">disembunyikan</span>}
                  <span className="block truncate text-xs text-muted-foreground">{SECTION_LABELS[s.key].hint}</span>
                </span>
                <ChevronDown className={cn("ml-2 size-4 shrink-0 transition-transform", open === s.key && "rotate-180")} />
              </button>
              <IconBtn label={s.active ? "Sembunyikan" : "Tampilkan"} onClick={() => set("sections", c.sections.map((x, j) => (j === i ? { ...x, active: !x.active } : x)))}>
                {s.active ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
              </IconBtn>
              <IconBtn label="Naik" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp className="size-3.5" /></IconBtn>
              <IconBtn label="Turun" onClick={() => move(i, 1)} disabled={i === c.sections.length - 1}><ArrowDown className="size-3.5" /></IconBtn>
            </div>
            {open === s.key && <div className="border-t border-border p-4">{editor(s.key)}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
