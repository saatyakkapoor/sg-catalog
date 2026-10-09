"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Customer-facing error boundary. Deliberately shows no technical detail — the
 * real error is logged to the console/server instead.
 */
export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="container-page py-16 text-center sm:py-24">
      <h1 className="mx-auto max-w-xl text-2xl text-ink-900 sm:text-3xl">
        Something went wrong
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-500">
        We could not load this page just now. Please try again in a moment.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-2.5">
        <button type="button" onClick={reset} className="btn btn-primary">
          Try again
        </button>
        <Link href="/" className="btn btn-outline">
          Go to homepage
        </Link>
      </div>
    </main>
  );
}
