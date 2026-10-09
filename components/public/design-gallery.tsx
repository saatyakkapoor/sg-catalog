"use client";

import { useEffect, useMemo, useState } from "react";
import { useEnquiry, type EnquiryItem } from "@/components/public/enquiry-selection";
import { DesignLightbox } from "@/components/public/design-lightbox";
import {
  buildDesignRanges,
  designNumberValue,
  formatDesignLabel,
} from "@/lib/design-number";
import { CheckIcon, PlusIcon, SearchIcon, XIcon } from "@/components/icons";

export type GalleryDesign = EnquiryItem & {
  imageSrc: string | null;
};

export function DesignGallery({
  designs,
  title = "All Designs",
  showBar = true,
}: {
  designs: GalleryDesign[];
  title?: string;
  showBar?: boolean;
}) {
  const { has, toggle } = useEnquiry();
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<{ min: number; max: number } | null>(null);

  useEffect(() => {
    const term = new URLSearchParams(window.location.search).get("q")?.trim();
    if (term) setQuery(term);
  }, []);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const ranges = useMemo(
    () => buildDesignRanges(designs.map((design) => design.designNumber)),
    [designs]
  );

  const visible = useMemo(() => {
    const digits = query.replace(/\D/g, "");
    return designs.filter((design) => {
      const value = designNumberValue(design.designNumber);
      if (range && (value === null || value < range.min || value > range.max)) {
        return false;
      }
      if (!digits) return true;
      return design.designNumber.replace(/\D/g, "").includes(digits);
    });
  }, [designs, query, range]);

  const heading = range
    ? `SD ${range.min} – SD ${range.max}`
    : query
      ? `Results for “${query}”`
      : title;

  return (
    <div id="designs">
      {showBar ? (
        <div className="sticky top-16 z-30 border-b border-line bg-bg/88 backdrop-blur-md sm:top-[72px]">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-5 py-3">
            <label className="relative min-w-[150px] flex-1 sm:max-w-[240px]">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
              <input
                type="search"
                inputMode="numeric"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Type an SD number"
                aria-label="Search by design number"
                className="field-input !h-10 !rounded-full !border-line !bg-panel !pl-8 !pr-9 !text-[13px]"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-400 hover:text-ink-800"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </label>

            <div className="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto">
              <button
                type="button"
                onClick={() => setRange(null)}
                className={`chip ${range === null ? "chip-on" : ""}`}
              >
                All
              </button>
              {ranges.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setRange({ min: item.min, max: item.max })}
                  className={`chip ${
                    range && range.min === item.min && range.max === item.max
                      ? "chip-on"
                      : ""
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-[1400px] px-5 py-11">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="font-display text-[clamp(22px,3vw,34px)] font-normal tracking-tight text-ink-800">
            {heading}
          </h2>
          <p className="text-[13.5px] text-ink-400">
            {visible.length} design{visible.length === 1 ? "" : "s"}
          </p>
        </div>
        <p className="mb-6 text-sm text-ink-400">
          Tap a design to zoom. Tap + to add it to your WhatsApp enquiry.
        </p>

        {visible.length === 0 ? (
          <div className="rounded-card border border-dashed border-line px-6 py-16 text-center">
            <p className="font-display text-xl text-ink-800">
              {designs.length === 0
                ? "Catalogue is being updated"
                : "No design found with that number"}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-400">
              {designs.length === 0
                ? "New designs coming soon. Message us on WhatsApp and we will share the latest collection."
                : "Check the SD number, or clear the filters and browse everything."}
            </p>
            {query || range ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setRange(null);
                }}
                className="btn btn-outline mt-5"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-[11px] sm:grid-cols-[repeat(auto-fill,minmax(210px,1fr))] sm:gap-[18px]">
            {visible.map((design, index) => {
              const selected = has(design.id);
              const label = formatDesignLabel(design.designNumber);
              return (
                <li key={design.id}>
                  <article
                    className={`group relative overflow-hidden rounded-xl bg-panel shadow-[0_2px_10px_-6px_var(--sg-shadow)] transition-[transform,box-shadow,outline-color] duration-200 hover:-translate-y-1 hover:shadow-[0_18px_34px_-18px_var(--sg-shadow)] ${
                      selected ? "outline outline-2 outline-gold-500" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenIndex(index)}
                      className="block w-full cursor-zoom-in"
                      aria-label={`View ${label}`}
                    >
                      <span className="relative block aspect-square overflow-hidden bg-cream-200">
                        {design.imageSrc ? (
                          <img
                            src={design.imageSrc}
                            alt={label}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <span className="absolute inset-0 grid place-items-center text-xs text-ink-400">
                            Image coming soon
                          </span>
                        )}
                      </span>
                    </button>

                    <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-panel/92 px-2.5 py-1.5 text-[11.5px] font-semibold tracking-wide text-ink-800 shadow-[0_2px_8px_rgba(0,0,0,.18)]">
                      {label}
                    </span>

                    <button
                      type="button"
                      onClick={() => toggle(design)}
                      aria-pressed={selected}
                      aria-label={
                        selected
                          ? `Remove ${label} from enquiry`
                          : `Add ${label} to enquiry`
                      }
                      className={`absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full text-sm font-semibold shadow-md transition-colors ${
                        selected
                          ? "bg-gold-500 text-white"
                          : "bg-panel/94 text-ink-800 hover:bg-elevated"
                      }`}
                    >
                      {selected ? (
                        <CheckIcon className="h-4 w-4" />
                      ) : (
                        <PlusIcon className="h-4 w-4" />
                      )}
                    </button>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {openIndex !== null && visible[openIndex] ? (
        <DesignLightbox
          designs={visible}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onIndexChange={setOpenIndex}
        />
      ) : null}
    </div>
  );
}
