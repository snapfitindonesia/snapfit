// Integrasi Midtrans Snap — lihat docs/04-payment-gateway.md.
// Tanpa MIDTRANS_SERVER_KEY → mode MOCK (token palsu; pembayaran disimulasikan via
// Server Action dev). Isi key sandbox utk Snap.js + webhook asli.
import crypto from "crypto";

export function isMidtransMock(): boolean {
  return !process.env.MIDTRANS_SERVER_KEY;
}

function isProduction(): boolean {
  return process.env.MIDTRANS_IS_PRODUCTION === "true";
}

function snapBaseUrl(): string {
  return isProduction()
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";
}

export type SnapResult = { token: string; redirectUrl: string | null; mock: boolean };

export async function createSnapToken(input: {
  orderId: string; // = midtransOrderId
  grossAmount: number; // integer rupiah = total order
  customer: { name: string; phone: string; email?: string };
  items: { id: string; name: string; price: number; quantity: number }[];
}): Promise<SnapResult> {
  if (isMidtransMock()) {
    return { token: `mock-${input.orderId}`, redirectUrl: null, mock: true };
  }

  const auth = Buffer.from(
    `${process.env.MIDTRANS_SERVER_KEY}:`,
  ).toString("base64");

  const res = await fetch(snapBaseUrl(), {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: input.orderId,
        gross_amount: input.grossAmount,
      },
      customer_details: {
        first_name: input.customer.name,
        phone: input.customer.phone,
        email: input.customer.email,
      },
      item_details: input.items.map((i) => ({
        id: i.id,
        name: i.name.slice(0, 50),
        price: i.price,
        quantity: i.quantity,
      })),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Midtrans Snap gagal: ${res.status} ${text}`);
  }
  const data = await res.json();
  return { token: data.token, redirectUrl: data.redirect_url ?? null, mock: false };
}

export type MidtransNotification = {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  fraud_status?: string;
};

/** Verifikasi signature webhook: sha512(order_id+status_code+gross_amount+ServerKey). */
export function verifyWebhookSignature(n: MidtransNotification): boolean {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) return false;
  const expected = crypto
    .createHash("sha512")
    .update(n.order_id + n.status_code + n.gross_amount + serverKey)
    .digest("hex");
  return expected === n.signature_key;
}

/** Map status Midtrans → status internal Order. */
export function mapPaymentStatus(
  transactionStatus: string,
  fraudStatus?: string,
): "PAID" | "PENDING" | "CANCELLED" {
  if (transactionStatus === "capture") {
    return fraudStatus === "accept" ? "PAID" : "PENDING";
  }
  if (transactionStatus === "settlement") return "PAID";
  if (["cancel", "deny", "expire", "failure"].includes(transactionStatus)) {
    return "CANCELLED";
  }
  return "PENDING";
}
