// Proses pesanan LUNAS + push ke Ginee. SENGAJA bukan file "use server": fungsi di sini tak boleh
// bisa dipanggil dari browser (menandai lunas tanpa bayar / membaca alamat pembeli). Pemanggil:
// webhook Midtrans, tombol admin (markOrderPaid, sudah requireAdmin), halaman sukses (RSC), cron.
import "server-only";
import { revalidateTag } from "next/cache";
import { after } from "next/server";
import { CATALOG_TAG } from "@/lib/catalog";
import { db } from "@/lib/db";
import { createShipment } from "@/lib/biteship";
import { isFlatShipping } from "@/lib/payment";
import { sendEmail, orderConfirmationEmail, adminAlertEmail } from "@/lib/email";
import { withItemImages } from "@/lib/email-items";
import { findGineeManualOrder, pushOrderToGinee } from "@/lib/ginee/orders";
import { isGineeConfigured } from "@/lib/ginee/config";

type AddressData = {
  email?: string;
  name?: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  district?: string;
  postalCode?: string;
};

/** Kirim peringatan ke admin (ADMIN_NOTIFY_EMAIL). Best-effort. */
export async function alertAdmin(subject: string, title: string, lines: string[]) {
  const admins = (process.env.ADMIN_NOTIFY_EMAIL || "admin@snapfit.id").split(",").map((s) => s.trim()).filter(Boolean);
  const results = await Promise.allSettled(admins.map((to) => sendEmail({ to, ...adminAlertEmail({ subject, title, lines }) })));
  for (const r of results) if (r.status === "rejected") console.error("Email peringatan admin gagal:", r.reason);
}

