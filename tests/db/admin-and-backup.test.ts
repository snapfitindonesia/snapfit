// Edit Massal & backup ke database nyata (Postgres sementara di memori — lihat tests/support).
import { beforeEach, describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { bulkUpdateProducts } from "@/lib/actions/admin";
import { exportDatabase } from "@/lib/backup";
import { resetDb, seedStore } from "../support/fixtures";

beforeEach(async () => {
  await resetDb();
  await seedStore();
});

const row = (o: Record<string, string>) => ({ variantId: "v-hitam", productId: "", nama_produk: "Case Uji", brand: "", sku: "", harga: "89000", stok: "4", berat: "200", ...o });
const pid = async () => (await db.product.findFirstOrThrow()).id;

describe("Edit Massal", () => {
  it("upload tanpa perubahan → tidak ada yang ditulis", async () => {
    const r = await bulkUpdateProducts([row({ productId: await pid() })]);
    expect(r).toMatchObject({ ok: true, variantsUpdated: 0, productsUpdated: 0 });
  });

  it("ubah harga & stok → hanya varian itu yang diperbarui", async () => {
    const r = await bulkUpdateProducts([row({ productId: await pid(), harga: "79.000", stok: "12" })]);
    expect(r).toMatchObject({ variantsUpdated: 1, productsUpdated: 0 });
    expect(await db.variant.findUniqueOrThrow({ where: { id: "v-hitam" } })).toMatchObject({ price: 79_000, stock: 12 });
  });

  it("ganti judul → URL ikut judul baru, ID angka tetap", async () => {
    const r = await bulkUpdateProducts([row({ productId: await pid(), nama_produk: "Case Uji Baru" })]);
    expect(r.productsUpdated).toBe(1);
    expect(await db.product.findFirstOrThrow()).toMatchObject({ name: "Case Uji Baru", slug: "case-uji-baru", shortId: 1001 });
  });

  it("productId tak cocok dengan variannya → baris dilewati (tak menimpa produk lain)", async () => {
    const r = await bulkUpdateProducts([row({ productId: "produk-lain", harga: "1" })]);
    expect(r).toMatchObject({ variantsUpdated: 0, skipped: 1 });
    expect((await db.variant.findUniqueOrThrow({ where: { id: "v-hitam" } })).price).toBe(89_000);
  });

  it("sel error Excel (#NAME?) diabaikan, data asli aman", async () => {
    const r = await bulkUpdateProducts([row({ productId: await pid(), nama_produk: "#NAME?" })]);
    expect(r.errors.join(" ")).toMatch(/#NAME\?/);
    expect((await db.product.findFirstOrThrow()).name).toBe("Case Uji");
  });

  it("deskripsi kosong = tidak diubah; diisi = disimpan (baris baru dinormalkan)", async () => {
    await db.product.updateMany({ data: { description: "Lama" } });
    await bulkUpdateProducts([row({ productId: await pid(), deskripsi: "" })]);
    expect((await db.product.findFirstOrThrow()).description).toBe("Lama");
    await bulkUpdateProducts([row({ productId: await pid(), deskripsi: "Baris 1\r\nBaris 2" })]);
    expect((await db.product.findFirstOrThrow()).description).toBe("Baris 1\nBaris 2");
  });
});

describe("backup harian", () => {
  // Tabel yang SENGAJA tak di-backup (data sementara/statistik). Tabel lain WAJIB ada di backup.
  const SENGAJA_TIDAK = ["CheckoutDraft", "SearchTerm"];

  it("SEMUA tabel penting ikut di-backup (tabel baru tak boleh terlewat)", async () => {
    const data = await exportDatabase();
    const backed = new Set(Object.keys(data.tables).map((k) => k.toLowerCase()));
    // nama tabel backup = jamak camelCase (products, siteSettings, …) → cocokkan dengan nama model
    const plural = (m: string) => (m.endsWith("y") ? `${m.slice(0, -1)}ies` : `${m}s`).toLowerCase();
    const missing = Prisma.dmmf.datamodel.models.map((m) => m.name).filter((m) => !SENGAJA_TIDAK.includes(m) && !backed.has(plural(m)));
    expect(missing).toEqual([]);
  });

  it("isi backup sama dengan database (termasuk pengaturan, ongkir & koin)", async () => {
    await db.siteSetting.create({ data: { key: "payment.banks", value: [{ bank: "BCA", accountNumber: "123", accountName: "Uji" }] } });
    await db.coinEntry.create({ data: { userId: "u", amount: 5000, kind: "ADJUST", remaining: 5000 } });
    const data = await exportDatabase();
    expect(data.version).toBe(2);
    expect(data.tables.products).toHaveLength(1);
    expect(data.tables.variants).toHaveLength(3);
    expect(data.tables.shippingZones).toHaveLength(2);
    expect(data.tables.vouchers).toHaveLength(1);
    expect(data.tables.siteSettings).toEqual([expect.objectContaining({ key: "payment.banks" })]);
    expect(data.tables.coinEntries).toEqual([expect.objectContaining({ amount: 5000 })]);
  });
});
