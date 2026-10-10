import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getShippingRates } from "@/lib/biteship";
import { ratesRequestSchema } from "@/lib/validations/checkout";
import { cartTotals } from "@/lib/cart-lines";

// AJAX: cek ongkir. Berat & nilai barang dihitung dari DB (bukan dari client).
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const parsed = ratesRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { postalCode, items } = parsed.data;
  const variants = await db.variant.findMany({
    where: { id: { in: items.map((i) => i.variantId) } },
    select: { id: true, weight: true, price: true, discounts: { select: { percent: true, active: true, startAt: true, endAt: true } } },
  });
  // Rumus bersama (lib/cart-lines.ts). Nilai barang = harga setelah diskon (nilai yang benar-benar dibayar).
  const { weight: weightGram, subtotal: itemValue } = cartTotals(items, variants);
  if (weightGram === 0) {
    return NextResponse.json({ error: "Item tidak ditemukan" }, { status: 400 });
  }

  try {
    const rates = await getShippingRates({
      destinationPostalCode: postalCode,
      weightGram,
      itemValue,
    });
    return NextResponse.json({ rates, weightGram });
  } catch {
    return NextResponse.json(
      { error: "Gagal mengambil tarif ongkir. Coba lagi." },
      { status: 502 },
    );
  }
}
