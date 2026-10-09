"use client";

import { useEffect, useState } from "react";
import { DesignGallery, type GalleryDesign } from "@/components/public/design-gallery";
import { ScatterHero } from "@/components/public/scatter-hero";
import { mediaSrc } from "@/lib/media";
import { subscribeProducts, type RemoteProduct } from "@/lib/remote-db";

function toDesigns(products: RemoteProduct[]): GalleryDesign[] {
  return products.map((product) => ({
    id: product.id,
    designNumber: product.designNumber,
    name: product.name,
    imageSrc: product.coverUrl || mediaSrc(product.images[0], "card"),
    slug: product.slug,
  }));
}

export function LiveHome({ fallback }: { fallback: GalleryDesign[] }) {
  const [designs, setDesigns] = useState(fallback);

  useEffect(() => {
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

  const heroCards = designs
    .filter((design) => design.imageSrc)
    .slice(0, 8)
    .map((design) => ({ src: design.imageSrc as string, alt: design.name }));

  return (
    <main>
      <ScatterHero cards={heroCards} />
      <DesignGallery designs={designs} />
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

  useEffect(() => {
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

  return <DesignGallery designs={designs} title={title} showBar={showBar} />;
}
