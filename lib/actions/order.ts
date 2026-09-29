"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { applyDiscount, activeDiscountPercent } from "@/lib/format";
import {
  createOrderSchema,
  type CreateOrderInput,
  type CartLine,
} from "@/lib/validations/checkout";
import { getShippingRates } from "@/lib/biteship";
import { createShipment } from "@/lib/biteship";
import { createSnapToken, isMidtransMock } from "@/lib/midtrans";
import { isManualPayment, isFlatShipping, MANUAL_BANK } from "@/lib/payment";
import { zoneQuote } from "@/lib/shipping-zone";
import { canCombine, computeVoucherBenefit, MAX_VOUCHERS, type VoucherLike } from "@/lib/voucher";
import { sendEmail, orderConfirmationEmail, orderPlacedEmail, adminNewOrderEmail } from "@/lib/email";
import { waLink } from "@/lib/wa";
import { isPlaceholderPrice } from "@/lib/price-guard";
import { pushOrderToGinee } from "@/lib/ginee/orders";
import { isGineeConfigured } from "@/lib/ginee/config";
import { markDraftsConverted } from "@/lib/cart-draft";
import { withItemImages } from "@/lib/email-items";
import { getCurrentUser } from "@/lib/supabase/server";
import { getCoinBalance, spendCoins } from "@/lib/coins";
import { maxCoinsUsable } from "@/lib/coins-rules";
import { getCoinRules } from "@/lib/coins-settings";

/**
 * Hitung ULANG order dari DB (harga varian + diskon + ongkir) — JANGAN percaya
 * angka dari client (lihat docs/04). Mengembalikan rincian tepercaya.
 */
async function computeOrder(
  lines: CartLine[],
  postalCode: string,
  rateId: string | undefined,
  voucherCodes: string[] = [],
  provinceCode?: string,
) {
  const variants = await db.variant.findMany({
    where: { id: { in: lines.map((l) => l.variantId) } },
    include: {
      product: { select: { name: true } },
      discounts: { select: { percent: true, active: true, startAt: true, endAt: true } },
    },
  });

  const items = lines.map((line) => {
    const v = variants.find((x) => x.id === line.variantId);
    if (!v) throw new Error("Varian tidak ditemukan / sudah tidak tersedia.");
    if (isPlaceholderPrice(v.price)) throw new Error(`"${v.name}" sedang tidak tersedia.`);
    if (line.qty > v.stock) throw new Error(`Stok "${v.name}" tidak cukup.`);
    const percent = activeDiscountPercent(v.discounts);
    const unit = applyDiscount(v.price, percent);
    return {
      variantId: v.id,
      name: `${v.product.name} — ${v.name}`,
      price: unit,
      qty: line.qty,
      weight: v.weight,
    };
  });

  const subtotal = items.reduce((n, i) => n + i.price * i.qty, 0);
  const totalWeight = items.reduce((n, i) => n + i.weight * i.qty, 0);

  // Voucher (otoritatif): dihitung ulang dari DB terhadap subtotal & ongkir.
  // Beberapa voucher: maks. satu per jenis, dan hanya bila saling bisa digabung (lib/voucher.ts).
  // Voucher tak valid / tak memberi potongan diabaikan; kombinasi terlarang → tolak.
  async function resolveVoucher(shippingCost: number) {
    const codes = [...new Set(voucherCodes.map((c) => c.trim().toUpperCase()).filter(Boolean))];
    if (!codes.length) return { discount: 0, appliedCode: null as string | null };
    if (codes.length > MAX_VOUCHERS) throw new Error(`Maks. ${MAX_VOUCHERS} voucher per pesanan.`);
    const found = await db.voucher.findMany({ where: { code: { in: codes }, active: true } });
    const used: { v: (typeof found)[number]; discount: number }[] = [];
    for (const v of found) {
      const b = computeVoucherBenefit(v as VoucherLike, subtotal, shippingCost);
      if (b.valid && b.discount > 0) used.push({ v, discount: b.discount });
    }
    for (let i = 0; i < used.length; i++)
      for (let j = i + 1; j < used.length; j++)
        if (!canCombine(used[i].v, used[j].v))
          throw new Error(`Voucher ${used[i].v.code} tidak bisa digabung dengan ${used[j].v.code}.`);
    return {
      discount: used.reduce((n, u) => n + u.discount, 0),
      appliedCode: used.length ? used.map((u) => u.v.code).join("+") : null,
    };
  }

  // Ongkir per provinsi (mode flat, Biteship belum aktif): tarif Admin → Ongkir, provinsi
  // yang belum diatur = tarif flat. Gratis ongkir (maks. FREE_SHIPPING_MAX) bila lolos ambang.
  // Sama dengan quoteShipping.
  if (isFlatShipping()) {
    const q = await zoneQuote(provinceCode, totalWeight, subtotal);
    if (!q.available) throw new Error("Maaf, belum ada kurir yang melayani pengiriman ke provinsi ini.");
    const shippingCost = q.cost;
    const rate = {
      id: "flat",
      courier: "flat",
      courierName: q.zone ? "Ongkir per provinsi" : "Ongkir Flat",
      service: "flat",
      serviceName: q.zone ? `${q.kg} kg` : "Flat",
      cost: shippingCost,
      etd: q.etd || "-",
    };
    const { discount, appliedCode } = await resolveVoucher(shippingCost);
    const total = Math.max(0, subtotal + shippingCost - discount);
    return { items, subtotal, shippingCost, discount, voucherCode: appliedCode, total, rate, totalWeight };
  }

  // Ongkir authoritative Biteship: ambil tarif dari server, cocokkan dgn pilihan client
  const rates = await getShippingRates({
    destinationPostalCode: postalCode,
    weightGram: totalWeight,
    itemValue: subtotal,
  });
  const rate = rates.find((r) => r.id === rateId);
  if (!rate) throw new Error("Kurir terpilih tidak valid. Cek ongkir ulang.");

  const shippingCost = rate.cost;
  const { discount, appliedCode } = await resolveVoucher(shippingCost);
  const total = Math.max(0, subtotal + shippingCost - discount);
  return { items, subtotal, shippingCost, discount, voucherCode: appliedCode, total, rate, totalWeight };
}

