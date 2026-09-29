import { db } from "@/lib/db";
import * as E from "@/lib/email";
import { withItemImages } from "@/lib/email-items";
import { isPlaceholderPrice } from "@/lib/price-guard";
import { MANUAL_BANK } from "@/lib/payment";
import { getCoinRules } from "@/lib/coins-settings";

// Contoh email untuk Admin → Email (pratinjau & kirim uji). Data pembeli FIKTIF; produk = produk
// toko sungguhan (foto & harga asli) agar tampilannya sama dengan email nyata.

export const EMAIL_SAMPLES = [
  { key: "dipesan", label: "Selesaikan pembayaran", when: "Pesanan dibuat (transfer manual)", to: "Pembeli" },
  { key: "pengingat-bayar", label: "Pengingat pembayaran", when: "Belum bayar 2 jam–3 hari (cron 19:00)", to: "Pembeli" },
  { key: "dibayar", label: "Pembayaran berhasil", when: "Status → Dibayar", to: "Pembeli" },
  { key: "dikemas", label: "Sedang dikemas", when: "Status → Diproses", to: "Pembeli" },
  { key: "dikirim", label: "Sudah dikirim", when: "Status → Dikirim + resi", to: "Pembeli" },
  { key: "ulasan", label: "Ajakan ulasan", when: "7 hari setelah dikirim (cron 10:00)", to: "Pembeli" },
  { key: "keranjang", label: "Keranjang ditinggal", when: "Checkout tak selesai (cron 20:00)", to: "Pembeli" },
  { key: "koin-hangus", label: "Koin segera hangus", when: "H-x sebelum hangus (cron 09:00)", to: "Member" },
  { key: "admin-pesanan-baru", label: "Pesanan baru", when: "Pesanan dibuat", to: "Admin" },
] as const;
export type EmailSampleKey = (typeof EMAIL_SAMPLES)[number]["key"];
export const isEmailSampleKey = (k: string): k is EmailSampleKey => EMAIL_SAMPLES.some((s) => s.key === k);

export async function buildEmailSample(key: EmailSampleKey): Promise<{ subject: string; html: string }> {
  const variants = await db.variant.findMany({
    where: { product: { archived: false }, stock: { gt: 0 } },
    orderBy: { product: { createdAt: "desc" } },
    take: 12,
    include: { product: { select: { name: true, slug: true, coverImage: true } } },
  });
  const picked = variants.filter((v) => !isPlaceholderPrice(v.price)).slice(0, 2);
  const items = await withItemImages(
    picked.map((v, i) => ({ variantId: v.id, name: `${v.product.name} — ${v.name}`, price: v.price, qty: i === 0 ? 2 : 1 })),
  );
  const subtotal = items.reduce((n, i) => n + i.price * i.qty, 0);
  const order = {
    midtransOrderId: "SNAP-CONTOH-123456",
    subtotal,
    shippingCost: 18000,
    discount: 10000,
    voucherCodes: "SNAPFIT10K",
    coinsUsed: 0,
    total: subtotal + 18000 - 10000,
    trackingNo: "JX1234567890",
    courier: "flat",
    createdAt: new Date(),
    address: {
      name: "Contoh Pembeli",
      phone: "0812-0000-0000",
      address: "Jl. Contoh No. 1",
      district: "Kebayoran Baru",
      city: "Jakarta Selatan",
      province: "DKI Jakarta",
      postalCode: "12130",
    },
  };
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.snapfit.id").replace(/\/$/, "");
  switch (key) {
    case "dipesan":
      return E.orderPlacedEmail(order, items, MANUAL_BANK);
    case "pengingat-bayar":
      return E.paymentReminderEmail(order, items, MANUAL_BANK);
    case "dibayar":
      return E.orderConfirmationEmail(order, items);
    case "dikemas":
      return E.orderProcessingEmail(order, items);
    case "dikirim":
      return E.orderShippedEmail(order, items);
    case "ulasan":
      return E.reviewRequestEmail(
        order,
        picked.map((v) => ({ name: v.product.name, url: `${site}/produk/${v.product.slug}`, image: E.emailImage(v.image || v.product.coverImage) })),
      );
    case "keranjang":
      return E.abandonedCartEmail({
        name: "Contoh",
        items: items.map((i) => ({ ...i, image: i.image ?? "" })),
        restoreUrl: `${site}/keranjang`,
        optOutUrl: `${site}/berhenti`,
      });
    case "koin-hangus": {
      const rules = await getCoinRules();
      return E.coinExpiryEmail({ amount: 2500, expiresAt: new Date(Date.now() + 6 * 86_400_000), balance: 4200, rules });
    }
    case "admin-pesanan-baru":
      return E.adminNewOrderEmail(order, items, { manual: true, waUrl: `${site}/admin/pesanan` });
  }
}
