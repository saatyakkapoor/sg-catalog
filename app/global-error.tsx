"use client";

import { useEffect } from "react";
import "./globals.css";

/** Last-resort boundary; replaces the whole document, so it renders html/body. */
export default function GlobalError({
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
    <html lang="en">
      <body>
        <main className="container-page py-24 text-center">
          <h1 className="text-2xl text-ink-900">Something went wrong</h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-ink-500">
            Please reload the page. If this keeps happening, try again shortly.
          </p>
          <button type="button" onClick={reset} className="btn btn-primary mt-7">
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
