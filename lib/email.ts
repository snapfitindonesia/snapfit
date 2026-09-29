import { formatRupiah } from "@/lib/format";
import { STORE_WA_DISPLAY, waChatUrl } from "@/lib/contact";

const FROM = process.env.EMAIL_FROM || "SNAPFIT Indonesia <no-reply@snapfit.id>";
// Balasan pembeli diarahkan ke inbox yang dibaca (bukan no-reply).
const REPLY_TO = process.env.EMAIL_REPLY_TO || "admin@snapfit.id";
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.snapfit.id").replace(/\/$/, "");

function isEmailConfigured(): boolean {
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
// Gaya selaras situs (bersih, monokrom + aksen oranye logo): kanvas hangat, kartu putih membulat,
// logo berwarna, tombol pil hitam, foto produk, penanda tahap pesanan. HTML tabel + gaya inline
// (Gmail/Outlook/Apple Mail). Lebar 600px, tetap terbaca di HP.

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
  voucherCodes?: string | null;
  coinsUsed?: number;
  courier?: string | null;
  createdAt?: Date | string;
};
/** `image` opsional (URL absolut) — lihat lib/email-items.ts. */
type ItemLike = { name: string; price: number; qty: number; image?: string | null };

const C = {
  brand: "#F05000", // oranye logo — aksen hemat (total, tahap aktif)
  ink: "#0a0a0a",
  body: "#3f3f46",
  muted: "#71717a",
  line: "#e7e5e4",
  soft: "#f5f5f4",
  bg: "#efede9",
  font: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
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

function trackUrl(order: OrderLike): string {
  return `${SITE}/lacak?order=${encodeURIComponent(order.midtransOrderId ?? "")}`;
}

function orderUrl(order: OrderLike): string {
  return `${SITE}/checkout/sukses?order=${encodeURIComponent(order.midtransOrderId ?? "")}`;
}

/** Baris isi (satu <tr>) dengan jarak atas. */
function block(html: string, padTop = 24): string {
  return `<tr><td style="padding:${padTop}px 0 0">${html}</td></tr>`;
}

/** Judul bagian kecil kapital. */
function sectionTitle(text: string): string {
  return `<div style="font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:${C.muted};padding-bottom:10px">${esc(text)}</div>`;
}

/** Kotak sorotan: label kecil → nilai besar (nomor pesanan, resi, saldo koin). */
function highlight(label: string, value: string, hint?: string): string {
  return block(`
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.soft};border-radius:14px">
    <tr><td style="padding:18px 20px">
      <div style="font-size:12px;color:${C.muted}">${esc(label)}</div>
      <div style="font-size:24px;line-height:1.3;font-weight:800;letter-spacing:-0.3px;color:${C.ink};padding-top:2px">${esc(value)}</div>
      ${hint ? `<div style="font-size:12px;line-height:1.5;color:${C.muted};padding-top:6px">${esc(hint)}</div>` : ""}
    </td></tr>
  </table>`);
}

/** Baris label : nilai (rincian & total). */
function row(label: string, value: string, opts: { strong?: boolean; accent?: boolean } = {}): string {
  const big = opts.strong || opts.accent;
  return `<tr>
    <td style="padding:5px 0;font-size:${big ? 15 : 14}px;color:${big ? C.ink : C.body};font-weight:${big ? 700 : 400}">${esc(label)}</td>
    <td align="right" style="padding:5px 0;font-size:${big ? 18 : 14}px;color:${opts.accent ? C.brand : C.ink};font-weight:${big ? 800 : 600};white-space:nowrap">${value}</td>
  </tr>`;
}

/** URL foto untuk email: foto CDN sendiri → varian 128px (tampil 64px, tajam di retina). */
export function emailImage(src: string | null | undefined): string | null {
  if (!src || !/^https:\/\//.test(src)) return null;
  // cdn.snapfit.id/<nama>.webp (bukan varian/foto lebar) → .w128.webp
  if (/^https:\/\/cdn\.snapfit\.id\/[^/]+\.webp$/.test(src) && !/\.w\d+\.webp$|-wide\.webp$/.test(src)) {
    return src.replace(/\.webp$/, ".w128.webp");
  }
  return src;
}

/** Daftar produk: foto (bila ada) · nama · qty × harga · subtotal baris. */
function itemList(items: ItemLike[]): string {
  return items
    .map((it, i) => {
      const src = emailImage(it.image);
      const img = src
        ? `<img src="${esc(src)}" width="64" height="64" alt="" style="display:block;width:64px;height:64px;border-radius:12px;background:${C.soft};object-fit:contain;border:0"/>`
        : `<div style="width:64px;height:64px;border-radius:12px;background:${C.soft}"></div>`;
      return `<tr>
        <td width="64" style="padding:${i ? 14 : 0}px 0 0;vertical-align:top">${img}</td>
        <td style="padding:${i ? 14 : 0}px 12px 0 14px;vertical-align:top">
          <div style="font-size:14px;line-height:1.4;font-weight:600;color:${C.ink}">${esc(it.name)}</div>
          <div style="font-size:13px;color:${C.muted};padding-top:3px">${it.qty} × ${formatRupiah(it.price)}</div>
        </td>
        <td align="right" style="padding:${i ? 14 : 0}px 0 0;vertical-align:top;font-size:14px;font-weight:600;color:${C.ink};white-space:nowrap">${formatRupiah(it.price * it.qty)}</td>
      </tr>`;
    })
    .join("");
}

function details(order: OrderLike, items: ItemLike[], opts: { withTotals?: boolean } = {}): string {
  const a = addr(order);
  const place = [a.address, a.district, a.city, a.province, a.postalCode].filter(Boolean).map(esc).join(", ");
  const totals = opts.withTotals
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:16px;border-top:1px solid ${C.line};padding-top:10px">
        ${row("Subtotal", formatRupiah(order.subtotal))}
        ${row("Ongkos kirim", order.shippingCost > 0 ? formatRupiah(order.shippingCost) : "Gratis")}
        ${order.discount ? row(order.voucherCodes ? `Voucher ${order.voucherCodes.split("+").join(" + ")}` : "Diskon voucher", `− ${formatRupiah(order.discount)}`) : ""}
        ${order.coinsUsed ? row("Koin SNAPFIT", `− ${formatRupiah(order.coinsUsed)}`) : ""}
        <tr><td colspan="2" style="padding-top:6px;border-bottom:1px solid ${C.line}"></td></tr>
        ${row("Total", formatRupiah(order.total), { accent: true })}
      </table>`
    : "";
  const info = (label: string, value: string) =>
    `<div style="font-size:12px;color:${C.muted}">${esc(label)}</div><div style="font-size:14px;line-height:1.5;color:${C.ink};padding:2px 0 12px">${value}</div>`;
  return (
    block(`${sectionTitle("Rincian pesanan")}
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${itemList(items)}</table>${totals}`, 28) +
    block(`
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid ${C.line}">
        <tr><td style="padding:16px 0 0">
          ${info("Nomor pesanan", `<strong>${esc(order.midtransOrderId ?? "-")}</strong> · ${esc(fmtDate(order.createdAt))}`)}
          ${a.name ? info("Dikirim ke", `${esc(a.name)}${a.phone ? ` · <span style="color:${C.muted}">${esc(a.phone)}</span>` : ""}${place ? `<br/>${place}` : ""}`) : ""}
        </td></tr>
      </table>`, 20)
  );
}

/** Tombol utama: pil hitam (sama dengan tombol situs). */
function button(label: string, href: string): string {
  return block(
    `<a href="${href}" style="display:inline-block;background:${C.ink};color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 28px;border-radius:999px">${esc(label)}</a>`,
    28,
  );
}

/** Teks paragraf kecil di badan email. */
function note(html: string, padTop = 18): string {
  return block(`<div style="font-size:14px;line-height:1.6;color:${C.body}">${html}</div>`, padTop);
}

const STEPS = ["Dipesan", "Dibayar", "Dikemas", "Dikirim"];

/** Penanda tahap pesanan: selesai = hitam, aktif = oranye, berikutnya = abu. */
function stepper(active: number): string {
  const cells = STEPS.map((label, i) => {
    const color = i < active ? C.ink : i === active ? C.brand : "#d6d3d1";
    const text = i <= active ? C.ink : C.muted;
    return `<td width="25%" style="padding:0 2px;vertical-align:top">
      <div style="height:4px;border-radius:4px;background:${color};font-size:0;line-height:0">&nbsp;</div>
      <div style="font-size:11px;font-weight:${i === active ? 700 : 500};color:${text};padding-top:7px">${label}</div>
    </td>`;
  }).join("");
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:22px"><tr>${cells}</tr></table>`;
}

/** Kerangka email: logo, (tahap), sapaan besar, pembuka, isi, penutup, footer. */
function shell(opts: { preheader: string; greeting: string; intro: string; body: string; step?: number }): string {
  const wa = waChatUrl("Halo SNAPFIT, saya mau tanya.");
  const link = (label: string, href: string) => `<a href="${href}" style="color:${C.ink};text-decoration:none;font-weight:600">${label}</a>`;
  return `<!doctype html>
<html lang="id"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="color-scheme" content="light"/><meta name="supported-color-schemes" content="light"/><title>SNAPFIT</title></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:${C.font};-webkit-font-smoothing:antialiased">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(opts.preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.bg}">
    <tr><td align="center" style="padding:28px 12px 8px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px">
        <tr><td style="padding:0 8px 18px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
            <td><a href="${SITE}" style="text-decoration:none"><img src="${SITE}/email/logo.png" width="116" height="28" alt="SNAPFIT" style="display:block;border:0"/></a></td>
            <td align="right" style="font-size:13px"><a href="${SITE}/lacak" style="color:${C.muted};text-decoration:none">Lacak pesanan</a></td>
          </tr></table>
        </td></tr>
        <tr><td style="background:#ffffff;border-radius:20px;padding:32px 28px 32px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr><td>
              ${opts.step !== undefined ? stepper(opts.step) : ""}
              <div style="font-size:26px;line-height:1.2;font-weight:800;letter-spacing:-0.6px;color:${C.ink}">${esc(opts.greeting)}</div>
              <div style="font-size:15px;line-height:1.65;color:${C.body};padding-top:12px">${opts.intro}</div>
            </td></tr>
            ${opts.body}
            <tr><td style="padding:30px 0 0;font-size:14px;line-height:1.6;color:${C.body}">Salam hangat,<br/><strong style="color:${C.ink}">Tim SNAPFIT</strong></td></tr>
          </table>
        </td></tr>
        <tr><td align="center" style="padding:24px 16px 8px;font-size:13px;color:${C.muted}">
          ${link("Belanja", `${SITE}/produk`)}&nbsp;&nbsp;·&nbsp;&nbsp;${link("Lacak Pesanan", `${SITE}/lacak`)}&nbsp;&nbsp;·&nbsp;&nbsp;${link("WhatsApp", wa)}
        </td></tr>
        <tr><td align="center" style="padding:8px 24px 28px;font-size:12px;line-height:1.6;color:${C.muted}">
          Butuh bantuan? Balas email ini atau chat WhatsApp ${esc(STORE_WA_DISPLAY)}.<br/>
          Email ini dikirim otomatis dari <a href="${SITE}" style="color:${C.muted}">snapfit.id</a> terkait aktivitasmu di SNAPFIT.<br/>
          © ${new Date().getFullYear()} SNAPFIT Indonesia
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

type Bank = { bank: string; accountNumber: string; accountName: string };

/** Kotak rekening tujuan transfer + jumlah. */
function bankBox(bank: Bank, total: number): string {
  return block(`
  ${sectionTitle("Transfer ke rekening")}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.soft};border-radius:14px">
    <tr><td style="padding:18px 20px">
      <div style="font-size:12px;color:${C.muted}">${esc(bank.bank)} · a/n ${esc(bank.accountName)}</div>
      <div style="font-size:26px;font-weight:800;letter-spacing:1.5px;color:${C.ink};padding:4px 0 14px">${esc(bank.accountNumber)}</div>
      <div style="border-top:1px solid ${C.line};padding-top:12px;font-size:12px;color:${C.muted}">Jumlah transfer (tepat)</div>
      <div style="font-size:24px;font-weight:800;color:${C.brand};padding-top:2px">${formatRupiah(total)}</div>
    </td></tr>
  </table>
  <div style="font-size:12px;line-height:1.5;color:${C.muted};padding-top:8px">Transfer tepat sejumlah total agar pembayaranmu cepat kami cocokkan.</div>`);
}

/** Ke pembeli, sesaat setelah checkout (transfer manual): instruksi bayar. */
export function orderPlacedEmail(order: OrderLike, items: ItemLike[], bank: Bank) {
  return {
    subject: `[SNAPFIT] Selesaikan pembayaran pesanan ${order.midtransOrderId}`,
    html: shell({
      step: 0,
      preheader: `Transfer ${formatRupiah(order.total)} ke ${bank.bank} ${bank.accountNumber} untuk memproses pesananmu.`,
      greeting: `Pesananmu sudah kami terima, ${firstName(order)}`,
      intro: `Satu langkah lagi: selesaikan transfer di bawah ini. Pesanan segera kami proses setelah pembayaran terverifikasi.`,
      body:
        bankBox(bank, order.total) +
        note(`Sudah transfer? <strong style="color:${C.ink}">Balas email ini dengan bukti transfer</strong> agar lebih cepat kami proses.`) +
        button("Lihat Pesanan", orderUrl(order)) +
        details(order, items, { withTotals: true }),
    }),
  };
}

/** Ke pembeli, pesanan belum dibayar beberapa jam setelah checkout. */
export function paymentReminderEmail(order: OrderLike, items: ItemLike[], bank: Bank) {
  return {
    subject: `Pesananmu menunggu pembayaran ⏳ — ${order.midtransOrderId}`,
    html: shell({
      step: 0,
      preheader: `Pesananmu masih kami simpan. Transfer ${formatRupiah(order.total)} untuk memprosesnya.`,
      greeting: `Pesananmu masih menunggu, ${firstName(order)}`,
      intro: `Produknya masih kami simpan untukmu. Selesaikan transfer agar pesanan bisa segera dikirim. Abaikan email ini jika kamu sudah membayar.`,
      body:
        bankBox(bank, order.total) +
        button("Lihat Pesanan", orderUrl(order)) +
        details(order, items) +
        note("Ada kendala atau ingin mengubah pesanan? Cukup balas email ini."),
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
      greeting: "Ada pesanan baru 🎉",
      intro: opts.manual
        ? `Pesanan baru masuk dan <strong style="color:${C.ink}">menunggu transfer</strong>. Cek mutasi rekening, lalu tandai <em>Sudah Dibayar</em> di dashboard agar pembeli menerima konfirmasi.`
        : `Pesanan baru masuk via Midtrans. Status berubah otomatis saat pembayaran berhasil.`,
      body:
        highlight("Total pesanan", formatRupiah(order.total), `${items.reduce((n, i) => n + i.qty, 0)} item · ${a.name ?? "Pembeli"}`) +
        button("Buka di Dashboard", `${SITE}/admin/pesanan`) +
        (a.phone && opts.waUrl
          ? block(`<a href="${esc(opts.waUrl)}" style="display:inline-block;background:#1a7f4b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 22px;border-radius:999px">Chat pembeli di WhatsApp</a>`, 12)
          : "") +
        details(order, items, { withTotals: true }),
    }),
  };
}

export function orderConfirmationEmail(order: OrderLike, items: ItemLike[]) {
  return {
    subject: `[SNAPFIT] Pembayaran pesanan ${order.midtransOrderId} berhasil ✓`,
    html: shell({
      step: 1,
      preheader: `Pembayaran ${formatRupiah(order.total)} diterima. Pesananmu segera kami siapkan.`,
      greeting: `Pembayaran diterima, terima kasih ${firstName(order)}!`,
      intro: `Pesananmu segera kami siapkan. Kami kabari lagi saat paket dikemas dan dikirim.`,
      body:
        highlight("Nomor pesanan", order.midtransOrderId ?? "-", "Simpan nomor ini untuk menanyakan status pesanan.") +
        button("Lihat Pesanan", orderUrl(order)) +
        details(order, items, { withTotals: true }),
    }),
  };
}

export function orderProcessingEmail(order: OrderLike, items: ItemLike[]) {
  return {
    subject: `[SNAPFIT] Pesanan ${order.midtransOrderId} sedang dikemas 📦`,
    html: shell({
      step: 2,
      preheader: "Pesananmu sedang kami siapkan & kemas.",
      greeting: `Pesananmu sedang dikemas, ${firstName(order)}`,
      intro: `Tim kami sedang menyiapkan dan mengemas pesananmu dengan rapi. Kami kabari lagi begitu paket dikirim, lengkap dengan nomor resinya.`,
      body: button("Lacak Pesanan", trackUrl(order)) + details(order, items),
    }),
  };
}

export function orderShippedEmail(order: OrderLike, items: ItemLike[]) {
  const courier = order.courier && order.courier !== "flat" ? order.courier.split(":")[0].toUpperCase() : "";
  return {
    subject: `[SNAPFIT] Pesanan ${order.midtransOrderId} sudah dikirim 🚚`,
    html: shell({
      step: 3,
      preheader: `Paketmu dalam perjalanan${order.trackingNo ? ` · Resi ${order.trackingNo}` : ""}.`,
      greeting: `Paketmu dalam perjalanan, ${firstName(order)}!`,
      intro: `Pesananmu sudah kami kirim dan sedang menuju alamatmu.`,
      body:
        highlight(
          courier ? `Nomor resi ${courier}` : "Nomor resi",
          order.trackingNo ?? "-",
          "Gunakan nomor ini untuk melacak paket di aplikasi/situs kurir.",
        ) +
        button("Lacak Paket", trackUrl(order)) +
        details(order, items),
    }),
  };
}

/**
 * Keranjang ditinggal: checkout belum diselesaikan. Tombol memulihkan isi
 * keranjang lewat token (tanpa data pribadi di URL).
 */
export function abandonedCartEmail(opts: {
  name?: string | null;
  items: { name: string; price: number; image: string; qty: number }[];
  restoreUrl: string;
  optOutUrl: string;
}) {
  const first = (opts.name ?? "").trim().split(/\s+/)[0] || "Kak";
  const total = opts.items.reduce((n, i) => n + i.price * i.qty, 0);
  const shown = opts.items.slice(0, 5);
  const more = opts.items.length > 5 ? `<div style="font-size:13px;color:${C.muted};padding-top:12px">+${opts.items.length - 5} produk lainnya</div>` : "";
  return {
    subject: `${first}, keranjangmu masih menunggu 🛒`,
    html: shell({
      preheader: `Produk pilihanmu masih tersedia — lanjutkan checkout sebelum stoknya habis.`,
      greeting: `Keranjangmu masih menunggu, ${first}`,
      intro: `Checkout-mu belum selesai. Kabar baik: <strong style="color:${C.ink}">produk pilihanmu masih tersedia</strong> dan keranjangmu sudah kami simpan.`,
      body:
        block(`${sectionTitle("Isi keranjangmu")}
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${itemList(shown)}</table>${more}
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:16px;border-top:1px solid ${C.line};padding-top:10px">
            ${row("Subtotal", formatRupiah(total), { accent: true })}
          </table>`, 28) +
        button("Lanjutkan Belanja", opts.restoreUrl) +
        note("Ragu soal tipe HP atau stok? Balas email ini, kami bantu cek. 😊") +
        block(`<div style="font-size:11px;color:${C.muted}">Tidak ingin menerima pengingat seperti ini? <a href="${esc(opts.optOutUrl)}" style="color:${C.muted}">Berhenti</a></div>`, 20),
    }),
  };
}

/**
 * Ajakan ulas ~7 hari setelah dikirim. `productLinks` = daftar {name, url}
 * halaman produk yang dibeli (opsional) agar pembeli mudah memberi ulasan.
 */
export function reviewRequestEmail(
  order: OrderLike,
  productLinks: { name: string; url: string; image?: string | null }[] = [],
) {
  const links = productLinks.length
    ? block(`${sectionTitle("Produk yang kamu beli")}
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        ${productLinks
          .map(
            (p, i) => `<tr>
              <td width="56" style="padding:${i ? 12 : 0}px 0 0;vertical-align:middle">${
                p.image
                  ? `<img src="${esc(p.image)}" width="56" height="56" alt="" style="display:block;width:56px;height:56px;border-radius:12px;background:${C.soft};object-fit:contain;border:0"/>`
                  : `<div style="width:56px;height:56px;border-radius:12px;background:${C.soft}"></div>`
              }</td>
              <td style="padding:${i ? 12 : 0}px 12px 0 14px;vertical-align:middle;font-size:14px;line-height:1.4;font-weight:600;color:${C.ink}">${esc(p.name)}</td>
              <td align="right" style="padding:${i ? 12 : 0}px 0 0;vertical-align:middle;white-space:nowrap">
                <a href="${esc(p.url)}" style="display:inline-block;border:1px solid ${C.ink};color:${C.ink};text-decoration:none;font-size:13px;font-weight:700;padding:8px 14px;border-radius:999px">Ulas</a>
              </td>
            </tr>`,
          )
          .join("")}
        </table>`, 28)
    : "";
  return {
    subject: `Bagaimana pesananmu, ${firstName(order)}? ⭐`,
    html: shell({
      preheader: "Ceritakan pengalamanmu — ulasanmu sangat membantu pembeli lain.",
      greeting: `Bagaimana pesananmu, ${firstName(order)}?`,
      intro: `Semoga pesanan <strong style="color:${C.ink}">${esc(order.midtransOrderId ?? "")}</strong> sudah sampai dengan selamat. Ulasan jujurmu sangat membantu pembeli lain — dan kami. 🙏`,
      body:
        block(`<div style="font-size:30px;letter-spacing:6px;color:${C.brand}">★★★★★</div>`, 20) +
        links +
        (productLinks[0] ? button("Tulis Ulasan", productLinks[0].url) : ""),
    }),
  };
}

/** Pengingat koin member segera hangus (cron koin). */
export function coinExpiryEmail(opts: { amount: number; expiresAt: Date; balance: number; rules: { maxUsePercent: number; minUse: number } }) {
  const n = (x: number) => x.toLocaleString("id-ID");
  const date = fmtDate(opts.expiresAt);
  return {
    subject: `${n(opts.amount)} koin SNAPFIT-mu hangus ${date} ⏳`,
    html: shell({
      preheader: `Pakai koinmu sebelum ${date} — 1 koin = Rp1 potongan belanja.`,
      greeting: `${n(opts.amount)} koinmu segera hangus`,
      intro: `Koin di akun SNAPFIT-mu akan hangus pada <strong style="color:${C.ink}">${esc(date)}</strong>. Pakai di checkout untuk potongan belanja — 1 koin = Rp1.`,
      body:
        highlight(
          "Saldo koin sekarang",
          n(opts.balance),
          `Bisa dipakai hingga ${opts.rules.maxUsePercent}% subtotal${opts.rules.minUse ? `, mulai ${n(opts.rules.minUse)} koin` : ""}.`,
        ) +
        button("Belanja Pakai Koin", `${SITE}/produk`) +
        note(`Riwayat koin ada di <a href="${SITE}/akun/koin" style="color:${C.ink};font-weight:600">Akun → Koin SNAPFIT</a>.`),
    }),
  };
}
