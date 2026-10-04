import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const fmt = (d: Date) => d.toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

export default async function AdminSubscribersPage() {
  const [rows, total] = await Promise.all([
    db.subscriber.findMany({ orderBy: { createdAt: "desc" }, take: 500 }),
    db.subscriber.count(),
  ]);
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Langganan Email</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total.toLocaleString("id-ID")} pelanggan dari bagian “Langganan email” di beranda. Unduh CSV untuk diimpor ke layanan email (mis. Resend Audiences / Mailchimp).
          </p>
        </div>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- unduhan file (bukan halaman) */}
        <a href="/api/admin/langganan" download className="inline-flex h-[42px] items-center rounded-xl border border-border px-4 text-sm font-medium hover:bg-muted">
          Unduh CSV
        </a>
      </div>
      <div className="mt-6 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Sumber</th>
              <th className="px-3 py-2 font-medium">Tanggal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="p-8 text-center text-muted-foreground">Belum ada pelanggan.</td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.email}>
                <td className="px-3 py-2">{r.email}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.source}</td>
                <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{fmt(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
