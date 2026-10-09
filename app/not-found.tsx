import Link from "next/link";

export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

/** Fallback for URLs that match no route at all. */
export default function RootNotFound() {
  return (
    <main className="container-page flex min-h-screen flex-col items-center justify-center py-16 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-600">
        Not found
      </p>
      <h1 className="mt-4 text-2xl text-ink-900 sm:text-3xl">
        We could not find that page
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-500">
        The link may be out of date. Head back to the catalog to find the design
        you are looking for.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-2.5">
        <Link href="/catalog" className="btn btn-primary">
          Browse the catalog
        </Link>
        <Link href="/" className="btn btn-outline">
          Go to homepage
        </Link>
      </div>
    </main>
  );
}
