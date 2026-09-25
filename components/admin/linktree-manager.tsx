"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, GripVertical, Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageInput } from "@/components/admin/image-input";
import {
  saveBioProfile,
  saveBioLink,
  deleteBioLink,
  setBioLinkActive,
  reorderBioLinks,
  type BioProfileInput,
  type BioLinkInput,
} from "@/lib/actions/linktree";

export type BioLinkRow = {
  id: string;
  title: string;
  url: string;
  image: string | null;
  highlight: boolean;
  active: boolean;
  clicks: number;
};

const input = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground";

const SOCIALS: { key: keyof BioProfileInput; label: string; placeholder: string }[] = [
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/snapfit.id" },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@snapfit.id" },
  { key: "whatsapp", label: "WhatsApp", placeholder: "628123456789 atau https://wa.me/…" },
  { key: "shopee", label: "Shopee", placeholder: "https://shopee.co.id/…" },
  { key: "tokopedia", label: "Tokopedia", placeholder: "https://tokopedia.com/…" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@…" },
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/…" },
];

type BgMode = "DEFAULT" | "COLOR" | "GRADIENT" | "IMAGE";

const BG_MODES: { value: BgMode; label: string }[] = [
  { value: "DEFAULT", label: "Default" },
  { value: "COLOR", label: "Warna" },
  { value: "GRADIENT", label: "Gradien" },
  { value: "IMAGE", label: "Gambar" },
];

const PRESETS: { c1: string; c2?: string; light: boolean }[] = [
  { c1: "#ffffff", light: false },
  { c1: "#0a0a0a", light: true },
  { c1: "#f5f0e8", light: false },
  { c1: "#1e3a5f", light: true },
  { c1: "#0a0a0a", c2: "#525252", light: true },
  { c1: "#fdfbfb", c2: "#ebedee", light: false },
  { c1: "#667eea", c2: "#764ba2", light: true },
  { c1: "#f093fb", c2: "#f5576c", light: true },
  { c1: "#43e97b", c2: "#38f9d7", light: false },
  { c1: "#fa709a", c2: "#fee140", light: false },
];

function bgModeOf(p: BioProfileInput): BgMode {
  if (p.bgImage) return "IMAGE";
  if (p.bgColor && p.bgColor2) return "GRADIENT";
  if (p.bgColor) return "COLOR";
  return "DEFAULT";
}

