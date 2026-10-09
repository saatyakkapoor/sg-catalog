"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchIcon, XIcon } from "@/components/icons";

export type AdminFilterCategory = { id: string; name: string };

/** Filter bar that keeps its state in the URL so pages stay shareable. */
export function ProductFilters({
  categories,
}: {
  categories: AdminFilterCategory[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  const push = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    // Any filter change returns to the first page of results.
    params.delete("page");
    const search = params.toString();
    router.push(search ? `${pathname}?${search}` : pathname);
  };

  const onQueryChange = (value: string) => {
    setQuery(value);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => push({ q: value.trim() || null }), 300);
  };

  return (
    <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <div className="relative sm:col-span-2 lg:col-span-1">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          className="field-input !pl-9 !pr-9"
          placeholder="Search design no. or name"
          aria-label="Search products"
          type="search"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              push({ q: null });
            }}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-400 hover:bg-cream-200"
          >
            <XIcon className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <select
        className="field-input"
        aria-label="Filter by category"
        value={searchParams.get("category") ?? ""}
        onChange={(event) => push({ category: event.target.value || null })}
      >
        <option value="">All categories</option>
        <option value="none">No category</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>

      <select
        className="field-input"
        aria-label="Filter by visibility"
        value={searchParams.get("status") ?? ""}
        onChange={(event) => push({ status: event.target.value || null })}
      >
        <option value="">Published and hidden</option>
        <option value="published">Published only</option>
        <option value="hidden">Hidden only</option>
      </select>

      <select
        className="field-input"
        aria-label="Sort products"
        value={searchParams.get("sort") ?? "manual"}
        onChange={(event) =>
          push({ sort: event.target.value === "manual" ? null : event.target.value })
        }
      >
        <option value="manual">Manual order (drag to arrange)</option>
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
        <option value="designNumber">Design number</option>
      </select>
    </div>
  );
}
