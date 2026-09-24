"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { applyDiscount } from "@/lib/format";
import {
  createOrderSchema,
  type CreateOrderInput,
  type CartLine,
} from "@/lib/validations/checkout";
import { getShippingRates } from "@/lib/biteship";
import { createShipment } from "@/lib/biteship";
import { createSnapToken, isMidtransMock } from "@/lib/midtrans";
import { isManualPayment, isFlatShipping, FLAT_SHIPPING_COST, MANUAL_BANK, qualifiesFreeShipping } from "@/lib/payment";
import { computeVoucherBenefit, type VoucherLike } from "@/lib/voucher";
import { sendEmail, orderConfirmationEmail } from "@/lib/email";
import { pushOrderToGinee } from "@/lib/ginee/orders";
import { isGineeConfigured } from "@/lib/ginee/config";

function activeDiscountPercent(
  discounts: { percent: number; active: boolean; startAt: Date | null; endAt: Date | null }[],
): number {
  const now = Date.now();
  const p = discounts
    .filter(
      (d) =>
        d.active &&
        (!d.startAt || d.startAt.getTime() <= now) &&
        (!d.endAt || d.endAt.getTime() >= now),
    )
    .map((d) => d.percent);
  return p.length ? Math.max(...p) : 0;
}

/**
 * Hitung ULANG order dari DB (harga varian + diskon + ongkir) — JANGAN percaya
 * angka dari client (lihat docs/04). Mengembalikan rincian tepercaya.
 */
async function computeOrder(
  lines: CartLine[],
  postalCode: string,
  rateId: string | undefined,
  voucherCode?: string,
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
  async function resolveVoucher(shippingCost: number) {
    const code = voucherCode?.trim().toUpperCase();
    if (!code) return { discount: 0, appliedCode: null as string | null };
    const voucher = await db.voucher.findUnique({ where: { code } });
    if (!voucher || !voucher.active) return { discount: 0, appliedCode: null };
    const benefit = computeVoucherBenefit(voucher as VoucherLike, subtotal, shippingCost);
    if (!benefit.valid || benefit.discount <= 0) return { discount: 0, appliedCode: null };
    return { discount: benefit.discount, appliedCode: code };
  }

  // Ongkir FLAT (Biteship belum aktif) — tak butuh pilih kurir. Gratis ongkir bila lolos ambang.
  if (isFlatShipping()) {
    const shippingCost = qualifiesFreeShipping(subtotal) ? 0 : FLAT_SHIPPING_COST;
    const rate = {
      id: "flat",
      courier: "flat",
      courierName: "Ongkir Flat",
      service: "flat",
      serviceName: "Flat",
      cost: shippingCost,
      etd: "-",
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

export async function createOrder(input: CreateOrderInput) {
  const data = createOrderSchema.parse(input);
  const { items, subtotal, shippingCost, discount, total, rate } = await computeOrder(
    data.items,
    data.address.postalCode,
    data.rateId,
    data.voucherCode,
  );

  const midtransOrderId = `SNAP-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;

  const order = await db.order.create({
    data: {
      status: "PENDING",
      subtotal,
      shippingCost,
      discount,
      total,
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

  // Mode TRANSFER MANUAL (Midtrans belum aktif): tak buat Snap token.
  // Order PENDING → pembeli transfer → admin konfirmasi (markOrderPaid).
  if (isManualPayment()) {
    return {
      orderId: order.id,
      midtransOrderId,
      snapToken: null,
      mock: false,
      manual: true,
      total,
      bank: MANUAL_BANK,
    };
  }

  const snap = await createSnapToken({
    orderId: midtransOrderId,
    grossAmount: total,
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
    ],
  });

  return {
    orderId: order.id,
    midtransOrderId,
    snapToken: snap.token,
    mock: snap.mock,
    manual: false,
    total,
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
      const tpl = orderConfirmationEmail(updated, items);
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

/**
 * DEV: simulasikan pembayaran sukses tanpa Midtrans/webhook (webhook tak bisa
 * menjangkau localhost). HANYA aktif saat mode mock (belum ada MIDTRANS_SERVER_KEY).
 */
export async function simulatePaymentSuccess(midtransOrderId: string) {
  if (!isMidtransMock()) {
    throw new Error("Simulasi hanya untuk mode mock (tanpa key Midtrans).");
  }
  return handlePaidOrder(midtransOrderId, "settlement-mock");
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
