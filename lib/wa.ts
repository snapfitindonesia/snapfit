// Bantu buat tautan WhatsApp "click-to-send": admin klik → WhatsApp terbuka
// dengan pesan sudah terisi, tinggal kirim. Tak butuh API/kredensial.
// (Untuk WA otomatis penuh perlu WA Business API — belum dipakai.)

/** Normalkan nomor telepon Indonesia ke format 62 tanpa simbol. */
export function normalizePhoneID(raw: string | undefined | null): string {
  if (!raw) return "";
  let n = raw.replace(/[^0-9]/g, "");
  if (n.startsWith("0")) n = "62" + n.slice(1);
  else if (n.startsWith("620")) n = "62" + n.slice(3);
  else if (!n.startsWith("62")) n = "62" + n;
  return n;
}

/** Bangun URL wa.me dengan pesan ter-encode. Kosong bila nomor tak valid. */
export function waLink(phone: string | undefined | null, message: string): string {
  const n = normalizePhoneID(phone);
  if (n.length < 10) return "";
  return `https://wa.me/${n}?text=${encodeURIComponent(message)}`;
}

type WaOrder = {
  midtransOrderId: string | null;
  id: string;
  trackingNo: string | null;
  address: { name?: string } | null;
};

function ref(o: WaOrder): string {
  return o.midtransOrderId ?? o.id.slice(0, 8);
}
function hi(o: WaOrder): string {
  const name = o.address?.name;
  return name ? `Halo Kak ${name},` : "Halo Kak,";
}

export function waProcessingMessage(o: WaOrder): string {
  return `${hi(o)} pesanan SNAPFIT kamu (${ref(o)}) sedang kami *proses* & kemas. Kami kabari lagi begitu paket dikirim beserta nomor resinya ya. Terima kasih! 🙏`;
}

export function waShippedMessage(o: WaOrder): string {
  return `${hi(o)} pesanan SNAPFIT kamu (${ref(o)}) sudah *dikirim* 📦\nNo. Resi: *${o.trackingNo ?? "-"}*\nTerima kasih sudah belanja di SNAPFIT!`;
}

export function waReviewMessage(o: WaOrder): string {
  return `${hi(o)} semoga pesanan SNAPFIT (${ref(o)}) sudah sampai dengan selamat 😊 Boleh minta tolong ceritakan pengalaman belanjamu & beri ulasan produknya? Masukanmu sangat berarti buat kami. Terima kasih! ⭐`;
}
