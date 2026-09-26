import { formatRupiah } from "@/lib/format";

const FROM = process.env.EMAIL_FROM || "SNAPFIT Indonesia <no-reply@snapfit.id>";
// Balasan pembeli diarahkan ke inbox yang dibaca (bukan no-reply).
const REPLY_TO = process.env.EMAIL_REPLY_TO || "admin@snapfit.id";
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.snapfit.id").replace(/\/$/, "");

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

/* ============================ TEMPLATE ============================ */

type Address = {
  name?: string;
  phone?: string;
  address?: string;
  district?: string;
  city?: string;
  province?: string;
  postalCode?: string;
};
type OrderLike = {
  midtransOrderId: string | null;
  subtotal: number;
  shippingCost: number;
  total: number;
  trackingNo: string | null;
  address: unknown; // Prisma Json — di-cast lokal
  discount?: number;
  courier?: string | null;
  createdAt?: Date | string;
};
type ItemLike = { name: string; price: number; qty: number };

// Warna brand (oranye logo SNAPFIT) + netral.
const C = {
  brand: "#F05000",
  brand2: "#FF8A1F",
  ink: "#18181b",
  muted: "#71717a",
  line: "#e4e4e7",
  soft: "#FFF4EC",
  bg: "#f4f4f5",
};

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function addr(order: OrderLike): Address {
  return (order.address as Address | null) ?? {};
}

function firstName(order: OrderLike): string {
  return (addr(order).name ?? "").trim().split(/\s+/)[0] || "Kak";
}

function fmtDate(d?: Date | string): string {
  const date = d ? new Date(d) : new Date();
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
}

function orderUrl(order: OrderLike): string {
  return `${SITE}/checkout/sukses?order=${encodeURIComponent(order.midtransOrderId ?? "")}`;
}

/** Kotak sorotan (seperti kotak "Nomor token" di email Shopee). */
function highlight(label: string, value: string, hint?: string): string {
  return `
  <tr><td style="padding:20px 0 6px;font-size:14px;font-weight:700;color:${C.ink}">${esc(label)}</td></tr>
  ${hint ? `<tr><td style="padding:0 0 10px;font-size:12px;color:${C.muted}">${esc(hint)}</td></tr>` : ""}
  <tr><td style="background:${C.soft};border-radius:6px;padding:18px;text-align:center;font-size:22px;letter-spacing:1px;color:${C.brand};font-weight:600">${esc(value)}</td></tr>`;
}

/** Baris label : nilai pada tabel rincian. */
function row(label: string, value: string, opts: { strong?: boolean; accent?: boolean } = {}): string {
  const color = opts.accent ? C.brand : C.ink;
  const weight = opts.strong || opts.accent ? 700 : 600;
  return `<tr>
    <td style="padding:7px 0;font-size:14px;color:${C.ink};width:42%;vertical-align:top">${esc(label)}</td>
    <td style="padding:7px 0;font-size:14px;color:${color};font-weight:${weight};vertical-align:top">${value}</td>
  </tr>`;
}

function details(order: OrderLike, items: ItemLike[], opts: { withTotals?: boolean } = {}): string {
  const products = items
    .map((it) => `${esc(it.name)} <span style="color:${C.muted};font-weight:400">× ${it.qty}</span>`)
    .join("<br/>");
  const a = addr(order);
  const place = [a.address, a.district, a.city, a.province, a.postalCode].filter(Boolean).map(esc).join(", ");
  return `
  <tr><td style="padding:24px 0 8px;font-size:14px;font-weight:700;color:${C.ink}">Rincian Pesanan</td></tr>
  <tr><td>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse">
      ${row("Nomor pesanan", esc(order.midtransOrderId ?? "-"))}
      ${row("Tanggal pesanan", esc(fmtDate(order.createdAt)))}
      ${row("Produk", products)}
      ${
        opts.withTotals
          ? `${row("Subtotal", formatRupiah(order.subtotal))}
             ${row("Ongkos kirim", order.shippingCost > 0 ? formatRupiah(order.shippingCost) : "Gratis")}
             ${order.discount ? row("Diskon voucher", `− ${formatRupiah(order.discount)}`) : ""}
             ${row("Total pembayaran", formatRupiah(order.total), { accent: true })}`
          : ""
      }
      ${a.name ? row("Penerima", `${esc(a.name)}${a.phone ? `<br/><span style="font-weight:400;color:${C.muted}">${esc(a.phone)}</span>` : ""}`) : ""}
      ${place ? row("Alamat pengiriman", `<span style="font-weight:400">${place}</span>`) : ""}
    </table>
  </td></tr>`;
}

