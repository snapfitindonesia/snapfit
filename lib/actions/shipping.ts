"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { activeDiscountPercent, applyDiscount } from "@/lib/format";
import { zoneQuote, ZONES_TAG, type ZoneQuote } from "@/lib/shipping-zone";
import { PROVINCES, provinceName } from "@/lib/wilayah";

const quoteSchema = z.object({
  provinceCode: z.string().regex(/^\d{2}$/),
  items: z.array(z.object({ variantId: z.string().min(1).max(64), qty: z.number().int().min(1).max(99) })).min(1).max(50),
});

/**
 * Perkiraan ongkir di checkout (per provinsi + berat). Berat & subtotal dihitung dari
 * DB — sama dengan createOrder, jadi angka yang tampil = angka yang ditagih.
 */
export async function quoteShipping(input: z.input<typeof quoteSchema>): Promise<ZoneQuote | null> {
  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success || !provinceName(parsed.data.provinceCode)) return null;
  const variants = await db.variant.findMany({
    where: { id: { in: parsed.data.items.map((i) => i.variantId) } },
    select: { id: true, weight: true, price: true, discounts: { select: { percent: true, active: true, startAt: true, endAt: true } } },
  });
  let weight = 0;
  let subtotal = 0;
  for (const line of parsed.data.items) {
    const v = variants.find((x) => x.id === line.variantId);
    if (!v) continue;
    weight += v.weight * line.qty;
    subtotal += applyDiscount(v.price, activeDiscountPercent(v.discounts)) * line.qty;
  }
  return zoneQuote(parsed.data.provinceCode, weight, subtotal);
}

/* ============================ ADMIN ============================ */

const rowSchema = z.object({
  provinceCode: z.string().regex(/^\d{2}$/),
  baseCost: z.coerce.number().int().min(0).max(5_000_000).nullable(), // null = pakai tarif flat
  perKg: z.coerce.number().int().min(0).max(5_000_000).default(0),
  etd: z.string().trim().max(40).default(""),
  available: z.boolean().default(true), // false = tidak dilayani (checkout ditolak)
});

/** Simpan tabel ongkir per provinsi. baseCost kosong (dan dilayani) → baris dihapus (kembali ke tarif flat). */
export async function saveShippingZones(rows: z.input<typeof rowSchema>[]): Promise<{ ok: boolean; error?: string; saved?: number }> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Tidak diizinkan." };
  }
  const parsed = z.array(rowSchema).max(PROVINCES.length).safeParse(rows);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  const valid = parsed.data.filter((r) => provinceName(r.provinceCode));
  const set = valid.filter((r) => r.baseCost !== null || !r.available);
  const unset = valid.filter((r) => r.baseCost === null && r.available).map((r) => r.provinceCode);
  await db.$transaction([
    db.shippingZone.deleteMany({ where: { provinceCode: { in: unset } } }),
    ...set.map((r) =>
      db.shippingZone.upsert({
        where: { provinceCode: r.provinceCode },
        create: { provinceCode: r.provinceCode, provinceName: provinceName(r.provinceCode)!, baseCost: r.baseCost ?? 0, perKg: r.perKg, etd: r.etd, available: r.available },
        update: { baseCost: r.baseCost ?? 0, perKg: r.perKg, etd: r.etd, available: r.available },
      }),
    ),
  ]);
  revalidatePath("/admin/ongkir");
  revalidateTag(ZONES_TAG); // keranjang: "ongkir mulai RpX"
  return { ok: true, saved: set.length };
}
