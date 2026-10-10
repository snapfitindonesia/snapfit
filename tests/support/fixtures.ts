// Data uji untuk kelompok "db": dibuat ulang bersih sebelum tiap tes.
import { db } from "@/lib/db";
import { provinceName } from "@/lib/wilayah";

export const flushAfter = () => (globalThis as unknown as { __flushAfter: () => Promise<void> }).__flushAfter();
export const setTestUser = (u: { id: string; email?: string } | null) =>
  (globalThis as unknown as { __setTestUser: (u: { id: string; email?: string } | null) => void }).__setTestUser(u);

/** Kosongkan semua tabel (urutan aman untuk relasi). */
export async function resetDb() {
  const tables = await db.$queryRawUnsafe<{ t: string }[]>(
    `select tablename::text as t from pg_tables where schemaname = 'public' and tablename not like '_prisma%'`,
  );
  if (tables.length) await db.$executeRawUnsafe(`TRUNCATE ${tables.map((x) => `"${x.t}"`).join(", ")} RESTART IDENTITY CASCADE`);
}

export const ADDRESS = {
  name: "Rina Uji",
  phone: "081234567890",
  email: "rina@example.com",
  address: "Jl. Malioboro No. 1",
  provinceCode: "34",
  province: "Daerah Istimewa Yogyakarta",
  regencyCode: "34.71",
  city: "Kota Yogyakarta",
  districtCode: "34.71.01",
  district: "Mantrijeron",
  postalCode: "55111",
};

/** Toko mini: 1 produk, 2 varian (stok 4 & 10), harga placeholder, ongkir DIY Rp20.000 + Rp8.000/kg. */
export async function seedStore() {
  const product = await db.product.create({
    data: {
      slug: "case-uji",
      shortId: 1001,
      name: "Case Uji",
      coverImage: "https://cdn.snapfit.id/uji.webp",
      variants: {
        create: [
          { id: "v-hitam", name: "Hitam", price: 89_000, stock: 4, image: "x", weight: 200 },
          { id: "v-biru", name: "Biru", price: 50_000, stock: 10, image: "x", weight: 1500 },
          { id: "v-dummy", name: "Dummy", price: 999_999, stock: 50, image: "x", weight: 200 },
        ],
      },
    },
  });
  await db.shippingZone.create({ data: { provinceCode: "34", provinceName: "Daerah Istimewa Yogyakarta", baseCost: 20_000, perKg: 8_000, etd: "1-2 hari" } });
  await db.shippingZone.create({ data: { provinceCode: "91", provinceName: provinceName("91")!, baseCost: 0, perKg: 0, available: false } });
  await db.voucher.create({ data: { code: "SNAP10K", type: "POTONGAN", amount: 10_000, minPurchase: 100_000, maxBenefit: 0, active: true, stackable: true } });
  return product;
}

export const stockOf = async (id: string) => (await db.variant.findUniqueOrThrow({ where: { id } })).stock;
