"use server";

import { headers } from "next/headers";
import { db } from "@/lib/db";
import { normalizePhoneID } from "@/lib/wa";
import { isManualPayment, MANUAL_BANK } from "@/lib/payment";
import { limitAction } from "@/lib/security/ratelimit";

export type TrackedOrder = {
  orderNo: string;
  status: string; // PENDING | PAID | PROCESSING | SHIPPED | DONE | CANCELLED
  createdAt: string;
  shippedAt: string | null;
  firstName: string;
  city: string;
  courier: string | null;
  trackingNo: string | null;
  items: { name: string; qty: number; price: number }[];
  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;
  bank: { bank: string; accountNumber: string; accountName: string } | null; // hanya bila menunggu transfer
};

type Result = { ok: true; order: TrackedOrder } | { ok: false; error: string };

// Pesan sama untuk "tak ada" & "tak cocok" → tak membocorkan nomor pesanan valid.
const NOT_FOUND = "Pesanan tidak ditemukan. Periksa kembali nomor pesanan dan email/nomor HP yang dipakai saat checkout.";

function courierLabel(c: string | null): string | null {
  if (!c || c === "flat") return null;
  const [name, service] = c.split(":");
  return [name?.toUpperCase(), service?.toUpperCase()].filter(Boolean).join(" ");
}

/** Lacak pesanan tanpa akun: nomor pesanan + email ATAU nomor HP harus cocok. */
export async function trackOrder(input: { orderNo: string; contact: string }): Promise<Result> {
  const orderNo = String(input.orderNo ?? "").trim().toUpperCase();
  const contact = String(input.contact ?? "").trim();
  if (!orderNo || !contact) return { ok: false, error: "Isi nomor pesanan dan email/nomor HP." };

  // Batasi percobaan per IP (cegah menebak nomor pesanan orang lain).
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "anon";
  const rl = await limitAction("track", ip, 10, "60 s");
  if (!rl.success) return { ok: false, error: "Terlalu banyak percobaan. Coba lagi 1 menit lagi." };

  const order = await db.order.findUnique({ where: { midtransOrderId: orderNo }, include: { items: true } });
  if (!order) return { ok: false, error: NOT_FOUND };

  const a = (order.address ?? {}) as { name?: string; email?: string; phone?: string; city?: string; district?: string };
  const match = contact.includes("@")
    ? !!a.email && a.email.trim().toLowerCase() === contact.toLowerCase()
    : !!a.phone && normalizePhoneID(a.phone) === normalizePhoneID(contact) && normalizePhoneID(contact).length >= 10;
  if (!match) return { ok: false, error: NOT_FOUND };

  const pendingTransfer = order.status === "PENDING" && isManualPayment();
  return {
    ok: true,
    order: {
      orderNo: order.midtransOrderId ?? order.id,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
      shippedAt: order.shippedAt?.toISOString() ?? null,
      firstName: (a.name ?? "").trim().split(/\s+/)[0] ?? "",
      city: [a.district, a.city].filter(Boolean).join(", "),
      courier: courierLabel(order.courier),
      trackingNo: order.trackingNo,
      items: order.items.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
      subtotal: order.subtotal,
      shippingCost: order.shippingCost,
      discount: order.discount,
      total: order.total,
      bank: pendingTransfer ? MANUAL_BANK : null,
    },
  };
}