// Email pesanan baru: notifikasi ke admin + (transfer manual) instruksi bayar ke
// pembeli. Paralel & best-effort — gagal email tak menggagalkan checkout.
async function notifyNewOrder(
  order: Parameters<typeof adminNewOrderEmail>[0],
  rawItems: { variantId: string; name: string; price: number; qty: number }[],
  manual: boolean,
) {
  const items = await withItemImages(rawItems); // foto produk di email
  const a = (order.address ?? {}) as { name?: string; phone?: string; email?: string };
  const admins = (process.env.ADMIN_NOTIFY_EMAIL || "admin@snapfit.id").split(",").map((s) => s.trim()).filter(Boolean);
  const waUrl = waLink(a.phone, `Halo ${a.name ?? ""}, terima kasih sudah berbelanja di SNAPFIT 🙏 Pesanan ${order.midtransOrderId} sudah kami terima.`);
  const jobs: Promise<unknown>[] = admins.map((to) => sendEmail({ to, ...adminNewOrderEmail(order, items, { manual, waUrl }) }));
  if (manual && a.email) jobs.push(sendEmail({ to: a.email, ...orderPlacedEmail(order, items, MANUAL_BANK) }));
  for (const r of await Promise.allSettled(jobs)) {
    if (r.status === "rejected") console.error("Email pesanan baru gagal:", r.reason);
  }
}