function button(label: string, href: string): string {
  return `<tr><td style="padding:24px 0 4px">
    <a href="${href}" style="display:inline-block;background:${C.brand};color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 22px;border-radius:6px">${esc(label)}</a>
  </td></tr>`;
}

/** Kerangka email: header oranye + logo, isi, penutup, footer kecil. */
function shell(opts: { preheader: string; greeting: string; intro: string; body: string }): string {
  return `<!doctype html>
<html lang="id"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>SNAPFIT</title></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(opts.preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.bg}">
    <tr><td align="center" style="padding:24px 12px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff">
        <tr><td style="background:${C.brand};background-image:linear-gradient(110deg,${C.brand} 55%,${C.brand2});padding:16px 24px">
          <a href="${SITE}" style="text-decoration:none"><img src="${SITE}/email/logo-white.png" width="120" height="30" alt="SNAPFIT" style="display:block;border:0"/></a>
        </td></tr>
        <tr><td style="padding:28px 24px 8px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr><td style="font-size:16px;font-weight:700;color:${C.ink};padding-bottom:14px">${esc(opts.greeting)}</td></tr>
            <tr><td style="font-size:14px;line-height:1.6;color:${C.ink};padding-bottom:18px;border-bottom:1px solid ${C.line}">${opts.intro}</td></tr>
            ${opts.body}
            <tr><td style="padding:28px 0 0;font-size:14px;line-height:1.6;color:${C.ink}">Salam,<br/>Tim SNAPFIT</td></tr>
            <tr><td style="padding:24px 0 24px;font-size:12px;line-height:1.6;color:${C.muted}">
              Butuh bantuan? Cukup balas email ini, tim kami akan membantu.<br/>
              Email ini dikirim otomatis dari <a href="${SITE}" style="color:${C.brand}">snapfit.id</a> karena kamu berbelanja di SNAPFIT.
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

type Bank = { bank: string; accountNumber: string; accountName: string };

/** Kotak rekening tujuan transfer + jumlah. */
function bankBox(bank: Bank, total: number): string {
  return `
  <tr><td style="padding:20px 0 6px;font-size:14px;font-weight:700;color:${C.ink}">Transfer ke rekening</td></tr>
  <tr><td style="padding:0 0 10px;font-size:12px;color:${C.muted}">Transfer tepat sejumlah total agar pembayaran mudah kami cocokkan.</td></tr>
  <tr><td style="background:${C.soft};border-radius:6px;padding:16px 18px">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr><td style="font-size:12px;color:${C.muted}">${esc(bank.bank)}</td></tr>
      <tr><td style="font-size:22px;font-weight:700;letter-spacing:1px;color:${C.ink};padding:2px 0">${esc(bank.accountNumber)}</td></tr>
      <tr><td style="font-size:13px;color:${C.ink};padding-bottom:12px">a/n ${esc(bank.accountName)}</td></tr>
      <tr><td style="border-top:1px solid #f5d9c4;padding-top:12px;font-size:13px;color:${C.muted}">Jumlah transfer</td></tr>
      <tr><td style="font-size:22px;font-weight:700;color:${C.brand}">${formatRupiah(total)}</td></tr>
    </table>
  </td></tr>`;
}

/** Ke pembeli, sesaat setelah checkout (transfer manual): instruksi bayar. */
export function orderPlacedEmail(order: OrderLike, items: ItemLike[], bank: Bank) {
  return {
    subject: `[SNAPFIT] Selesaikan pembayaran pesanan ${order.midtransOrderId}`,
    html: shell({
      preheader: `Transfer ${formatRupiah(order.total)} ke ${bank.bank} ${bank.accountNumber} untuk memproses pesananmu.`,
      greeting: `Halo ${firstName(order)}`,
      intro: `Terima kasih, pesananmu <strong>sudah kami terima</strong>. Selesaikan pembayaran via transfer di bawah ini — pesanan segera kami proses setelah pembayaran terverifikasi.`,
      body:
        bankBox(bank, order.total) +
        details(order, items, { withTotals: true }) +
        `<tr><td style="padding:16px 0 0;font-size:13px;line-height:1.6;color:${C.ink}">Sudah transfer? <strong>Balas email ini dengan bukti transfer</strong> (sertakan nomor pesanan) agar lebih cepat kami proses.</td></tr>` +
        button("Lihat Pesanan", orderUrl(order)),
    }),
  };
}

/** Ke pembeli, pesanan belum dibayar beberapa jam setelah checkout. */
export function paymentReminderEmail(order: OrderLike, items: ItemLike[], bank: Bank) {
  return {
    subject: `Pesananmu menunggu pembayaran ⏳ — ${order.midtransOrderId}`,
    html: shell({
      preheader: `Pesananmu masih kami simpan. Transfer ${formatRupiah(order.total)} untuk memprosesnya.`,
      greeting: `Halo ${firstName(order)}`,
      intro: `Kami lihat pesananmu <strong>belum dibayar</strong>. Produknya masih kami simpan untukmu — selesaikan transfer agar pesanan bisa segera dikirim. Abaikan email ini jika kamu sudah membayar.`,
      body:
        bankBox(bank, order.total) +
        details(order, items) +
        `<tr><td style="padding:16px 0 0;font-size:13px;line-height:1.6;color:${C.ink}">Ada kendala atau ingin mengubah pesanan? Cukup balas email ini.</td></tr>` +
        button("Lihat Pesanan", orderUrl(order)),
    }),
  };
}

/** Ke admin, setiap ada pesanan baru. */
export function adminNewOrderEmail(order: OrderLike, items: ItemLike[], opts: { manual: boolean; waUrl?: string }) {
  const a = addr(order);
  return {
    subject: `🛒 Pesanan baru ${formatRupiah(order.total)} — ${a.name ?? "Pembeli"} (${order.midtransOrderId})`,
    html: shell({
      preheader: `${items.reduce((n, i) => n + i.qty, 0)} item · ${formatRupiah(order.total)} · ${opts.manual ? "menunggu transfer" : "via Midtrans"}`,
      greeting: "Ada pesanan baru! 🎉",
      intro: opts.manual
        ? `Pesanan baru masuk dan <strong>menunggu transfer</strong>. Cek mutasi rekening, lalu tandai <em>Sudah Dibayar</em> di dashboard agar pembeli menerima konfirmasi.`
        : `Pesanan baru masuk via Midtrans. Status akan otomatis berubah saat pembayaran berhasil.`,
      body:
        highlight("Total pesanan", formatRupiah(order.total)) +
        details(order, items, { withTotals: true }) +
        (a.phone && opts.waUrl
          ? `<tr><td style="padding:20px 0 0"><a href="${esc(opts.waUrl)}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 22px;border-radius:6px">Chat pembeli di WhatsApp</a></td></tr>`
          : "") +
        button("Buka di Dashboard", `${SITE}/admin/pesanan`),
    }),
  };
}

export function orderConfirmationEmail(order: OrderLike, items: ItemLike[]) {
  return {
    subject: `[SNAPFIT] Pembayaran pesanan ${order.midtransOrderId} berhasil ✓`,
    html: shell({
      preheader: `Pembayaran ${formatRupiah(order.total)} diterima. Pesananmu segera kami siapkan.`,
      greeting: `Halo ${firstName(order)}`,
      intro: `Terima kasih telah berbelanja di SNAPFIT. Kami informasikan bahwa <strong>pembayaranmu telah kami terima</strong> dan pesanan segera kami siapkan.`,
      body:
        highlight("Nomor pesanan", order.midtransOrderId ?? "-", "Simpan nomor ini untuk menanyakan status pesanan.") +
        details(order, items, { withTotals: true }) +
        button("Lihat Pesanan", orderUrl(order)),
    }),
  };
}

export function orderProcessingEmail(order: OrderLike, items: ItemLike[]) {
  return {
    subject: `[SNAPFIT] Pesanan ${order.midtransOrderId} sedang dikemas 📦`,
    html: shell({
      preheader: "Pesananmu sedang kami siapkan & kemas.",
      greeting: `Halo ${firstName(order)}`,
      intro: `Pesananmu <strong>sedang kami siapkan &amp; kemas</strong>. Kami akan mengabarimu lagi begitu paket dikirim, lengkap dengan nomor resinya.`,
      body:
        highlight("Status pesanan", "Sedang dikemas") +
        details(order, items) +
        button("Lihat Pesanan", orderUrl(order)),
    }),
  };
}

export function orderShippedEmail(order: OrderLike, items: ItemLike[]) {
  const courier = order.courier ? order.courier.toUpperCase() : "";
  return {
    subject: `[SNAPFIT] Pesanan ${order.midtransOrderId} sudah dikirim 🚚`,
    html: shell({
      preheader: `Paketmu dalam perjalanan${order.trackingNo ? ` · Resi ${order.trackingNo}` : ""}.`,
      greeting: `Halo ${firstName(order)}`,
      intro: `Kabar baik! Pesananmu <strong>sudah kami kirim</strong> dan sedang dalam perjalanan ke alamatmu.`,
      body:
        highlight(
          courier ? `Nomor resi ${courier}` : "Nomor resi",
          order.trackingNo ?? "-",
          "Gunakan nomor ini untuk melacak paket di aplikasi/situs kurir.",
        ) +
        details(order, items) +
        button("Lihat Pesanan", orderUrl(order)),
    }),
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
    ? `<tr><td style="padding:22px 0 8px;font-size:14px;font-weight:700;color:${C.ink}">Produk yang kamu beli</td></tr>
       ${productLinks
         .map(
           (p) => `<tr><td style="padding:10px 14px;border:1px solid ${C.line};border-radius:6px;font-size:14px">
             <a href="${esc(p.url)}" style="color:${C.ink};text-decoration:none;font-weight:600">${esc(p.name)}</a>
             <a href="${esc(p.url)}" style="float:right;color:${C.brand};text-decoration:none;font-weight:700">Beri ulasan ›</a>
           </td></tr><tr><td style="height:8px;line-height:8px">&nbsp;</td></tr>`,
         )
         .join("")}`
    : "";
  return {
    subject: `Bagaimana pesananmu, ${firstName(order)}? ⭐`,
    html: shell({
      preheader: "Ceritakan pengalamanmu — ulasanmu sangat membantu pembeli lain.",
      greeting: `Halo ${firstName(order)}`,
      intro: `Semoga pesananmu <strong>${esc(order.midtransOrderId ?? "")}</strong> sudah sampai dengan selamat! Kami ingin tahu pengalamanmu. Ulasan jujurmu sangat membantu pembeli lain — dan kami. 🙏`,
      body:
        highlight("Beri penilaian", "★ ★ ★ ★ ★") +
        links +
        (productLinks[0] ? button("Tulis Ulasan", productLinks[0].url) : ""),
    }),
  };
}
