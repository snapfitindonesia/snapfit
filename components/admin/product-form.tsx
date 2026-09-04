"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createProduct, updateProduct } from "@/lib/actions/admin";
import { ImageInput } from "@/components/admin/image-input";

type VariantRow = {
  id?: string;
  name: string;
  sku: string;
  price: string;
  stock: string;
  weight: string;
  image: string;
};

type Initial = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  coverImage: string;
  categoryId: string | null;
  variants: { id: string; name: string; sku: string; price: number; stock: number; weight: number; image: string }[];
};

const BLANK_VARIANT: VariantRow = {
  name: "",
  sku: "",
  price: "",
  stock: "0",
  weight: "200",
  image: "",
};

const input =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground";

export function ProductForm({
  categories,
  initial,
}: {
  categories: { id: string; name: string }[];
  initial?: Initial;
}) {
  const router = useRouter();
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [coverImage, setCoverImage] = useState(initial?.coverImage ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [variants, setVariants] = useState<VariantRow[]>(
    initial?.variants.map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      price: String(v.price),
      stock: String(v.stock),
      weight: String(v.weight),
      image: v.image,
    })) ?? [{ ...BLANK_VARIANT }],
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setV = (i: number, k: keyof VariantRow, val: string) =>
    setVariants((rows) => rows.map((r, idx) => (idx === i ? { ...r, [k]: val } : r)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const payload = {
      slug,
      name,
      description,
      coverImage,
      categoryId,
      variants: variants.map((v) => ({
        id: v.id,
        name: v.name,
        sku: v.sku,
        price: Number(v.price),
        stock: Number(v.stock),
        weight: Number(v.weight),
        image: v.image,
      })),
    };
    const res = initial
      ? await updateProduct(initial.id, payload)
      : await createProduct(payload);
    if (res.ok) {
      router.push("/admin/produk");
      router.refresh();
    } else {
      setError(res.error ?? "Gagal menyimpan.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-3xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">Nama produk</span>
          <input className={`mt-1.5 ${input}`} value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Slug</span>
          <input className={`mt-1.5 ${input}`} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="clear-case-iphone" required />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium">Deskripsi</span>
          <textarea className={`mt-1.5 ${input}`} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <div className="block">
          <span className="text-sm font-medium">Foto cover</span>
          <div className="mt-1.5">
            <ImageInput value={coverImage} onChange={setCoverImage} />
          </div>
        </div>
        <label className="block">
          <span className="text-sm font-medium">Kategori</span>
          <select className={`mt-1.5 ${input}`} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">— tanpa kategori —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Varian</h2>
          <Button type="button" variant="outline" size="sm" onClick={() => setVariants((r) => [...r, { ...BLANK_VARIANT }])}>
            <Plus className="size-4" /> Tambah varian
          </Button>
        </div>
        <div className="mt-3 space-y-3">
          {variants.map((v, i) => (
            <div key={i} className="rounded-lg border border-border p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <input className={input} placeholder="Nama (mis. iPhone 15)" value={v.name} onChange={(e) => setV(i, "name", e.target.value)} required />
                <input className={input} placeholder="SKU" value={v.sku} onChange={(e) => setV(i, "sku", e.target.value)} required />
                <input className={input} type="number" placeholder="Harga (rupiah)" value={v.price} onChange={(e) => setV(i, "price", e.target.value)} required />
                <input className={input} type="number" placeholder="Stok" value={v.stock} onChange={(e) => setV(i, "stock", e.target.value)} required />
                <input className={input} type="number" placeholder="Berat (gram)" value={v.weight} onChange={(e) => setV(i, "weight", e.target.value)} required />
                <ImageInput value={v.image} onChange={(url) => setV(i, "image", url)} placeholder="URL / upload foto varian" />
              </div>
              {variants.length > 1 && (
                <button type="button" onClick={() => setVariants((r) => r.filter((_, idx) => idx !== i))} className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive">
                  <Trash2 className="size-3.5" /> Hapus varian
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="size-4 animate-spin" />}
          {initial ? "Simpan perubahan" : "Buat produk"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/admin/produk")}>
          Batal
        </Button>
      </div>
    </form>
  );
}
