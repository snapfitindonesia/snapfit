import { NextResponse } from "next/server";
import {
  verifyWebhookSignature,
  mapPaymentStatus,
  type MidtransNotification,
} from "@/lib/midtrans";
import { handlePaidOrder } from "@/lib/actions/order";
import { db } from "@/lib/db";

// Webhook Midtrans — SUMBER KEBENARAN status bayar (bukan callback browser).
// Verifikasi signature dulu, baru update order (lihat docs/04).
// Catatan: tak bisa dites dari localhost; pakai simulatePaymentSuccess saat dev.
export async function POST(request: Request) {
  let payload: MidtransNotification;
  try {
    payload = (await request.json()) as MidtransNotification;
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  if (!verifyWebhookSignature(payload)) {
    return NextResponse.json({ error: "Signature tidak valid" }, { status: 403 });
  }

  const status = mapPaymentStatus(
    payload.transaction_status,
    payload.fraud_status,
  );

  try {
    if (status === "PAID") {
      await handlePaidOrder(payload.order_id, payload.transaction_status);
    } else if (status === "CANCELLED") {
      await db.order.updateMany({
        where: { midtransOrderId: payload.order_id, status: "PENDING" },
        data: { status: "CANCELLED", paymentStatus: payload.transaction_status },
      });
    }
    // PENDING → biarkan, tunggu notifikasi berikutnya
  } catch {
    return NextResponse.json({ error: "Gagal memproses" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
