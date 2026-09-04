"use server";

import { db } from "@/lib/db";
import { applyDiscount } from "@/lib/format";
import {
  createOrderSchema,
  type CreateOrderInput,
  type CartLine,
} from "@/lib/validations/checkout";
import { getShippingRates } from "@/lib/biteship";
import { createShipment } from "@/lib/biteship";
import { createSnapToken, isMidtransMock } from "@/lib/midtrans";
import { sendEmail, orderConfirmationEmail } from "@/lib/email";

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
async function computeOrder(lines: CartLine[], postalCode: string, rateId: string) {
  const variants = await db.variant.findMany({
    where: { id: { in: lines.map((l) => l.variantId) } },
    include: {
      product: {
        select: {
          name: true,
          discounts: { select: { percent: true, active: true, startAt: true, endAt: true } },
        },
      },
    },
  });

  const items = lines.map((line) => {
    const v = variants.find((x) => x.id === line.variantId);
    if (!v) throw new Error("Varian tidak ditemukan / sudah tidak tersedia.");
    if (line.qty > v.stock) throw new Error(`Stok "${v.name}" tidak cukup.`);
    const percent = activeDiscountPercent(v.product.discounts);
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

  // Ongkir authoritative: ambil tarif dari server, cocokkan dgn pilihan client
  const rates = await getShippingRates({
    destinationPostalCode: postalCode,
    weightGram: totalWeight,
    itemValue: subtotal,
  });
  const rate = rates.find((r) => r.id === rateId);
  if (!rate) throw new Error("Kurir terpilih tidak valid. Cek ongkir ulang.");

  const shippingCost = rate.cost;
  const total = subtotal + shippingCost;
  return { items, subtotal, shippingCost, total, rate, totalWeight };
}

export async function createOrder(input: CreateOrderInput) {
  const data = createOrderSchema.parse(input);
  const { items, subtotal, shippingCost, total, rate } = await computeOrder(
    data.items,
    data.address.postalCode,
    data.rateId,
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
      discount: 0,
      total,
      midtransOrderId,
      courier: rate.id, // "courier:service" — dipakai saat buat pengiriman
      address: { ...data.address },
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
    ],
  });

  return {
    orderId: order.id,
    midtransOrderId,
    snapToken: snap.token,
    mock: snap.mock,
    total,
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

  // Buat pengiriman (mock → resi palsu)
  const [courier, service] = (order.courier ?? "sicepat:reg").split(":");
  const address = order.address as { postalCode?: string } | null;
  const shipment = await createShipment({
    orderId: order.id,
    courier,
    service: service ?? "reg",
    destinationPostalCode: address?.postalCode ?? "",
  });

  const updated = await db.order.update({
    where: { id: order.id },
    data: {
      status: "PAID",
      paymentStatus,
      trackingNo: shipment.trackingNo,
    },
  });

  // Email konfirmasi (docs/08) — jangan gagalkan order kalau email error
  const email = (updated.address as { email?: string } | null)?.email;
  if (email) {
    try {
      const tpl = orderConfirmationEmail(updated, items);
      await sendEmail({ to: email, ...tpl });
    } catch (e) {
      console.error("Email konfirmasi gagal:", e);
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
