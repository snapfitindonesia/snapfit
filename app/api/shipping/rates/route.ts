import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getShippingRates } from "@/lib/biteship";
import { ratesRequestSchema } from "@/lib/validations/checkout";

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
    select: { id: true, weight: true, price: true },
  });

  let weightGram = 0;
  let itemValue = 0;
  for (const line of items) {
    const v = variants.find((x) => x.id === line.variantId);
    if (!v) continue;
    weightGram += v.weight * line.qty;
    itemValue += v.price * line.qty;
  }
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
