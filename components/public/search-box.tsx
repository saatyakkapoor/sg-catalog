"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon, XIcon } from "@/components/icons";

/**
 * Catalog search. Submits on enter (works without JavaScript too, via the form
 * action) and keeps the visible value in sync with the URL.
 */
export function SearchBox({
  defaultValue = "",
  placeholder = "Search SD number",
  autoFocus = false,
  className = "",
}: {
  defaultValue?: string;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  return (
    <form
      action="/catalog"
      method="get"
      role="search"
      className={`relative ${className}`}
      onSubmit={(event) => {
        event.preventDefault();
        const term = value.trim();
        router.push(term ? `/catalog?q=${encodeURIComponent(term)}` : "/catalog");
      }}
    >
      <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-400" />
      <input
        type="search"
        name="q"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label="Search the catalog"
        autoFocus={autoFocus}
        enterKeyHint="search"
        className="field-input !h-12 !rounded-full !pl-11 !pr-24"
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            setValue("");
            router.push("/catalog");
          }}
          aria-label="Clear search"
          className="absolute right-[5.25rem] top-1/2 -translate-y-1/2 rounded-full p-1.5 text-ink-400 hover:bg-cream-200"
        >
          <XIcon className="h-4 w-4" />
        </button>
      ) : null}
      <button
        type="submit"
        className="btn btn-primary absolute right-1 top-1/2 !min-h-0 -translate-y-1/2 !px-4 !py-2.5 text-sm"
      >
        Search
      </button>
    </form>
  );
}