export async function createOrder(input: CreateOrderInput) {
  const data = createOrderSchema.parse(input);
  const { items, subtotal, shippingCost, discount, voucherCode, total, rate } = await computeOrder(
    data.items,
    data.address.postalCode,
    data.rateId,
    [...(data.voucherCodes ?? []), ...(data.voucherCode ? [data.voucherCode] : [])],
    data.address.provinceCode,
  );

  const midtransOrderId = `SNAP-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;

  // Member: pesanan ditautkan ke akun (Pesanan Saya, koin). Koin dihitung ulang di server.
  const user = await getCurrentUser().catch(() => null);
  let coinsUsed = 0;
  if (user && data.useCoins) {
    coinsUsed = maxCoinsUsable(await getCoinBalance(user.id), subtotal, total, shippingCost, await getCoinRules());
  }
  const grandTotal = total - coinsUsed;

  // Pesanan + pemakaian koin dalam SATU transaksi: saldo tak bisa terpakai dobel.
  const order = await db.$transaction(async (tx) => {
    const created = await tx.order.create({
    data: {
      status: "PENDING",
      userId: user?.id ?? null,
      subtotal,
      shippingCost,
      discount,
      voucherCodes: voucherCode,
      coinsUsed,
      total: grandTotal,
      midtransOrderId,
      courier: rate.id, // "courier:service" — dipakai saat buat pengiriman
      address: { ...data.address, ...(data.note ? { note: data.note } : {}) },
      items: {
        create: items.map((i) => ({
          variantId: i.variantId,
          name: i.name,
          price: i.price,
          qty: i.qty,
        })),
      },
    },
    });
    if (user && coinsUsed > 0) await spendCoins(tx, user.id, coinsUsed, created.id);
    return created;
  });

  await notifyNewOrder(order, items, isManualPayment());
  // Keranjang ditinggal: kontak ini sudah memesan → jangan diingatkan.
  await markDraftsConverted(data.address.email, data.address.phone).catch((e) =>
    console.error("Tandai draf checkout gagal:", e),
  );

  // Mode TRANSFER MANUAL (Midtrans belum aktif): tak buat Snap token.
  // Order PENDING → pembeli transfer → admin konfirmasi (markOrderPaid).
  if (isManualPayment()) {
    return {
      orderId: order.id,
      midtransOrderId,
      snapToken: null,
      mock: false,
      manual: true,
      total: grandTotal,
      bank: MANUAL_BANK,
    };
  }

  const snap = await createSnapToken({
    orderId: midtransOrderId,
    grossAmount: grandTotal,
    customer: {
      name: data.address.name,
      phone: data.address.phone,
      email: data.address.email || undefined,
    },
    items: [
      ...items.map((i) => ({
        id: i.variantId,
        name: i.name,
        price: i.price,
        quantity: i.qty,
      })),
      { id: "shipping", name: `Ongkir ${rate.courierName}`, price: shippingCost, quantity: 1 },
      ...(discount > 0 ? [{ id: "voucher", name: "Voucher", price: -discount, quantity: 1 }] : []),
      ...(coinsUsed > 0 ? [{ id: "coins", name: "Koin SNAPFIT", price: -coinsUsed, quantity: 1 }] : []),
    ],
  });

  return {
    orderId: order.id,
    midtransOrderId,
    snapToken: snap.token,
    mock: snap.mock,
    manual: false,
    total: grandTotal,
    bank: MANUAL_BANK,
  };
}

/** Proses order jadi PAID: idempotent, kurangi stok, buat pengiriman + resi. */
export async function handlePaidOrder(
  midtransOrderId: string,
  paymentStatus = "settlement",
) {
  const order = await db.order.findUnique({ where: { midtransOrderId } });
  if (!order) throw new Error("Order tidak ditemukan.");
  if (order.status === "PAID" || order.status === "SHIPPED" || order.status === "DONE") {
    return { alreadyProcessed: true, orderId: order.id, status: order.status };
  }

  const items = await db.orderItem.findMany({ where: { orderId: order.id } });

  // Kurangi stok (best-effort, tak menurunkan di bawah 0)
  await db.$transaction(
    items.map((it) =>
      db.variant.updateMany({
        where: { id: it.variantId, stock: { gte: it.qty } },
        data: { stock: { decrement: it.qty } },
      }),
    ),
  );

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

  const updated = await db.order.update({
    where: { id: order.id },
    data: {
      status: "PAID",
      paymentStatus,
      ...(trackingNo ? { trackingNo } : {}),
    },
  });

  // Email konfirmasi (docs/08) — jangan gagalkan order kalau email error
  const addressData = updated.address as { email?: string; name?: string; phone?: string; address?: string; city?: string; province?: string; district?: string; postalCode?: string } | null;
  const email = addressData?.email;
  if (email) {
    try {
      const tpl = orderConfirmationEmail(updated, await withItemImages(items));
      await sendEmail({ to: email, ...tpl });
    } catch (e) {
      console.error("Email konfirmasi gagal:", e);
    }
  }

  // Push ke Ginee (best-effort) — hanya item produk hasil impor Ginee. Ginee
  // otomatis mengurangi stok gudang. Jangan gagalkan order kalau push gagal.
  if (isGineeConfigured() && !updated.gineePushedAt) {
    try {
      const variants = await db.variant.findMany({
        where: { id: { in: items.map((i) => i.variantId) } },
        select: { id: true, sku: true, weight: true, product: { select: { gineeProductId: true } } },
      });
      const gineeItems = items
        .map((it) => {
          const v = variants.find((x) => x.id === it.variantId);
          if (!v || !v.product.gineeProductId || !v.sku) return null;
          return { sku: v.sku, quantity: it.qty, actualPrice: it.price, weight: v.weight };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      if (gineeItems.length) {
        const res = await pushOrderToGinee({
          externalOrderSn: updated.midtransOrderId ?? updated.id,
          customer: { name: addressData?.name ?? "Pelanggan", email, phone: addressData?.phone ?? "" },
          address: {
            province: addressData?.province,
            city: addressData?.city,
            district: addressData?.district,
            postalCode: addressData?.postalCode,
            fullAddress: addressData?.address ?? "-",
          },
          items: gineeItems,
          payAmount: updated.total,
        });
        if (res.ok) {
          await db.order.update({
            where: { id: updated.id },
            data: { gineePushedAt: new Date(), gineeOrderSn: res.orderSn ?? null },
          });
        } else {
          console.error("Push Ginee gagal:", res.error);
        }
      }
    } catch (e) {
      console.error("Push Ginee error:", e);
    }
  }

  return { alreadyProcessed: false, orderId: updated.id, status: updated.status };
}

export async function getOrderSummary(midtransOrderId: string) {
  const order = await db.order.findUnique({
    where: { midtransOrderId },
    include: { items: true },
  });
  return order;
}

/**
 * ADMIN: konfirmasi pembayaran transfer manual sudah masuk → tandai LUNAS.
 * Menjalankan handlePaidOrder (kurangi stok, push Ginee, email konfirmasi).
 */
export async function markOrderPaid(orderId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Tidak diizinkan." };
  }
  const order = await db.order.findUnique({ where: { id: orderId }, select: { midtransOrderId: true, id: true } });
  if (!order) return { ok: false, error: "Order tidak ditemukan." };
  try {
    await handlePaidOrder(order.midtransOrderId ?? order.id, "manual-transfer");
    revalidatePath("/admin/pesanan");
    revalidatePath("/akun/pesanan");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal konfirmasi." };
  }
}
