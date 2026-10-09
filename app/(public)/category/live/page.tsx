"use client";

import { useEffect, useState } from "react";
import { LiveGallery } from "@/components/public/live-catalog";
import { listCategories, type RemoteCategory } from "@/lib/remote-db";

export default function LiveCategoryPage() {
  const [category, setCategory] = useState<RemoteCategory | null | undefined>(undefined);

  useEffect(() => {
    const slug = window.location.pathname.replace(/\/+$/, "").split("/").pop() ?? "";
    listCategories(true)
      .then((categories) => setCategory(categories.find((item) => item.slug === slug) ?? null))
      .catch(() => setCategory(null));
  }, []);

  if (category === undefined) return <p className="container-page py-16 text-sm text-ink-500">Loading collection…</p>;
  if (!category) return <p className="container-page py-16">Collection not found.</p>;

  return (
    <main className="container-page py-10">
      <h1 className="text-3xl text-ink-900">{category.name}</h1>
      {category.description ? <p className="mt-2 text-sm text-ink-500">{category.description}</p> : null}
      <div className="mt-8">
        <LiveGallery fallback={[]} title={category.name} categorySlug={category.slug} />
      </div>
    </main>
  );
}
