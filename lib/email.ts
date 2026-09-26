import { formatRupiah } from "@/lib/format";

const FROM = process.env.EMAIL_FROM || "SNAPFIT <no-reply@snapfit.id>";
// Balasan pembeli diarahkan ke inbox yang dibaca (bukan no-reply).
const REPLY_TO = process.env.EMAIL_REPLY_TO || "admin@snapfit.id";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/** Kirim email via Resend. Tanpa key → hanya di-log (tidak terkirim). */
export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ mock: boolean }> {
  if (!isEmailConfigured()) {
    console.log(`[email:mock] to=${input.to} subject="${input.subject}"`);
    return { mock: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to: input.to, reply_to: REPLY_TO, subject: input.subject, html: input.html }),
  });
  if (!res.ok) throw new Error(`Resend gagal: ${res.status} ${(await res.text().catch(() => "")).slice(0, 200)}`);
  return { mock: false };
}

type Address = { name?: string; address?: string; city?: string; postalCode?: string };
type OrderLike = {
  midtransOrderId: string | null;
  subtotal: number;
  shippingCost: number;
  total: number;
  trackingNo: string | null;
  address: unknown; // Prisma Json — di-cast lokal
};
type ItemLike = { name: string; price: number; qty: number };

function addr(order: OrderLike): Address {
  return (order.address as Address | null) ?? {};
}

function itemsTable(items: ItemLike[]): string {
  const rows = items
    .map(
      (it) =>
        `<tr><td style="padding:4px 0">${it.name} × ${it.qty}</td><td style="padding:4px 0;text-align:right">${formatRupiah(it.price * it.qty)}</td></tr>`,
    )
    .join("");
  return `<table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>`;
}

function shell(title: string, body: string): string {
  return `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#18181b">
    <h1 style="font-size:20px">snapfit.</h1>
    <h2 style="font-size:16px">${title}</h2>
    ${body}
    <p style="color:#71717a;font-size:12px;margin-top:24px">Email otomatis SNAPFIT.</p>
  </div>`;
}

export function orderConfirmationEmail(order: OrderLike, items: ItemLike[]) {
  return {
    subject: `Pesanan ${order.midtransOrderId} sudah dibayar ✓`,
    html: shell(
      "Pembayaran diterima",
      `<p>Terima kasih, pesananmu sedang kami siapkan.</p>
       ${itemsTable(items)}
       <p style="font-size:14px">Ongkir: ${formatRupiah(order.shippingCost)}<br/>
       <strong>Total: ${formatRupiah(order.total)}</strong></p>
       <p style="font-size:13px;color:#71717a">Alamat: ${addr(order).name ?? ""}, ${addr(order).address ?? ""}, ${addr(order).city ?? ""} ${addr(order).postalCode ?? ""}</p>`,
    ),
  };
}

export function orderProcessingEmail(order: OrderLike, items: ItemLike[]) {
  return {
    subject: `Pesanan ${order.midtransOrderId} sedang kami proses 🛠️`,
    html: shell(
      "Pesanan sedang diproses",
      `<p>Hai ${addr(order).name ?? ""}, pesananmu sedang kami siapkan & kemas.</p>
       <p style="font-size:14px">Kami akan kabari lagi begitu paket dikirim beserta nomor resinya.</p>
       ${itemsTable(items)}`,
    ),
  };
}

export function orderShippedEmail(order: OrderLike, items: ItemLike[]) {
  return {
    subject: `Pesanan ${order.midtransOrderId} sudah dikirim 📦`,
    html: shell(
      "Pesanan dikirim",
      `<p>Pesananmu sedang dalam perjalanan.</p>
       <p style="font-size:14px"><strong>No. Resi: ${order.trackingNo ?? "-"}</strong></p>
       ${itemsTable(items)}`,
    ),
  };
}

/**
 * Ajakan ulas ~7 hari setelah dikirim. `productLinks` = daftar {name, url}
 * halaman produk yang dibeli (opsional) agar pembeli mudah memberi ulasan.
 */
export function reviewRequestEmail(
  order: OrderLike,
  productLinks: { name: string; url: string }[] = [],
) {
  const links = productLinks.length
    ? `<ul style="font-size:14px;padding-left:18px;margin:12px 0">${productLinks
        .map((p) => `<li><a href="${p.url}" style="color:#18181b">${p.name}</a></li>`)
        .join("")}</ul>`
    : "";
  return {
    subject: `Bagaimana pengalaman belanjamu di SNAPFIT? ⭐`,
    html: shell(
      "Bagikan pengalamanmu",
      `<p>Hai ${addr(order).name ?? ""}, semoga pesananmu sudah sampai dengan selamat!</p>
       <p style="font-size:14px">Kami ingin tahu pengalamanmu berbelanja di SNAPFIT. Ulasan jujurmu sangat membantu pembeli lain — dan kami. 🙏</p>
       ${links}
       <p style="font-size:14px">Cukup balas email ini untuk memberi masukan, atau tulis ulasan di halaman produk. Terima kasih sudah mempercayai SNAPFIT!</p>`,
    ),
  };
}
