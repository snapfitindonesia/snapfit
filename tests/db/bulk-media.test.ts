// Edit Massal → Media ke database nyata (Postgres sementara). R2 tak dikonfigurasi di tes → foto dari luar
// tak bisa disalin → perubahan itu harus dilewati, bukan menyimpan alamat luar.
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { bulkUpdateMedia } from "@/lib/actions/bulk-media";
import { MEDIA_HEADERS } from "@/lib/bulk-media";
import { resetDb, seedStore } from "../support/fixtures";

beforeEach(async () => {
  await resetDb();
  await seedStore();
  await db.variant.updateMany({ where: { id: "v-hitam" }, data: { color: "Hitam" } });
  await db.variant.updateMany({ where: { id: { in: ["v-biru", "v-dummy"] } }, data: { color: "Biru" } });
});
const H = [...MEDIA_HEADERS];
const pid = async () => (await db.product.findFirstOrThrow()).id;

describe("Edit Massal media", () => {
  it("sampul & galeri dari CDN sendiri disimpan; foto variasi menimpa semua varian warna itu", async () => {
    const id = await pid();
    const r = await bulkUpdateMedia(
      [
        { productId: id, jenis: "produk", foto_sampul: "https://cdn.snapfit.id/baru.webp", foto_2: "https://cdn.snapfit.id/g.webp" },
        { productId: id, jenis: "variasi", variasi: "Biru", foto_variasi: "https://cdn.snapfit.id/biru.webp" },
      ],
      H,
    );
    expect(r).toMatchObject({ ok: true, productsUpdated: 1, variantsUpdated: 2 });
    expect(await db.product.findFirstOrThrow()).toMatchObject({ coverImage: "https://cdn.snapfit.id/baru.webp", images: ["https://cdn.snapfit.id/g.webp"] });
    expect((await db.variant.findMany({ where: { color: "Biru" } })).map((v) => v.image)).toEqual(["https://cdn.snapfit.id/biru.webp", "https://cdn.snapfit.id/biru.webp"]);
    expect((await db.variant.findUniqueOrThrow({ where: { id: "v-hitam" } })).image).toBe("x");
  });
  it("foto dari luar yang gagal disalin → tidak disimpan (data asli aman)", async () => {
    const id = await pid();
    const r = await bulkUpdateMedia([{ productId: id, jenis: "produk", foto_sampul: "https://contoh-luar.example/foto.jpg" }], H);
    expect(r).toMatchObject({ ok: true, productsUpdated: 0 });
    expect(r.errors.join(" ")).toMatch(/gagal diunduh/);
    expect((await db.product.findFirstOrThrow()).coverImage).toBe("https://cdn.snapfit.id/uji.webp");
  });
});
