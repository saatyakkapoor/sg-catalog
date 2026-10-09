/** Skeleton shown while catalog data loads, so the layout never jumps. */
export default function CatalogLoading() {
  return (
    <main className="container-page py-8 sm:py-12" aria-busy="true">
      <span className="sr-only">Loading designs…</span>
      <div className="h-8 w-52 animate-pulse rounded-lg bg-cream-200" />
      <div className="mt-3 h-4 w-72 animate-pulse rounded bg-cream-200" />
      <div className="mt-5 h-12 max-w-xl animate-pulse rounded-full bg-cream-200" />
      <div className="mt-6 flex gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-10 w-28 animate-pulse rounded-full bg-cream-200"
          />
        ))}
      </div>
      <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <li key={index} className="overflow-hidden rounded-card border border-line bg-elevated">
            <div className="aspect-[4/5] animate-pulse bg-cream-200" />
            <div className="space-y-2 p-4">
              <div className="h-3 w-20 animate-pulse rounded bg-cream-200" />
              <div className="h-4 w-full animate-pulse rounded bg-cream-200" />
              <div className="h-10 w-full animate-pulse rounded-full bg-cream-200" />
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
