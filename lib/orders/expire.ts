// Pesanan Menunggu Bayar yang melewati batas waktu → dibatalkan otomatis (cron harian payment-reminder).
// Tanpa ini koin member yang terpakai terkunci selamanya, dan transfer yang dikonfirmasi berminggu-minggu
// kemudian bisa jatuh pada stok yang sudah habis.
import "server-only";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { reverseOrderCoins } from "@/lib/coins";
import { sendEmail, orderAutoCancelledEmail } from "@/lib/email";
import { withItemImages } from "@/lib/email-items";
import { PENDING_EXPIRE_DAYS } from "@/lib/validations/admin";

export async function expireUnpaidOrders(now = new Date()) {
  const cutoff = new Date(now.getTime() - PENDING_EXPIRE_DAYS * 86_400_000);
  const orders = await db.order.findMany({
    where: { status: "PENDING", createdAt: { lt: cutoff } },
    include: { items: true },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  let cancelled = 0;
  for (const order of orders) {
    // Atomik: bila pembayaran/admin baru saja mengubah status, pesanan ini dilewati.
    const r = await db.order.updateMany({
      where: { id: order.id, status: "PENDING" },
      data: { status: "CANCELLED", paymentStatus: "expired" },
    });
    if (!r.count) continue;
    cancelled++;
    try {
      await reverseOrderCoins(order.id); // koin terpakai kembali ke member
    } catch (e) {
      console.error("Kembalikan koin pesanan kedaluwarsa gagal:", order.midtransOrderId, e);
    }
    const email = (order.address as { email?: string } | null)?.email;
    if (email) {
      try {
        await sendEmail({ to: email, ...orderAutoCancelledEmail(order, await withItemImages(order.items), PENDING_EXPIRE_DAYS) });
      } catch (e) {
        console.error("Email pesanan dibatalkan otomatis gagal:", order.midtransOrderId, e);
      }
    }
  }
  if (cancelled) {
    revalidatePath("/admin/pesanan");
    revalidatePath("/akun/pesanan");
  }
  return { candidates: orders.length, cancelled };
}
