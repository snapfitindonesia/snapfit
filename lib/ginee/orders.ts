// Push pesanan web → Ginee (CreateManualOrder). Saat order dibayar, buat order
// di toko Manual Ginee → Ginee otomatis mengurangi stok gudang (write-back).
// Hanya item yang berasal dari Ginee (Variant.sku dikenal Ginee) yang dikirim.
import { gineeRequest } from "./client";
import { GINEE_MANUAL_SHOP_ID, GINEE_WAREHOUSE_ID, isGineeConfigured } from "./config";

let cachedWarehouseId: string | null = null;

/** Ambil warehouseId default (env → cache → warehouse/search). */
export async function getDefaultWarehouseId(): Promise<string | null> {
  if (GINEE_WAREHOUSE_ID) return GINEE_WAREHOUSE_ID;
  if (cachedWarehouseId) return cachedWarehouseId;
  const res = await gineeRequest<{ content?: { id: string; isDefault?: boolean; status?: string }[] }>(
    "POST",
    "/openapi/warehouse/v1/search",
    { page: 0, size: 50 },
  );
  const list = res.data?.content ?? [];
  const wh = list.find((w) => w.isDefault) ?? list.find((w) => w.status === "ENABLE") ?? list[0];
  cachedWarehouseId = wh?.id ?? null;
  return cachedWarehouseId;
}

export type PushOrderItem = { sku: string; quantity: number; actualPrice: number; weight?: number };
export type PushOrderInput = {
  externalOrderSn: string;
  customer: { name: string; email?: string; phone: string };
  address: { province?: string; city?: string; district?: string; postalCode?: string; fullAddress: string };
  items: PushOrderItem[];
  payAmount: number;
};

export type PushOrderResult = { ok: boolean; orderSn?: string; error?: string };

/** Kirim 1 order ke Ginee sebagai manual order. */
export async function pushOrderToGinee(input: PushOrderInput): Promise<PushOrderResult> {
  if (!isGineeConfigured()) return { ok: false, error: "Ginee belum dikonfigurasi." };
  if (!input.items.length) return { ok: false, error: "Tak ada item Ginee untuk dikirim." };

  const warehouseId = await getDefaultWarehouseId();
  if (!warehouseId) return { ok: false, error: "warehouseId Ginee tak ditemukan." };

  const now = new Date().toISOString();
  const phone = input.customer.phone.startsWith("+") ? input.customer.phone : `+${input.customer.phone.replace(/^0/, "62")}`;
  const addr = {
    name: input.customer.name,
    phoneNumber: phone,
    country: "Indonesia",
    province: input.address.province || input.address.city || "-",
    city: input.address.city || "-",
    district: input.address.district || input.address.city || "-",
    zipCode: input.address.postalCode || "",
    fullAddress: input.address.fullAddress,
  };

  const payload = {
    externalOrderSn: input.externalOrderSn,
    shopId: GINEE_MANUAL_SHOP_ID,
    customerName: input.customer.name,
    customerEmail: input.customer.email || undefined,
    customerMobile: phone,
    paymentMethod: "PREPAY",
    payAmount: input.payAmount,
    payAtDatetime: now,
    orderItems: input.items.map((i) => ({
      sku: i.sku,
      quantity: i.quantity,
      actualPrice: i.actualPrice,
      warehouseId,
      weight: i.weight ?? 200,
    })),
    shippingAddress: addr,
    orderPayment: { currency: "IDR", totalDiscounts: 0, taxationFee: 0, insuranceFee: 0, commissionFee: 0, serviceFee: 0 },
    payRecords: [{ payAtDatetime: now, payAmount: String(input.payAmount), paySerialNumber: input.externalOrderSn, payRecordNote: "Website order" }],
  };

  try {
    // Ginee membalas HTTP 200 juga saat gagal ({ code: "BUSINESS_ERROR", message }) → wajib cek `code`.
    // Sukses: `data` = orderId Ginee berupa TEKS (mis. "SO6125178AF4428A0001DABC8F") — dulu dibaca sebagai
    // objek sehingga orderId tak pernah tersimpan (doc.ginee.com → CreateManualOrder).
    const res = await gineeRequest<string | { orderId?: string; orderSn?: string }>(
      "POST",
      "/openapi/order/v1/create-manual-order",
      payload,
    );
    if (String(res.code) !== "SUCCESS") return { ok: false, error: `Ginee: ${res.message ?? res.code}` };
    const d = res.data;
    const orderId = typeof d === "string" ? d : (d?.orderId ?? d?.orderSn);
    return { ok: true, orderSn: orderId ?? input.externalOrderSn };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal push ke Ginee." };
  }
}

