import { Star, MessageSquare } from "lucide-react";

// Struktur ulasan — sengaja TANPA review palsu (menyesatkan pembeli). Empty-state
// jujur; siap diisi saat sistem ulasan asli dibuat.
export function ProductReviews() {
  return (
    <section className="mt-16">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-semibold tracking-tight">Ulasan Pembeli</h2>
      </div>

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
    </section>
  );
}