function bgStyle(p: BioProfileInput): React.CSSProperties {
  if (p.bgImage) return { backgroundImage: `url("${p.bgImage}")`, backgroundSize: "cover", backgroundPosition: "center" };
  if (p.bgColor && p.bgColor2) return { backgroundImage: `linear-gradient(160deg, ${p.bgColor}, ${p.bgColor2})` };
  if (p.bgColor) return { backgroundColor: p.bgColor };
  return {};
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm">{label}
      <div className="mt-1 flex items-center gap-2">
        <input type="color" value={value || "#ffffff"} onChange={(e) => onChange(e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-border bg-background p-0.5" />
        <input className={input} value={value} onChange={(e) => onChange(e.target.value)} placeholder="#ffffff" />
      </div>
    </label>
  );
}

function BackgroundSettings({ p, setP }: { p: BioProfileInput; setP: (p: BioProfileInput) => void }) {
  const mode = bgModeOf(p);
  // Mode dipilih eksplisit supaya "Gradien"/"Gambar" tetap aktif walau field masih kosong.
  const [picked, setPicked] = useState<BgMode>(mode);

  function setMode(m: BgMode) {
    setPicked(m);
    if (m === "DEFAULT") setP({ ...p, bgColor: "", bgColor2: "", bgImage: "", textLight: false });
    if (m === "COLOR") setP({ ...p, bgColor: p.bgColor || "#ffffff", bgColor2: "", bgImage: "" });
    if (m === "GRADIENT") setP({ ...p, bgColor: p.bgColor || "#667eea", bgColor2: p.bgColor2 || "#764ba2", bgImage: "" });
    if (m === "IMAGE") setP({ ...p, bgColor: "", bgColor2: "" });
  }

  const tone = p.textLight ? "text-white" : "text-neutral-900";

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <h3 className="text-sm font-medium">Latar belakang</h3>
      <div className="grid gap-4 lg:grid-cols-[1fr_200px]">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {BG_MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMode(m.value)}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${picked === m.value ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted"}`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {(picked === "COLOR" || picked === "GRADIENT") && (
            <>
              <div className="flex flex-wrap gap-2">
                {PRESETS.filter((s) => (picked === "GRADIENT" ? !!s.c2 : !s.c2)).map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    title="Pakai preset"
                    onClick={() => setP({ ...p, bgColor: s.c1, bgColor2: s.c2 ?? "", bgImage: "", textLight: s.light })}
                    className="size-8 rounded-full ring-1 ring-border"
                    style={{ background: s.c2 ? `linear-gradient(160deg, ${s.c1}, ${s.c2})` : s.c1 }}
                  />
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <ColorField label={picked === "GRADIENT" ? "Warna atas" : "Warna"} value={p.bgColor ?? ""} onChange={(v) => setP({ ...p, bgColor: v })} />
                {picked === "GRADIENT" && <ColorField label="Warna bawah" value={p.bgColor2 ?? ""} onChange={(v) => setP({ ...p, bgColor2: v })} />}
              </div>
            </>
          )}

          {picked === "IMAGE" && (
            <div className="text-sm">Gambar latar (disarankan potret, mis. 1080×1920)
              <div className="mt-1"><ImageInput value={p.bgImage ?? ""} onChange={(v) => setP({ ...p, bgImage: v })} /></div>
            </div>
          )}

          {picked !== "DEFAULT" && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={p.textLight} onChange={(e) => setP({ ...p, textLight: e.target.checked })} />
              Teks putih (centang bila latar gelap)
            </label>
          )}
        </div>

        {/* Preview mini */}
        <div className="mx-auto w-[180px] overflow-hidden rounded-2xl border border-border bg-neutral-50 shadow-sm" style={bgStyle(p)}>
          <div className={`relative flex flex-col items-center px-3 py-5 text-center ${tone}`}>
            {p.bgImage && <div className="absolute inset-0 bg-black/10" />}
            <div className="relative flex size-10 items-center justify-center rounded-full bg-neutral-900 text-sm font-bold text-white">{(p.title || "S").charAt(0)}</div>
            <p className="relative mt-2 text-xs font-bold">{p.title || "SNAPFIT"}</p>
            {p.bio && <p className={`relative mt-0.5 line-clamp-2 text-[9px] ${p.textLight ? "text-white/80" : "text-neutral-500"}`}>{p.bio}</p>}
            <div className="relative mt-3 w-full space-y-1.5">
              <div className="rounded-md bg-neutral-900 py-1.5 text-[9px] font-semibold text-white">Tombol utama</div>
              <div className="rounded-md bg-white py-1.5 text-[9px] font-semibold text-neutral-900 ring-1 ring-neutral-200">Tombol</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const emptyLink: BioLinkInput = { title: "", url: "", image: "", highlight: false, active: true };

export function LinktreeManager({ profile, links }: { profile: BioProfileInput; links: BioLinkRow[] }) {
  const router = useRouter();

  // ---- profil ----
  const [p, setP] = useState<BioProfileInput>(profile);
  const [pSaving, setPSaving] = useState(false);
  const [pMsg, setPMsg] = useState<string | null>(null);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setPSaving(true); setPMsg(null);
    const res = await saveBioProfile(p);
    setPMsg(res.ok ? "Tersimpan ✓" : res.error ?? "Gagal.");
    setPSaving(false);
    if (res.ok) router.refresh();
  }

  // ---- tombol link ----
  const [editId, setEditId] = useState<string | null>(null);
  const [l, setL] = useState<BioLinkInput>(emptyLink);
  const [lSaving, setLSaving] = useState(false);
  const [lError, setLError] = useState<string | null>(null);
  const [order, setOrder] = useState<BioLinkRow[]>(links);
  const [dragId, setDragId] = useState<string | null>(null);

  // Sinkron saat data server berubah (setelah refresh).
  const [prevLinks, setPrevLinks] = useState(links);
  if (prevLinks !== links) { setPrevLinks(links); setOrder(links); }

  function resetLink() { setEditId(null); setL(emptyLink); setLError(null); }
  function editLink(r: BioLinkRow) {
    setEditId(r.id);
    setL({ title: r.title, url: r.url, image: r.image ?? "", highlight: r.highlight, active: r.active });
    setLError(null);
  }

  async function submitLink(e: React.FormEvent) {
    e.preventDefault();
    setLSaving(true); setLError(null);
    const res = await saveBioLink(l, editId ?? undefined);
    if (res.ok) { resetLink(); router.refresh(); } else setLError(res.error ?? "Gagal.");
    setLSaving(false);
  }
  async function removeLink(r: BioLinkRow) {
    if (!confirm(`Hapus tombol "${r.title}"?`)) return;
    const res = await deleteBioLink(r.id);
    if (res.ok) { if (editId === r.id) resetLink(); router.refresh(); } else alert(res.error);
  }
  async function toggleActive(r: BioLinkRow) {
    setOrder((o) => o.map((x) => (x.id === r.id ? { ...x, active: !x.active } : x)));
    const res = await setBioLinkActive(r.id, !r.active);
    if (!res.ok) alert(res.error);
    router.refresh();
  }
  async function drop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const next = [...order];
    const from = next.findIndex((x) => x.id === dragId);
    const to = next.findIndex((x) => x.id === targetId);
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setOrder(next);
    setDragId(null);
    const res = await reorderBioLinks(next.map((x) => x.id));
    if (!res.ok) alert(res.error);
    router.refresh();
  }

  return (
    <div className="space-y-10">
      {/* PROFIL */}
      <form onSubmit={saveProfile} className="space-y-4 rounded-lg border border-border p-4">
        <h2 className="text-sm font-medium">Profil</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <label className="block text-sm">Judul
              <input className={`mt-1 ${input}`} value={p.title} onChange={(e) => setP({ ...p, title: e.target.value })} required />
            </label>
            <label className="block text-sm">Bio / deskripsi singkat
              <textarea className={`mt-1 ${input}`} rows={3} value={p.bio ?? ""} onChange={(e) => setP({ ...p, bio: e.target.value })} placeholder="Authorized reseller Ringke, VRS, Araree & Supcase" />
            </label>
            <div className="text-sm">Foto profil / logo (persegi)
              <div className="mt-1 flex items-center gap-3">
                {p.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.avatar} alt="" className="size-14 shrink-0 rounded-full border border-border object-cover" />
                ) : (
                  <div className="size-14 shrink-0 rounded-full bg-muted" />
                )}
                <div className="flex-1"><ImageInput value={p.avatar ?? ""} onChange={(v) => setP({ ...p, avatar: v })} /></div>
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {SOCIALS.map((s) => (
              <label key={s.key} className="block text-sm">{s.label}
                <input className={`mt-1 ${input}`} value={(p[s.key] as string) ?? ""} onChange={(e) => setP({ ...p, [s.key]: e.target.value })} placeholder={s.placeholder} />
              </label>
            ))}
            <p className="text-xs text-muted-foreground sm:col-span-2">Ikon sosial media tampil di bawah bio. Kosongkan yang tidak dipakai.</p>
          </div>
        </div>
        <BackgroundSettings p={p} setP={setP} />
        <div className="flex items-center gap-3">
          <Button type="submit" size="sm" disabled={pSaving}>{pSaving && <Loader2 className="size-4 animate-spin" />}Simpan profil</Button>
          {pMsg && <span className="text-sm text-muted-foreground">{pMsg}</span>}
        </div>
      </form>

      {/* TOMBOL */}
      <div className="grid gap-8 lg:grid-cols-2">
        <form onSubmit={submitLink} className="h-fit space-y-3 rounded-lg border border-border p-4">
          <h2 className="text-sm font-medium">{editId ? "Edit tombol" : "Tambah tombol"}</h2>
          <label className="block text-sm">Judul tombol
            <input className={`mt-1 ${input}`} value={l.title} onChange={(e) => setL({ ...l, title: e.target.value })} placeholder="mis. Belanja di Website — Gratis Ongkir" required />
          </label>
          <label className="block text-sm">URL tujuan
            <input className={`mt-1 ${input}`} value={l.url} onChange={(e) => setL({ ...l, url: e.target.value })} placeholder="https://… atau /produk" required />
          </label>
          <div className="text-sm">Thumbnail (opsional)
            <div className="mt-1"><ImageInput value={l.image ?? ""} onChange={(v) => setL({ ...l, image: v })} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={l.highlight} onChange={(e) => setL({ ...l, highlight: e.target.checked })} />
            Tonjolkan (tombol hitam)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={l.active} onChange={(e) => setL({ ...l, active: e.target.checked })} />
            Tampilkan
          </label>
          {lError && <p className="text-sm text-destructive">{lError}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={lSaving}>{lSaving && <Loader2 className="size-4 animate-spin" />}{editId ? "Simpan" : "Tambah"}</Button>
            {editId && <Button type="button" size="sm" variant="ghost" onClick={resetLink}>Batal</Button>}
          </div>
        </form>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Seret ⋮⋮ untuk mengubah urutan.</p>
            <a href="/links" target="_blank" className="inline-flex items-center gap-1 text-xs font-medium hover:underline">
              Lihat halaman <ExternalLink className="size-3" />
            </a>
          </div>
          {order.map((r) => (
            <div
              key={r.id}
              draggable
              onDragStart={(e) => { setDragId(r.id); e.dataTransfer.effectAllowed = "move"; }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => drop(r.id)}
              onDragEnd={() => setDragId(null)}
              className={`flex items-center gap-3 rounded-lg border p-3 ${editId === r.id ? "border-foreground" : "border-border"} ${dragId === r.id ? "opacity-40" : ""} ${r.active ? "" : "bg-muted/50"}`}
            >
              <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" />
              {r.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.image} alt="" className="size-8 shrink-0 rounded object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm font-medium ${r.active ? "" : "text-muted-foreground line-through"}`}>
                  {r.title}
                  {r.highlight && <span className="ml-2 rounded bg-foreground px-1.5 py-0.5 text-[10px] font-semibold text-background no-underline">UTAMA</span>}
                </p>
                <p className="truncate text-xs text-muted-foreground">{r.url} · {r.clicks} klik</p>
              </div>
              <label className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground" title="Tampilkan">
                <input type="checkbox" checked={r.active} onChange={() => toggleActive(r)} />
              </label>
              <button onClick={() => editLink(r)} className="text-muted-foreground hover:text-foreground"><Pencil className="size-4" /></button>
              <button onClick={() => removeLink(r)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
            </div>
          ))}
          {order.length === 0 && <p className="text-sm text-muted-foreground">Belum ada tombol. Tambah dulu di kiri.</p>}
        </div>
      </div>
    </div>
  );
}
