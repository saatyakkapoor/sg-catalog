"use client";

import { useState } from "react";
import Image from "next/image";
import type { MediaLike } from "@/lib/media";
import { mediaAlt, mediaSrc } from "@/lib/media";
import { ImageIcon } from "@/components/icons";

/** Main image plus thumbnails. Every image shown here is watermarked. */
export function ProductGallery({
  images,
  productName,
  designNumber,
}: {
  images: MediaLike[];
  productName: string;
  designNumber: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  if (images.length === 0) {
    return (
      <div className="flex aspect-[4/5] flex-col items-center justify-center gap-2 rounded-card border border-cream-200 bg-cream-200 text-ink-400">
        <ImageIcon className="h-8 w-8" />
        <p className="text-sm">Photo coming soon</p>
      </div>
    );
  }

  const active = images[Math.min(activeIndex, images.length - 1)];
  const activeSrc = mediaSrc(active, "detail");
  const altText = mediaAlt(
    active,
    `${productName} — Design No. ${designNumber}`
  );

  return (
    <div>
      <div className="relative aspect-[4/5] overflow-hidden rounded-card border border-cream-200 bg-cream-200">
        {activeSrc && !failed[active.id] ? (
          <Image
            src={activeSrc}
            alt={altText}
            fill
            sizes="(min-width: 1024px) 45vw, 100vw"
            priority
            className="object-cover"
            onError={() => setFailed((prev) => ({ ...prev, [active.id]: true }))}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-ink-400">
            <ImageIcon className="h-8 w-8" />
            <p className="px-4 text-center text-sm">{altText}</p>
          </div>
        )}
      </div>

      {images.length > 1 ? (
        <ul className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6">
          {images.map((media, index) => {
            const thumb = mediaSrc(media, "thumb");
            const isActive = index === activeIndex;
            return (
              <li key={media.id}>
                <button
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-label={`View image ${index + 1} of ${images.length}`}
                  aria-current={isActive ? "true" : undefined}
                  className={`relative block aspect-square w-full overflow-hidden rounded-lg border-2 bg-cream-200 transition-colors ${
                    isActive ? "border-gold-500" : "border-transparent hover:border-cream-300"
                  }`}
                >
                  {thumb ? (
                    <Image
                      src={thumb}
                      alt=""
                      fill
                      sizes="100px"
                      className="object-cover"
                    />
                  ) : (
                    <ImageIcon className="absolute inset-0 m-auto h-4 w-4 text-ink-400" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
