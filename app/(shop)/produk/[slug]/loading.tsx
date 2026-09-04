export default function LoadingProduct() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse px-4 py-8 sm:px-6 sm:py-12">
      <div className="grid gap-8 md:grid-cols-2 md:gap-12">
        <div className="aspect-square w-full rounded-xl bg-muted" />
        <div className="space-y-4">
          <div className="h-4 w-20 rounded bg-muted" />
          <div className="h-8 w-3/4 rounded bg-muted" />
          <div className="h-7 w-32 rounded bg-muted" />
          <div className="h-16 w-full rounded bg-muted" />
          <div className="flex gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 w-24 rounded-md bg-muted" />
            ))}
          </div>
          <div className="h-12 w-full rounded-md bg-muted" />
        </div>
      </div>
    </div>
  );
}
