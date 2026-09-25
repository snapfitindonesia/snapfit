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
