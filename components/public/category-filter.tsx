import Link from "next/link";
import type { CatalogCategory } from "@/lib/catalog";

/** Horizontal, scrollable category chips — no JavaScript needed. */
export function CategoryFilter({
  categories,
  activeSlug,
  query,
  sort,
}: {
  categories: CatalogCategory[];
  activeSlug?: string;
  query?: string;
  sort?: string;
}) {
  if (categories.length === 0) return null;

  const hrefFor = (slug?: string) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (sort) params.set("sort", sort);
    const search = params.toString();
    const base = slug ? `/category/${slug}` : "/catalog";
    return search ? `${base}?${search}` : base;
  };

  return (
    <nav aria-label="Filter by category" className="-mx-4 px-4 sm:mx-0 sm:px-0">
      <ul className="flex snap-x gap-2 overflow-x-auto pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <li className="shrink-0 snap-start">
          <Link
            href={hrefFor()}
            aria-current={!activeSlug ? "page" : undefined}
            className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-medium transition-colors ${
              !activeSlug
                ? "border-ink-800 bg-ink-800 text-cream-100"
                : "border-cream-300 bg-elevated text-ink-600 hover:border-gold-400"
            }`}
          >
            All designs
          </Link>
        </li>
        {categories.map((category) => {
          const active = category.slug === activeSlug;
          return (
            <li key={category.id} className="shrink-0 snap-start">
              <Link
                href={hrefFor(category.slug)}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors ${
                  active
                    ? "border-ink-800 bg-ink-800 text-cream-100"
                    : "border-cream-300 bg-elevated text-ink-600 hover:border-gold-400"
                }`}
              >
                {category.name}
                <span
                  className={`text-xs ${active ? "text-cream-300" : "text-ink-400"}`}
                >
                  {category.productCount}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Sort selector rendered as links so it works without JavaScript. */
export function SortLinks({
  basePath,
  query,
  activeSort,
}: {
  basePath: string;
  query?: string;
  activeSort: string;
}) {
  const options = [
    { value: "manual", label: "Featured" },
    { value: "newest", label: "Newest" },
    { value: "designNumber", label: "Design no." },
  ] as const;

  const hrefFor = (value: string) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (value !== "manual") params.set("sort", value);
    const search = params.toString();
    return search ? `${basePath}?${search}` : basePath;
  };

  return (
    <div className="flex items-center gap-1.5">
      <span className="hidden text-xs font-medium text-ink-400 sm:inline">
        Sort
      </span>
      <ul className="flex gap-1 rounded-full bg-cream-200 p-1">
        {options.map((option) => {
          const active = option.value === activeSort;
          return (
            <li key={option.value}>
              <Link
                href={hrefFor(option.value)}
                aria-current={active ? "true" : undefined}
                className={`inline-flex min-h-8 items-center rounded-full px-3 text-xs font-semibold transition-colors ${
                  active ? "bg-elevated text-ink-900 shadow-sm" : "text-ink-500"
                }`}
              >
                {option.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
