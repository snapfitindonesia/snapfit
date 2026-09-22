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
    const res = await gineeRequest<{ orderId?: string; orderSn?: string }>(
      "POST",
      "/openapi/order/v1/create-manual-order",
      payload,
    );
    return { ok: true, orderSn: res.data?.orderSn ?? res.data?.orderId ?? input.externalOrderSn };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal push ke Ginee." };
  }
}
