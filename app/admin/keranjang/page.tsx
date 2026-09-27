import { MessageCircle, Mail, RotateCcw, CheckCircle2 } from "lucide-react";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/format";
import { waLink } from "@/lib/wa";
import { restoreUrl, type DraftLine } from "@/lib/cart-draft";

export const dynamic = "force-dynamic";

const DAYS = 14;

// Checkout yang belum jadi pesanan (14 hari terakhir) — email pengingat
// otomatis (cron 20:00 WIB); di sini admin bisa follow-up via WhatsApp.
export default async function AdminKeranjangPage() {
  const since = new Date(Date.now() - DAYS * 86_400_000);
  const month = { createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) } };
  const [drafts, total30, converted30, recovered30] = await Promise.all([
    db.checkoutDraft.findMany({
      where: { convertedAt: null, updatedAt: { gte: since } },
      orderBy: { updatedAt: "desc" },
      take: 200,
    }),
    db.checkoutDraft.count({ where: month }),
    db.checkoutDraft.count({ where: { ...month, convertedAt: { not: null } } }),
    db.checkoutDraft.count({ where: { ...month, convertedAt: { not: null }, recoveredAt: { not: null } } }),
  ]);

  const variantIds = [...new Set(drafts.flatMap((d) => ((d.items as DraftLine[]) ?? []).map((l) => l.variantId)))];
  const variants = await db.variant.findMany({
    where: { id: { in: variantIds } },
    select: { id: true, name: true, product: { select: { name: true } } },
  });
  const label = new Map(variants.map((v) => [v.id, `${v.product.name} — ${v.name}`]));

  return (
    <div>
      <h1 className="text-xl font-semibold">Keranjang Ditinggal</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Pembeli yang sudah mengisi kontak di checkout tapi belum memesan ({DAYS} hari terakhir). Yang punya email
        otomatis dikirimi pengingat sekali (±1 jam–3 hari setelahnya, pukul 20:00 WIB). Follow-up via WhatsApp dari sini.
      </p>

      <div className="mt-5 grid grid-cols-3 gap-3 sm:max-w-lg">
        <Stat label="Checkout (30 hari)" value={total30} />
        <Stat label="Jadi pesanan" value={converted30} />
        <Stat label="Lewat pengingat" value={recovered30} />
      </div>

      {drafts.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">Belum ada keranjang ditinggal.</p>
      ) : (
        <ul className="mt-6 divide-y divide-border rounded-xl border border-border">
          {drafts.map((d) => {
            const lines = (d.items as DraftLine[]) ?? [];
            const names = lines.map((l) => `${label.get(l.variantId) ?? "Produk"}${l.qty > 1 ? ` ×${l.qty}` : ""}`);
            const first = (d.name ?? "").trim().split(/\s+/)[0];
            const wa = waLink(
              d.phone,
              `Halo${first ? ` Kak ${first}` : ""}, ini SNAPFIT 👋 Kami lihat checkout kamu belum selesai:\n${names.map((n) => `• ${n}`).join("\n")}\n\nAda yang bisa kami bantu (stok/tipe HP/ongkir)? Lanjutkan pesananmu di sini:\n${restoreUrl(d.token)}`,
            );
            return (
              <li key={d.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium">
                    {d.name || "Tanpa nama"} <span className="font-normal text-muted-foreground">· {formatRupiah(d.subtotal)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[d.phone && `+${d.phone}`, d.email].filter(Boolean).join(" · ")} ·{" "}
                    {d.updatedAt.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm">{names.join(", ")}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {d.remindedAt && <Badge icon={<Mail className="size-3" />} text="Email terkirim" />}
                    {d.recoveredAt && <Badge icon={<RotateCcw className="size-3" />} text="Tautan dibuka" />}
                  </div>
                </div>
                {wa && (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[#1a7f4b] px-3 py-2 text-sm font-medium text-white hover:bg-[#166b3f]"
                  >
                    <MessageCircle className="size-4" /> Chat WhatsApp
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <CheckCircle2 className="size-3.5" /> Otomatis hilang dari daftar begitu kontak yang sama membuat pesanan.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function Badge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-foreground/80">
      {icon} {text}
    </span>
  );
}