/** Proses order jadi PAID: idempotent, kurangi stok, buat pengiriman + resi. */
export async function handlePaidOrder(midtransOrderId: string, paymentStatus = "settlement") {
  const order = await db.order.findUnique({ where: { midtransOrderId } });
  if (!order) throw new Error("Order tidak ditemukan.");

  // KLAIM ATOMIK PENDING → PAID: hanya SATU pemanggil yang menang (retry webhook Midtrans, webhook
  // bersamaan dengan admin "Konfirmasi Bayar", klik ganda). Yang kalah tak mengurangi stok / kirim
  // email / push Ginee lagi. Pesanan yang sudah DIBATALKAN (koinnya sudah dikembalikan) tak bisa jadi lunas.
  const claim = await db.order.updateMany({
    where: { id: order.id, status: "PENDING" },
    data: { status: "PAID", paymentStatus },
  });
  if (claim.count === 0) {
    const now = await db.order.findUnique({ where: { id: order.id }, select: { status: true } });
    if (now?.status === "CANCELLED") {
      console.error(`[bayar] Pembayaran masuk untuk pesanan BATAL ${midtransOrderId} — cek & refund manual.`);
      after(() =>
        alertAdmin(`Pembayaran masuk untuk pesanan BATAL ${midtransOrderId}`, "Pembayaran untuk pesanan yang sudah dibatalkan", [
          `Pesanan ${midtransOrderId} sudah dibatalkan, tetapi pembayaran masuk (${paymentStatus}).`,
          "Hubungi pembeli: kirim barang lewat pesanan baru atau kembalikan dananya.",
        ]),
      );
      return { alreadyProcessed: false, cancelled: true, orderId: order.id, status: "CANCELLED", shortfall: [] as string[] };
    }
    return { alreadyProcessed: true, orderId: order.id, status: now?.status ?? order.status, shortfall: [] as string[] };
  }

  const items = await db.orderItem.findMany({ where: { orderId: order.id } });

  // Kurangi stok (tak pernah di bawah 0). Stok tak cukup → admin diberi tahu (oversell perlu ditangani).
  const deducted = await db.$transaction(
    items.map((it) =>
      db.variant.updateMany({
        where: { id: it.variantId, stock: { gte: it.qty } },
        data: { stock: { decrement: it.qty } },
      }),
    ),
  );
  revalidateTag(CATALOG_TAG); // stok berubah → daftar produk (stok habis tersembunyi) segar
  const shortfall = items.filter((_, i) => deducted[i]!.count === 0).map((it) => `${it.name} × ${it.qty}`);
  if (shortfall.length) console.error(`[stok] Stok tak cukup saat ${midtransOrderId} lunas: ${shortfall.join("; ")}`);

  // Buat pengiriman via Biteship HANYA di mode Biteship. Mode flat: resi diisi
  // admin manual di langkah "Kirim Pesanan". Best-effort: jangan gagalkan LUNAS.
  let trackingNo: string | null = null;
  if (!isFlatShipping()) {
    try {
      const [courier, service] = (order.courier ?? "sicepat:reg").split(":");
      const address = order.address as { postalCode?: string } | null;
      const shipment = await createShipment({
        orderId: order.id,
        courier,
        service: service ?? "reg",
        destinationPostalCode: address?.postalCode ?? "",
      });
      trackingNo = shipment.trackingNo;
    } catch (e) {
      console.error("Buat pengiriman Biteship gagal (lanjut tanpa resi):", e);
    }
  }

  const updated = trackingNo
    ? await db.order.update({ where: { id: order.id }, data: { trackingNo } })
    : await db.order.findUniqueOrThrow({ where: { id: order.id } });

  // Email konfirmasi & push Ginee dijalankan SETELAH respons dikirim (after): webhook Midtrans / tombol
  // admin langsung dapat balasan (tak timeout → tak dikirim ulang). Klaim atomik di atas menjamin
  // blok ini hanya jalan sekali per pesanan.
  after(async () => {
    // Email konfirmasi (docs/08) — jangan gagalkan order kalau email error
    const email = (updated.address as AddressData | null)?.email;
    if (email) {
      try {
        await sendEmail({ to: email, ...orderConfirmationEmail(updated, await withItemImages(items)) });
      } catch (e) {
        console.error("Email konfirmasi gagal:", e);
      }
    }

    if (shortfall.length) {
      await alertAdmin(`Stok kurang untuk pesanan lunas ${midtransOrderId}`, "Stok tidak cukup untuk pesanan yang sudah dibayar", [
        `Pesanan ${midtransOrderId} sudah LUNAS, tetapi stok web tidak cukup untuk:`,
        ...shortfall.map((s) => `• ${s}`),
        "Cek stok fisik, lalu hubungi pembeli (tunggu restock / ganti varian / refund).",
      ]);
    }

    const g = await pushPaidOrderToGinee(updated.id);
    if (!g.ok) {
      await alertAdmin(`Pesanan ${midtransOrderId} belum masuk Ginee`, "Pesanan lunas gagal dikirim ke Ginee", [
        `Pesanan ${midtransOrderId} sudah LUNAS, tetapi gagal dikirim ke Ginee: ${g.error}`,
        "Sistem mencoba ulang otomatis setiap pagi (sebelum sinkron stok). Bisa juga klik “Kirim ulang ke Ginee” di Admin → Pesanan.",
      ]);
    }
  });

  return { alreadyProcessed: false, orderId: updated.id, status: updated.status, shortfall };
}

export async function getOrderSummary(midtransOrderId: string) {
  return db.order.findUnique({ where: { midtransOrderId }, include: { items: true } });
}

/** Item pesanan yang berasal dari Ginee (produk impor Ginee + SKU) — hanya ini yang dikirim ke Ginee. */
async function gineeItemsOf(items: { variantId: string; qty: number; price: number }[]) {
  const variants = await db.variant.findMany({
    where: { id: { in: items.map((i) => i.variantId) } },
    select: { id: true, sku: true, weight: true, product: { select: { gineeProductId: true } } },
  });
  return items.flatMap((it) => {
    const v = variants.find((x) => x.id === it.variantId);
    if (!v || !v.product.gineeProductId || !v.sku) return [];
    return [{ sku: v.sku, quantity: it.qty, actualPrice: it.price, weight: v.weight }];
  });
}

