import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

/**
 * Page links that preserve every other query parameter, so filters survive
 * paging. Rendered on the server — no JavaScript needed to page through.
 */
export function Pagination({
  page,
  totalPages,
  basePath,
  params = {},
}: {
  page: number;
  totalPages: number;
  basePath: string;
  params?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  const href = (target: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }
    if (target > 1) search.set("page", String(target));
    const query = search.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  // Show a compact window around the current page for large catalogs.
  const windowSize = 2;
  const pages: number[] = [];
  for (
    let candidate = Math.max(1, page - windowSize);
    candidate <= Math.min(totalPages, page + windowSize);
    candidate += 1
  ) {
    pages.push(candidate);
  }

  return (
    <nav
      className="mt-8 flex flex-wrap items-center justify-center gap-1.5"
      aria-label="Pagination"
    >
      {page > 1 ? (
        <Link href={href(page - 1)} className="btn btn-outline !px-3" aria-label="Previous page">
          <ChevronLeftIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Previous</span>
        </Link>
      ) : null}

      {pages[0] !== 1 ? (
        <>
          <Link href={href(1)} className="btn btn-outline !min-w-11 !px-3">
            1
          </Link>
          {pages[0] > 2 ? <span className="px-1 text-ink-400">…</span> : null}
        </>
      ) : null}

      {pages.map((candidate) => (
        <Link
          key={candidate}
          href={href(candidate)}
          aria-current={candidate === page ? "page" : undefined}
          className={`btn !min-w-11 !px-3 ${
            candidate === page ? "btn-primary" : "btn-outline"
          }`}
        >
          {candidate}
        </Link>
      ))}

      {pages[pages.length - 1] !== totalPages ? (
        <>
          {pages[pages.length - 1] < totalPages - 1 ? (
            <span className="px-1 text-ink-400">…</span>
          ) : null}
          <Link href={href(totalPages)} className="btn btn-outline !min-w-11 !px-3">
            {totalPages}
          </Link>
        </>
      ) : null}

      {page < totalPages ? (
        <Link href={href(page + 1)} className="btn btn-outline !px-3" aria-label="Next page">
          <span className="hidden sm:inline">Next</span>
          <ChevronRightIcon className="h-4 w-4" />
        </Link>
      ) : null}
    </nav>
  );
}
