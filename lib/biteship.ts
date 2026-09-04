// Integrasi Biteship (ongkir & pengiriman) — lihat docs/05-pengiriman.md.
// Tanpa BITESHIP_API_KEY → mode MOCK (tarif deterministik) supaya checkout bisa
// dites lokal. Isi key utk tarif & order kurir asli.

const BITESHIP_BASE = "https://api.biteship.com/v1";

export type ShippingRate = {
  id: string; // "courier:service", dipakai sbg pilihan
  courier: string; // kode kurir (jne, jnt, ...)
  courierName: string;
  service: string; // kode layanan (reg, yes, ...)
  serviceName: string;
  cost: number; // rupiah, integer
  etd: string; // estimasi
};

export function isBiteshipMock(): boolean {
  return !process.env.BITESHIP_API_KEY;
}

/** Berat tertagih minimal 1000 gram (kebijakan umum kurir). */
function billableKg(weightGram: number): number {
  return Math.max(1, Math.ceil(weightGram / 1000));
}

function mockRates(weightGram: number): ShippingRate[] {
  const kg = billableKg(weightGram);
  return [
    { id: "sicepat:reg", courier: "sicepat", courierName: "SiCepat", service: "reg", serviceName: "REG", cost: 8500 + (kg - 1) * 2000, etd: "2-3 hari" },
    { id: "jne:reg", courier: "jne", courierName: "JNE", service: "reg", serviceName: "REG", cost: 9000 + (kg - 1) * 2000, etd: "2-3 hari" },
    { id: "jnt:ez", courier: "jnt", courierName: "J&T Express", service: "ez", serviceName: "EZ", cost: 10000 + (kg - 1) * 2500, etd: "1-2 hari" },
  ];
}

export async function getShippingRates(params: {
  destinationPostalCode: string;
  weightGram: number;
  itemValue?: number;
}): Promise<ShippingRate[]> {
  if (isBiteshipMock()) return mockRates(params.weightGram);

  const res = await fetch(`${BITESHIP_BASE}/rates/couriers`, {
    method: "POST",
    headers: {
      Authorization: process.env.BITESHIP_API_KEY as string,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      origin_postal_code: process.env.ORIGIN_POSTAL_CODE,
      destination_postal_code: params.destinationPostalCode,
      couriers: "sicepat,jne,jnt",
      items: [
        {
          name: "Paket SnapFit",
          value: params.itemValue ?? 0,
          weight: params.weightGram,
          quantity: 1,
        },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Biteship rates gagal: ${res.status}`);
  const data = await res.json();
  type BiteshipPricing = {
    courier_code: string;
    courier_name: string;
    courier_service_code: string;
    courier_service_name: string;
    price: number;
    duration?: string;
  };
  return (data.pricing as BiteshipPricing[]).map((p) => ({
    id: `${p.courier_code}:${p.courier_service_code}`,
    courier: p.courier_code,
    courierName: p.courier_name,
    service: p.courier_service_code,
    serviceName: p.courier_service_name,
    cost: p.price,
    etd: p.duration ?? "-",
  }));
}

export type ShipmentResult = { trackingNo: string; courier: string };

/** Buat order pengiriman setelah PAID. Mock → resi palsu. */
export async function createShipment(input: {
  orderId: string;
  courier: string;
  service: string;
  destinationPostalCode: string;
}): Promise<ShipmentResult> {
  if (isBiteshipMock()) {
    const rnd = Math.random().toString(36).slice(2, 10).toUpperCase();
    return { trackingNo: `MOCK${rnd}`, courier: input.courier };
  }

  // TODO produksi: POST /orders dgn detail alamat lengkap + items (lihat docs/05).
  const res = await fetch(`${BITESHIP_BASE}/orders`, {
    method: "POST",
    headers: {
      Authorization: process.env.BITESHIP_API_KEY as string,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      courier_company: input.courier,
      courier_type: input.service,
      // detail lain diisi saat integrasi penuh
    }),
  });
  if (!res.ok) throw new Error(`Biteship order gagal: ${res.status}`);
  const data = await res.json();
  return { trackingNo: data.courier?.tracking_id ?? "-", courier: input.courier };
}
