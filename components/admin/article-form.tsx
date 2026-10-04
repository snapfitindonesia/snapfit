"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bold, Heading2, Heading3, ImagePlus, Italic, Link2, List, ListOrdered, Loader2, Quote, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageInput } from "@/components/admin/image-input";
import { saveArticle, deleteArticle } from "@/lib/actions/articles";
import { uploadImageFile } from "@/lib/upload/client";
import { slugify } from "@/lib/slug";

const input = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground";

export type ArticleFormData = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  author: string;
  tags: string;
  published: boolean;
  publishedAt: string; // yyyy-mm-dd
};

/** Form artikel (Admin → Artikel): judul, URL, sampul, ringkasan, isi berformat ringan + toolbar. */
export function ArticleForm({ initial }: { initial: ArticleFormData }) {
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(!!initial.id);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (p: Partial<ArticleFormData>) => setF((x) => ({ ...x, ...p }));

  /** Sisipkan format di posisi kursor (bungkus teks terpilih bila ada). */
  function wrap(before: string, after = "", placeholder = "") {
    const el = area.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b, value } = el;
    const sel = value.slice(a, b) || placeholder;
    const next = value.slice(0, a) + before + sel + after + value.slice(b);
    set({ content: next });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + before.length, a + before.length + sel.length);
    });
  }
  /** Awali baris kursor dengan penanda (## , - , > …). */
  function line(prefix: string) {
    const el = area.current;
    if (!el) return;
    const { selectionStart: a, value } = el;
    const start = value.lastIndexOf("\n", a - 1) + 1;
    set({ content: value.slice(0, start) + prefix + value.slice(start) });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + prefix.length, a + prefix.length);
    });
  }

  async function insertImage(file: File) {
    setUploading(true);
    try {
      const url = await uploadImageFile(file);
      wrap(`\n\n![`, `](${url})\n\n`, "Keterangan foto");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload gagal");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save(publish?: boolean) {
    setSaving(true);
    setMsg(null);
    const published = publish ?? f.published;
    const res = await saveArticle(
      {
        title: f.title,
        slug: f.slug,
        excerpt: f.excerpt,
        content: f.content,
        coverImage: f.coverImage,
        author: f.author,
        tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean),
        published,
        publishedAt: f.publishedAt,
      },
      f.id,
    );
    setSaving(false);
    if (!res.ok) return setMsg({ ok: false, text: res.error ?? "Gagal menyimpan." });
    set({ published, slug: res.slug ?? f.slug, id: res.id });
    setSlugTouched(true);
    setMsg({ ok: true, text: published ? "Tersimpan & terbit." : "Tersimpan sebagai draf." });
    if (!f.id && res.id) router.replace(`/admin/artikel/${res.id}`);
    else router.refresh();
  }

  async function remove() {
    if (!f.id || !confirm("Hapus artikel ini? Tidak bisa dibatalkan.")) return;
    const res = await deleteArticle(f.id);
    if (res.ok) router.push("/admin/artikel");
    else alert(res.error);
  }

  const tool = "grid size-8 place-items-center rounded-md border border-border bg-background hover:bg-muted";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <label className="block text-sm">
          Judul
          <input
            className={`mt-1 ${input} text-base font-medium`}
            value={f.title}
            onChange={(e) => set({ title: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value).slice(0, 90) }) })}
            placeholder="Cara memilih case yang pas untuk iPhone 17"
          />
        </label>
        <label className="block text-sm">
          Alamat (URL)
          <div className="mt-1 flex items-center rounded-md border border-border bg-background text-sm focus-within:border-foreground">
            <span className="pl-3 text-muted-foreground">snapfit.id/artikel/</span>
            <input
              className="min-w-0 flex-1 bg-transparent py-2 pr-3 outline-none"
              value={f.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set({ slug: slugify(e.target.value) });
              }}
            />
          </div>
          <span className="mt-1 block text-xs text-muted-foreground">Sebaiknya tidak diubah setelah terbit (tautan lama akan mati).</span>
        </label>
        <label className="block text-sm">
          Ringkasan (tampil di kartu & Google)
          <textarea className={`mt-1 ${input}`} rows={3} maxLength={400} value={f.excerpt} onChange={(e) => set({ excerpt: e.target.value })} placeholder="1–2 kalimat yang membuat orang ingin membaca." />
        </label>

        <div className="text-sm">
          Isi artikel
          <div className="mt-1 flex flex-wrap items-center gap-1 rounded-t-md border border-b-0 border-border bg-muted/40 p-1.5">
            <button type="button" className={tool} title="Judul bagian" onClick={() => line("## ")}><Heading2 className="size-4" /></button>
            <button type="button" className={tool} title="Subjudul" onClick={() => line("### ")}><Heading3 className="size-4" /></button>
            <button type="button" className={tool} title="Tebal" onClick={() => wrap("**", "**", "teks tebal")}><Bold className="size-4" /></button>
            <button type="button" className={tool} title="Miring" onClick={() => wrap("*", "*", "teks miring")}><Italic className="size-4" /></button>
            <button type="button" className={tool} title="Tautan" onClick={() => wrap("[", "](/produk)", "teks tautan")}><Link2 className="size-4" /></button>
            <button type="button" className={tool} title="Poin" onClick={() => line("- ")}><List className="size-4" /></button>
            <button type="button" className={tool} title="Nomor" onClick={() => line("1. ")}><ListOrdered className="size-4" /></button>
            <button type="button" className={tool} title="Kutipan" onClick={() => line("> ")}><Quote className="size-4" /></button>
            <button type="button" className={tool} title="Sisipkan foto" disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && insertImage(e.target.files[0])} />
          </div>
          <textarea
            ref={area}
            className={`${input} min-h-[480px] resize-y rounded-t-none font-mono text-[13px] leading-relaxed`}
            value={f.content}
            onChange={(e) => set({ content: e.target.value })}
            placeholder={"Paragraf pembuka...\n\n## Judul bagian\nIsi bagian. **Tebal**, *miring*, [tautan](/produk).\n\n- poin satu\n- poin dua"}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Baris kosong = paragraf baru · <code>## </code> judul bagian · <code>### </code> subjudul · <code>- </code> poin · <code>1. </code> nomor · <code>&gt; </code> kutipan ·{" "}
            <code>**tebal**</code> · <code>*miring*</code> · <code>[teks](/tautan)</code> · tombol foto untuk menyisipkan gambar.
          </p>
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <div className="space-y-3 rounded-lg border border-border p-4">
          <p className="text-sm">
            Status: <b>{f.published ? "Terbit" : "Draf"}</b>
          </p>
          <div className="flex flex-wrap gap-2">
            {f.published ? (
              <>
                <Button type="button" onClick={() => save(true)} disabled={saving}>
                  {saving && <Loader2 className="size-4 animate-spin" />} Simpan
                </Button>
                <Button type="button" variant="outline" onClick={() => save(false)} disabled={saving}>
                  Jadikan draf
                </Button>
              </>
            ) : (
              <>
                <Button type="button" onClick={() => save(true)} disabled={saving}>
                  {saving && <Loader2 className="size-4 animate-spin" />} Terbitkan
                </Button>
                <Button type="button" variant="outline" onClick={() => save(false)} disabled={saving}>
                  Simpan draf
                </Button>
              </>
            )}
          </div>
          {msg && <p className={`text-sm ${msg.ok ? "text-green-700" : "text-destructive"}`}>{msg.text}</p>}
          {f.id && f.published && (
            <a href={`/artikel/${f.slug}`} target="_blank" rel="noopener" className="block text-sm underline">
              Lihat artikel ↗
            </a>
          )}
        </div>
        <div className="space-y-3 rounded-lg border border-border p-4">
          <div className="text-sm">
            Foto sampul (16:10 · 1600 × 1000)
            <div className="mt-1">
              <ImageInput value={f.coverImage} onChange={(v) => set({ coverImage: v })} />
            </div>
            {f.coverImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.coverImage} alt="" className="mt-2 aspect-[16/10] w-full rounded-md bg-muted object-cover" />
            )}
          </div>
          <label className="block text-sm">
            Penulis
            <input className={`mt-1 ${input}`} value={f.author} onChange={(e) => set({ author: e.target.value })} />
          </label>
          <label className="block text-sm">
            Tanggal terbit
            <input type="date" className={`mt-1 ${input}`} value={f.publishedAt} onChange={(e) => set({ publishedAt: e.target.value })} />
            <span className="mt-1 block text-xs text-muted-foreground">Tanggal di masa depan = terbit otomatis pada tanggal itu.</span>
          </label>
          <label className="block text-sm">
            Tag (pisahkan dengan koma)
            <input className={`mt-1 ${input}`} value={f.tags} onChange={(e) => set({ tags: e.target.value })} placeholder="panduan, iPhone 17, case" />
          </label>
        </div>
        {f.id && (
          <button type="button" onClick={remove} className="inline-flex items-center gap-1.5 text-sm text-destructive hover:underline">
            <Trash2 className="size-4" /> Hapus artikel
          </button>
        )}
      </aside>
    </div>
  );
}
