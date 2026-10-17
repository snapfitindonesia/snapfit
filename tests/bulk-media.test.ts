// Edit Massal → Media: susun baris unduhan & hitung perubahan dari file.
import { describe, expect, it } from "vitest";
import { buildMediaRows, planMediaChanges, MEDIA_HEADERS, type MediaProduct } from "@/lib/bulk-media";

const CDN = "https://cdn.snapfit.id/";
const p: MediaProduct = {
  id: "p1",
  name: "Case Uji",
  coverImage: CDN + "sampul.webp",
  images: [CDN + "g1.webp", CDN + "g2.webp"],
  variants: [
    { color: "Hitam", type: "S26", name: "Hitam / S26", image: CDN + "hitam.webp" },
    { color: "Hitam", type: "S26 Ultra", name: "Hitam / S26 Ultra", image: CDN + "hitam.webp" },
    { color: "Biru", type: "S26", name: "Biru / S26", image: CDN + "biru.webp" },
  ],
};
const current = new Map([[p.id, p]]);
const H = [...MEDIA_HEADERS];

describe("unduh CSV media", () => {
  it("1 baris produk (sampul + galeri) + 1 baris per warna", () => {
    const rows = buildMediaRows([p]);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ jenis: "produk", foto_sampul: CDN + "sampul.webp", foto_2: CDN + "g1.webp", foto_3: CDN + "g2.webp", foto_4: "" });
    expect(rows.slice(1).map((r) => [r.variasi, r.foto_variasi])).toEqual([["Hitam", CDN + "hitam.webp"], ["Biru", CDN + "biru.webp"]]);
  });
  it("produk tanpa warna → variasi = tipe", () => {
    const rows = buildMediaRows([{ ...p, variants: [{ color: "", type: "Fold 8", name: "Fold 8", image: null }] }]);
    expect(rows[1]).toMatchObject({ jenis: "variasi", variasi: "Fold 8", foto_variasi: "" });
  });
});

describe("terapkan CSV media", () => {
  const rows = buildMediaRows([p]);
  it("file tanpa perubahan → tidak ada yang diubah", () => {
    const plan = planMediaChanges(rows, current, H);
    expect(plan).toMatchObject({ products: [], variants: [], errors: [] });
  });
  it("ganti sampul, urutkan & hapus foto galeri", () => {
    const edited = [{ ...rows[0]!, foto_sampul: CDN + "baru.webp", foto_2: CDN + "g2.webp", foto_3: "" }, ...rows.slice(1)];
    expect(planMediaChanges(edited, current, H).products).toEqual([{ productId: "p1", coverImage: CDN + "baru.webp", images: [CDN + "g2.webp"] }]);
  });
  it("foto variasi berlaku untuk semua varian dengan warna itu; kosong = tidak diubah", () => {
    const edited = [rows[0]!, { ...rows[1]!, foto_variasi: "https://down-id.img.susercontent.com/file/abc" }, { ...rows[2]!, foto_variasi: "" }];
    expect(planMediaChanges(edited, current, H).variants).toEqual([{ productId: "p1", option: "Hitam", image: "https://down-id.img.susercontent.com/file/abc" }]);
  });
  it("sampul kosong / error Excel / alamat lokal / variasi tak dikenal → dilewati dengan pesan", () => {
    const plan = planMediaChanges(
      [
        { ...rows[0]!, foto_sampul: "" },
        { ...rows[1]!, foto_variasi: "#NAME?" },
        { ...rows[2]!, foto_variasi: "http://localhost/x.webp" },
        { productId: "p1", jenis: "variasi", variasi: "Ungu", foto_variasi: CDN + "u.webp" },
        { productId: "hilang", jenis: "produk", foto_sampul: CDN + "x.webp" },
      ],
      current,
      H,
    );
    expect(plan.products).toEqual([]);
    expect(plan.variants).toEqual([]);
    expect(plan.skipped).toBe(5);
    expect(plan.errors.join(" ")).toMatch(/wajib diisi.*error Excel.*tidak diizinkan.*Ungu.*tidak ditemukan/s);
  });
  it("file lama tanpa kolom foto_9 → foto ke-9 yang ada tetap dipertahankan", () => {
    const many = { ...p, images: Array.from({ length: 8 }, (_, i) => `${CDN}g${i}.webp`) };
    const r = buildMediaRows([many])[0]!;
    const headers = H.filter((h) => h !== "foto_9");
    const plan = planMediaChanges([{ ...r, foto_2: CDN + "ganti.webp" }], new Map([[many.id, many]]), headers);
    expect(plan.products[0]!.images).toEqual([CDN + "ganti.webp", ...many.images.slice(1)]);
  });
});
