"use client";

import { useEffect, useRef } from "react";
import { useEnquiry, type EnquiryItem } from "@/components/public/enquiry-selection";
import { formatDesignLabel } from "@/lib/design-number";
import { CheckIcon, PlusIcon, WhatsAppIcon, XIcon } from "@/components/icons";

export function DesignLightbox({
  designs,
  index,
  onClose,
  onIndexChange,
}: {
  designs: EnquiryItem[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}) {
  const startX = useRef<number | null>(null);
  const current = designs[index];
  const { has, toggle } = useEnquiry();

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") {
        onIndexChange((index + 1) % designs.length);
      }
      if (event.key === "ArrowLeft") {
        onIndexChange((index - 1 + designs.length) % designs.length);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [designs.length, index, onClose, onIndexChange]);

  if (!current) return null;

  const label = formatDesignLabel(current.designNumber);
  const selected = has(current.id);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(12,9,6,.93)] p-5"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onTouchStart={(event) => {
        startX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        if (startX.current === null) return;
        const delta = (event.changedTouches[0]?.clientX ?? 0) - startX.current;
        if (Math.abs(delta) > 50) {
          onIndexChange(
            (index + (delta < 0 ? 1 : -1) + designs.length) % designs.length
          );
        }
        startX.current = null;
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-3.5 top-3.5 grid h-11 w-11 place-items-center rounded-full border border-white/30 bg-white/10 text-cream-50 hover:bg-white/20"
      >
        <XIcon />
      </button>
      {designs.length > 1 ? (
        <>
          <button
            type="button"
            aria-label="Previous design"
            onClick={(event) => {
              event.stopPropagation();
              onIndexChange((index - 1 + designs.length) % designs.length);
            }}
            className="absolute left-3.5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-white/10 text-2xl text-cream-50 hover:bg-white/20"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next design"
            onClick={(event) => {
              event.stopPropagation();
              onIndexChange((index + 1) % designs.length);
            }}
            className="absolute right-3.5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-white/10 text-2xl text-cream-50 hover:bg-white/20"
          >
            ›
          </button>
        </>
      ) : null}

      <figure className="m-0 w-full max-w-[min(88vw,720px)] text-center">
        {current.imageSrc ? (
          <img
            src={current.imageSrc}
            alt={label}
            className="w-full rounded-xl bg-black"
          />
        ) : null}
        <figcaption className="mt-3.5 font-display text-[15px] tracking-[0.2em] text-cream-50">
          {label}
        </figcaption>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => toggle(current)}
            className="btn btn-outline !border-white/30 !text-cream-50 hover:!border-gold-400"
          >
            {selected ? (
              <CheckIcon className="h-4 w-4" />
            ) : (
              <PlusIcon className="h-4 w-4" />
            )}
            {selected ? "Added to enquiry" : "Add to enquiry"}
          </button>
          <a
            href={`/product/${current.slug}`}
            className="btn btn-whatsapp"
          >
            <WhatsAppIcon className="h-4 w-4" />
            View details
          </a>
        </div>
      </figure>
    </div>
  );
}
