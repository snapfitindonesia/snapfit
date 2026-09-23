import { Star, MessageSquare } from "lucide-react";

export type ReviewItem = {
  id: string;
  author: string;
  image: string | null;
  rating: number;
  comment: string;
  createdAt: string; // ISO
};

function Stars({ value, className = "size-4" }: { value: number; className?: string }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`${className} ${n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
      ))}
    </div>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export function ProductReviews({ reviews = [] }: { reviews?: ReviewItem[] }) {
  const count = reviews.length;
  const avg = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;

  return (
    <section className="mt-16">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 className="text-xl font-semibold tracking-tight">Ulasan Pembeli</h2>
        {count > 0 && (
          <div className="flex items-center gap-2">
            <Stars value={Math.round(avg)} className="size-5" />
            <span className="text-sm font-medium">{avg.toFixed(1)}</span>
            <span className="text-sm text-muted-foreground">({count} ulasan)</span>
          </div>
        )}
      </div>

      {count === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-border py-12 text-center">
          <div className="flex gap-1 text-muted-foreground">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="size-5" />
            ))}
          </div>
          <div className="mt-4 grid size-12 place-items-center rounded-full bg-muted">
            <MessageSquare className="size-6 text-muted-foreground" />
          </div>
          <p className="mt-4 text-sm font-medium">Belum ada ulasan</p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Jadilah yang pertama memberi ulasan setelah membeli produk ini.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="flex gap-4 rounded-2xl border border-border p-4">
              <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-sm font-medium text-muted-foreground">
                {r.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.image} alt={r.author} className="size-full object-cover" />
                ) : (
                  r.author.charAt(0).toUpperCase()
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-medium">{r.author}</span>
                  <Stars value={r.rating} />
                  <span className="text-xs text-muted-foreground">{fmtDate(r.createdAt)}</span>
                </div>
                <p className="mt-1.5 whitespace-pre-line text-sm text-foreground/90">{r.comment}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
