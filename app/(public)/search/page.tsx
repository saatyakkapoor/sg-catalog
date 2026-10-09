"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * `/search?q=…` is a convenience entry point. Results live at `/catalog` so
 * there is a single canonical URL for any given search.
 */
export default function SearchRedirect() {
  const router = useRouter();

  useEffect(() => {
    const term = new URLSearchParams(window.location.search).get("q")?.trim();
    router.replace(term ? `/catalog?q=${encodeURIComponent(term)}` : "/catalog");
  }, [router]);

  return null;
}
