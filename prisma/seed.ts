import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// URL gambar placeholder (di produksi diganti URL CDN — lihat docs/07-deployment-dns.md).
// Pakai .png (raster) — next/image menolak SVG remote tanpa dangerouslyAllowSVG.
const img = (label: string) =>
  `https://placehold.co/800x800/f4f4f5/18181b.png?text=${encodeURIComponent(label)}`;

async function main() {
  // Bersihkan (urutan aman FK) agar seed idempotent di dev
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.variant.deleteMany();
  await db.discount.deleteMany();
  await db.product.deleteMany();
  await db.category.deleteMany();
  await db.banner.deleteMany();
  await db.voucher.deleteMany();

  // Kategori = dimensi filter "tipe HP" (UX kritis) — slug cocok dgn nav (?tipe=…)
  const [iphone, samsung, tablet] = await Promise.all([
    db.category.create({ data: { name: "iPhone", slug: "iphone" } }),
    db.category.create({ data: { name: "Samsung", slug: "samsung" } }),
    db.category.create({ data: { name: "iPad & Tablet", slug: "tablet" } }),
  ]);

  // Produk + varian (harga = integer rupiah, stok di level varian)
  const caseIphone = await db.product.create({
    data: {
      slug: "clear-case-iphone",
      name: "Clear Case iPhone",
      description:
        "Case bening anti-kuning dengan proteksi sudut. Pas presisi per tipe.",
      coverImage: img("Clear Case iPhone"),
      categoryId: iphone.id,
      variants: {
        create: [
          { name: "iPhone 15", sku: "CC-IP15", price: 89000, stock: 40, weight: 60, image: img("iPhone 15") },
          { name: "iPhone 16", sku: "CC-IP16", price: 99000, stock: 35, weight: 60, image: img("iPhone 16") },
          { name: "iPhone 16 Pro", sku: "CC-IP16PRO", price: 109000, stock: 25, weight: 65, image: img("iPhone 16 Pro") },
        ],
      },
    },
  });

  await db.product.create({
    data: {
      slug: "tempered-glass-samsung-s24",
      name: "Tempered Glass Samsung Galaxy S24",
      description: "Pelindung layar 9H, oleophobic, full cover.",
      coverImage: img("Glass S24"),
      categoryId: samsung.id,
      variants: {
        create: [
          { name: "Galaxy S24", sku: "TG-S24", price: 59000, stock: 60, weight: 40, image: img("S24") },
          { name: "Galaxy S24 Ultra", sku: "TG-S24U", price: 69000, stock: 45, weight: 45, image: img("S24 Ultra") },
        ],
      },
    },
  });

  await db.product.create({
    data: {
      slug: "folio-case-ipad-air",
      name: "Folio Case iPad Air 11”",
      description: "Cover magnetik dengan slot Apple Pencil dan multi-angle stand.",
      coverImage: img("Folio iPad Air"),
      categoryId: tablet.id,
      variants: {
        create: [
          { name: "iPad Air 11 - Hitam", sku: "FC-IPADAIR-BLK", price: 149000, stock: 20, weight: 280, image: img("iPad Air Hitam") },
          { name: "iPad Air 11 - Navy", sku: "FC-IPADAIR-NVY", price: 149000, stock: 15, weight: 280, image: img("iPad Air Navy") },
        ],
      },
    },
  });

  // Banner hero (dikelola admin nanti)
  await db.banner.create({
    data: {
      type: "MAIN",
      image: img("Hero Banner"),
      targetUrl: "/produk",
      order: 0,
      active: true,
    },
  });

  // Diskon massal (relasi m-n ke produk) — pengganti productIds[] Postgres
  await db.discount.create({
    data: {
      name: "Promo Case iPhone",
      percent: 15,
      active: true,
      products: { connect: [{ id: caseIphone.id }] },
    },
  });

  // Voucher
  await db.voucher.createMany({
    data: [
      { code: "SNAP10K", type: "POTONGAN", amount: 10000, minPurchase: 100000, maxBenefit: 10000, active: true },
      { code: "GRATISONGKIR", type: "GRATIS_ONGKIR", amount: 0, minPurchase: 150000, maxBenefit: 20000, active: true },
    ],
  });

  const counts = {
    kategori: await db.category.count(),
    produk: await db.product.count(),
    varian: await db.variant.count(),
    banner: await db.banner.count(),
    diskon: await db.discount.count(),
    voucher: await db.voucher.count(),
  };
  console.log("Seed selesai:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