export type GineePushResult = { ok: boolean; skipped?: string; recovered?: boolean; error?: string };

/**
 * Kirim pesanan LUNAS ke Ginee (manual order) → Ginee mengurangi stok gudang & pesanan muncul untuk dikemas.
 * Aman dipanggil ulang (retry cron / tombol admin): pesanan yang sudah tercatat terkirim dilewati, dan
 * sebelum mengirim ULANG dicek dulu apakah Ginee ternyata sudah menerimanya (mis. dulu timeout padahal
 * sukses) — agar tak terjadi pesanan dobel di Ginee.
 */
export async function pushPaidOrderToGinee(orderId: string, opts: { retry?: boolean } = {}): Promise<GineePushResult> {
  if (!isGineeConfigured()) return { ok: true, skipped: "Ginee belum dikonfigurasi" };
  try {
    const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) return { ok: false, error: "Pesanan tidak ditemukan." };
    if (order.gineePushedAt) return { ok: true, skipped: "sudah terkirim" };
    if (!["PAID", "PROCESSING"].includes(order.status)) return { ok: true, skipped: `status ${order.status}` };

    const items = await gineeItemsOf(order.items);
    if (!items.length) return { ok: true, skipped: "tak ada produk Ginee" };
    const externalOrderSn = order.midtransOrderId ?? order.id;

    if (opts.retry) {
      const existing = await findGineeManualOrder(externalOrderSn, order.createdAt); // push terjadi ≤3 hari setelah pesan
      if (existing) {
        await db.order.update({ where: { id: order.id }, data: { gineePushedAt: new Date(), gineeOrderSn: existing.orderId } });
        return { ok: true, recovered: true };
      }
    }

    const a = (order.address ?? {}) as AddressData;
    const res = await pushOrderToGinee({
      externalOrderSn,
      customer: { name: a.name ?? "Pelanggan", email: a.email, phone: a.phone ?? "" },
      address: { province: a.province, city: a.city, district: a.district, postalCode: a.postalCode, fullAddress: a.address ?? "-" },
      items,
      payAmount: order.total,
    });
    if (!res.ok) {
      console.error("Push Ginee gagal:", externalOrderSn, res.error);
      return { ok: false, error: res.error ?? "Gagal push ke Ginee." };
    }
    await db.order.update({ where: { id: order.id }, data: { gineePushedAt: new Date(), gineeOrderSn: res.orderSn ?? null } });
    return { ok: true };
  } catch (e) {
    console.error("Push Ginee error:", e);
    return { ok: false, error: e instanceof Error ? e.message : "Gagal push ke Ginee." };
  }
}

/** Lunas tapi belum masuk Ginee (dalam 14 hari terakhir) → coba kirim ulang. Dipanggil cron sebelum sinkron stok. */
export async function retryPendingGineePushes() {
  if (!isGineeConfigured()) return { candidates: 0, pushed: 0, failed: [] as string[] };
  const orders = await db.order.findMany({
    where: { gineePushedAt: null, status: { in: ["PAID", "PROCESSING"] }, createdAt: { gte: new Date(Date.now() - 14 * 86_400_000) } },
    select: { id: true, midtransOrderId: true },
    take: 50,
  });
  let pushed = 0;
  const failed: string[] = [];
  for (const o of orders) {
    const r = await pushPaidOrderToGinee(o.id, { retry: true });
    if (!r.ok) failed.push(`${o.midtransOrderId ?? o.id}: ${r.error}`);
    else if (!r.skipped) pushed++;
  }
  if (failed.length) {
    await alertAdmin(`${failed.length} pesanan masih belum masuk Ginee`, "Kirim ulang ke Ginee masih gagal", [
      "Pesanan lunas berikut masih belum masuk Ginee setelah dicoba ulang otomatis:",
      ...failed.map((f) => `• ${f}`),
      "Buat manual di Ginee atau klik “Kirim ulang ke Ginee” di Admin → Pesanan. Stok web bisa tertimpa sinkron Ginee.",
    ]);
  }
  return { candidates: orders.length, pushed, failed };
}
