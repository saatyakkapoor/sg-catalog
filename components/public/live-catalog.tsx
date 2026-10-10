"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DesignGallery, type GalleryDesign } from "@/components/public/design-gallery";
import { mediaSrc } from "@/lib/media";
import {
  getSettings,
  listCategories,
  subscribeProducts,
  type RemoteCategory,
  type RemoteProduct,
  type RemoteSettings,
} from "@/lib/remote-db";
import { childrenOf, roots } from "@/lib/catalog-tree";

function toDesigns(products: RemoteProduct[]): GalleryDesign[] {
  return products.map((product) => ({
    id: product.id,
    designNumber: product.designNumber,
    name: product.name || product.designNumber,
    imageSrc: product.coverUrl || mediaSrc(product.images[0], "card"),
    slug: product.slug,
  }));
}

export function LiveHome({ fallback }: { fallback: GalleryDesign[] }) {
  const [designs, setDesigns] = useState(fallback);
  const [settings, setSettings] = useState<RemoteSettings | null>(null);
  const [categories, setCategories] = useState<RemoteCategory[]>([]);

  useEffect(() => {
    getSettings().then(setSettings).catch(() => undefined);
    listCategories(true).then(setCategories).catch(() => undefined);
    const bySlug = new Map(fallback.map((item) => [item.slug, item.imageSrc]));
    return subscribeProducts(undefined, (products) => {
      setDesigns(
        toDesigns(products).map((item) => ({
          ...item,
          imageSrc: item.imageSrc || bySlug.get(item.slug) || null,
        }))
      );
    });
  }, [fallback]);

  const top = roots(categories).filter((item) => item.isPublished);

  return (
    <main>
      <section className="border-b border-line bg-panel">
        <div className="mx-auto max-w-[1400px] px-5 py-12 sm:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-600">
            {settings?.tagline || settings?.businessName || "Product catalogue"}
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-[clamp(2rem,5vw,3.5rem)] text-ink-900">
            {settings?.homepageHeading || settings?.businessName || "Browse designs"}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-500 sm:text-base">
            {settings?.homepageIntro ||
              settings?.siteDescription ||
              "Search by design number, open a collection, and enquire on WhatsApp."}
          </p>
          {top.length > 0 ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {top.map((item) => (
                <Link key={item.id} href={`/category/${item.slug}/`} className="chip">
                  {item.name}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>
      <DesignGallery designs={designs} title="All designs" />
    </main>
  );
}

export function LiveGallery({
  fallback,
  title,
  categorySlug,
  showBar,
}: {
  fallback: GalleryDesign[];
  title?: string;
  categorySlug?: string;
  showBar?: boolean;
}) {
  const [designs, setDesigns] = useState(fallback);
  const [categories, setCategories] = useState<RemoteCategory[]>([]);

  useEffect(() => {
    listCategories(true).then(setCategories).catch(() => undefined);
    const bySlug = new Map(fallback.map((item) => [item.slug, item.imageSrc]));
    return subscribeProducts({ categorySlug }, (products) => {
      setDesigns(
        toDesigns(products).map((item) => ({
          ...item,
          imageSrc: item.imageSrc || bySlug.get(item.slug) || null,
        }))
      );
    });
  }, [categorySlug, fallback]);

  const current = categories.find((item) => item.slug === categorySlug);
  const nested = useMemo(
    () => (current ? childrenOf(current.id, categories).filter((item) => item.isPublished) : []),
    [categories, current]
  );

  return (
    <div>
      {nested.length > 0 ? (
        <div className="mx-auto max-w-[1400px] px-5 pt-6">
          <div className="flex flex-wrap gap-2">
            {nested.map((item) => (
              <Link key={item.id} href={`/category/${item.slug}/`} className="chip">
                {item.kind === "category" ? item.name : `${item.name}`}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
      <DesignGallery designs={designs} title={title} showBar={showBar} />
    </div>
  );
}