type ListedOrder = { orderId: string; orderStatus?: string; externalOrderSn?: string; externalOrderId?: string };

/**
 * Cari orderId Ginee (SO…) sebuah manual order dari nomor pesanan web (externalOrderSn). Dipakai untuk
 * pesanan lama yang orderId-nya belum tersimpan. ListOrder: rentang waktu maks. 15 hari, data 3 bulan terakhir.
 */
export async function findGineeManualOrder(externalOrderSn: string, pushedAt: Date): Promise<ListedOrder | null> {
  const since = new Date(pushedAt.getTime() - 24 * 3600_000);
  const to = new Date(Math.min(pushedAt.getTime() + 13 * 24 * 3600_000, Date.now()));
  let cursor: unknown = undefined;
  for (let page = 0; page < 20; page++) {
    const res = await gineeRequest<{ content?: ListedOrder[]; nextCursor?: unknown; more?: boolean }>("POST", "/openapi/order/v2/list-order", {
      size: 100,
      shopIdList: [GINEE_MANUAL_SHOP_ID],
      createSince: since.toISOString(),
      createTo: to.toISOString(),
      ...(cursor ? { nextCursor: cursor } : {}),
    });
    if (String(res.code) !== "SUCCESS") throw new Error(`Ginee: ${res.message ?? res.code}`);
    const list = res.data?.content ?? [];
    const hit = list.find((o) => o.externalOrderSn === externalOrderSn || o.externalOrderId === externalOrderSn);
    if (hit) return hit;
    if (!res.data?.more || !res.data?.nextCursor || !list.length) return null;
    cursor = res.data.nextCursor;
  }
  return null;
}

export type CancelGineeResult = { ok: boolean; orderId?: string; alreadyCancelled?: boolean; error?: string };

/**
 * Batalkan manual order di Ginee (CancelOrderV2, channel MANUAL_ID) saat pesanan web dibatalkan, agar
 * stok gudang Ginee kembali & pesanan tak terlanjur dikemas. `gineeOrderSn` = orderId Ginee (SO…) bila
 * tersimpan; selain itu dicari lewat nomor pesanan web.
 */
export async function cancelGineeOrder(input: {
  gineeOrderSn: string | null;
  externalOrderSn: string;
  pushedAt: Date;
  note?: string;
}): Promise<CancelGineeResult> {
  if (!isGineeConfigured()) return { ok: false, error: "Ginee belum dikonfigurasi." };
  try {
    let orderId = input.gineeOrderSn && /^SO[0-9A-F]+$/i.test(input.gineeOrderSn) ? input.gineeOrderSn : null;
    if (!orderId) {
      const found = await findGineeManualOrder(input.externalOrderSn, input.pushedAt);
      if (!found) return { ok: false, error: "Pesanan tidak ditemukan di Ginee (cek manual)." };
      if (found.orderStatus === "CANCELLED") return { ok: true, orderId: found.orderId, alreadyCancelled: true };
      orderId = found.orderId;
    }
    const res = await gineeRequest<unknown>("POST", "/openapi/order/v2/cancel", {
      orderInfoList: [{ orderId, channelEnum: "MANUAL_ID", cancelNote: (input.note ?? "Dibatalkan dari website SNAPFIT").slice(0, 200) }],
    });
    if (String(res.code) !== "SUCCESS") return { ok: false, orderId, error: `Ginee: ${res.message ?? res.code}` };
    return { ok: true, orderId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal membatalkan di Ginee." };
  }
}
