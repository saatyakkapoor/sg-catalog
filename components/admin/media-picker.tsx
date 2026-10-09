"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Image from "next/image";
import {
  listMediaAction,
  type UploadedMedia,
} from "@/app/admin/_actions/media";
import { formatBytes, mediaSrc } from "@/lib/media";
import { ImageIcon, XIcon } from "@/components/icons";

const PAGE_SIZE = 24;

/** Dialog for reusing images that are already in the media library. */
export function MediaPicker({
  open,
  kind = "product",
  multiple = false,
  excludeIds = [],
  onClose,
  onSelect,
}: {
  open: boolean;
  kind?: "product" | "logo";
  multiple?: boolean;
  excludeIds?: string[];
  onClose: () => void;
  onSelect: (media: UploadedMedia[]) => void;
}) {
  const [items, setItems] = useState<UploadedMedia[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, UploadedMedia>>({});
  const [isPending, startTransition] = useTransition();

  const load = useCallback(
    (skip: number) => {
      startTransition(async () => {
        const result = await listMediaAction({ kind, skip, take: PAGE_SIZE });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setError(null);
        setTotal(result.data?.total ?? 0);
        setItems((previous) =>
          skip === 0
            ? (result.data?.items ?? [])
            : [...previous, ...(result.data?.items ?? [])]
        );
      });
    },
    [kind]
  );

  useEffect(() => {
    if (!open) return;
    setSelected({});
    setItems([]);
    load(0);
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const available = items.filter((item) => !excludeIds.includes(item.id));
  const selectedList = Object.values(selected);

  const toggle = (media: UploadedMedia) => {
    if (!multiple) {
      onSelect([media]);
      onClose();
      return;
    }
    setSelected((previous) => {
      const next = { ...previous };
      if (next[media.id]) delete next[media.id];
      else next[media.id] = media;
      return next;
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-2 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Media library"
    >
      <button
        type="button"
        aria-label="Close media library"
        className="absolute inset-0 bg-ink-900/50"
        onClick={onClose}
      />
      <div className="relative flex max-h-[88vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-cream-200 px-5 py-4">
          <div>
            <h2 className="text-lg text-ink-900">Media library</h2>
            <p className="text-xs text-ink-400">
              {total} image{total === 1 ? "" : "s"} available to reuse
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close media library"
            className="rounded-lg p-1.5 text-ink-400 hover:bg-cream-200"
          >
            <XIcon />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {error ? (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {!error && available.length === 0 && !isPending ? (
            <div className="py-12 text-center">
              <ImageIcon className="mx-auto h-8 w-8 text-ink-400" />
              <p className="mt-3 text-sm text-ink-500">
                Nothing here yet. Upload an image and it will appear in the
                library for reuse.
              </p>
            </div>
          ) : null}

          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {available.map((media) => {
              const src = mediaSrc(media, "thumb");
              const isSelected = Boolean(selected[media.id]);
              return (
                <li key={media.id}>
                  <button
                    type="button"
                    onClick={() => toggle(media)}
                    aria-pressed={multiple ? isSelected : undefined}
                    className={`group block w-full overflow-hidden rounded-lg border-2 text-left transition-colors ${
                      isSelected ? "border-gold-500" : "border-transparent hover:border-cream-300"
                    }`}
                  >
                    <span className="relative block aspect-square bg-cream-200">
                      {src ? (
                        <Image
                          src={src}
                          alt={media.alt ?? media.originalName}
                          fill
                          sizes="160px"
                          className="object-cover"
                        />
                      ) : null}
                    </span>
                    <span className="block truncate px-1.5 pt-1 text-[11px] text-ink-500">
                      {media.originalName}
                    </span>
                    <span className="block px-1.5 pb-1.5 text-[10px] text-ink-400">
                      {media.width}×{media.height} · {formatBytes(media.bytes)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {available.length < total ? (
            <div className="mt-4 text-center">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => load(items.length)}
                disabled={isPending}
              >
                {isPending ? "Loading…" : "Load more"}
              </button>
            </div>
          ) : null}
        </div>

        {multiple ? (
          <div className="flex items-center justify-between gap-3 border-t border-cream-200 px-5 py-4">
            <p className="text-sm text-ink-500">
              {selectedList.length} selected
            </p>
            <div className="flex gap-2">
              <button type="button" className="btn btn-outline" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={selectedList.length === 0}
                onClick={() => {
                  onSelect(selectedList);
                  onClose();
                }}
              >
                Add selected
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
