"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  deleteMediaAction,
  replaceMediaAction,
  updateMediaAltAction,
  uploadProductImagesAction,
  type UploadedMedia,
} from "@/app/admin/_actions/media";
import { formatBytes, mediaSrc } from "@/lib/media";
import { Badge, ConfirmDialog, StatusMessage } from "@/components/admin/ui";
import {
  ExternalIcon,
  ImageIcon,
  TrashIcon,
  UploadIcon,
  XIcon,
} from "@/components/icons";

export type MediaLibraryItem = UploadedMedia & {
  usageCount: number;
  createdAt: string;
};

export function MediaLibrary({ items }: { items: MediaLibraryItem[] }) {
  const router = useRouter();
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [selected, setSelected] = useState<MediaLibraryItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<MediaLibraryItem | null>(null);
  const [altDraft, setAltDraft] = useState("");
  const [isPending, startTransition] = useTransition();

  const uploadRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);

  const upload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const formData = new FormData();
    for (const file of Array.from(files)) formData.append("files", file);

    startTransition(async () => {
      setStatus({ ok: true, text: "Uploading and applying watermark…" });
      const result = await uploadProductImagesAction(formData);
      setStatus(
        result.ok
          ? { ok: true, text: result.message ?? "Uploaded." }
          : { ok: false, text: result.error }
      );
      if (uploadRef.current) uploadRef.current.value = "";
      router.refresh();
    });
  };

  const replace = (file: File | undefined) => {
    if (!file || !selected) return;
    const formData = new FormData();
    formData.append("mediaId", selected.id);
    formData.append("file", file);

    startTransition(async () => {
      setStatus({ ok: true, text: "Replacing image…" });
      const result = await replaceMediaAction(formData);
      if (!result.ok) {
        setStatus({ ok: false, text: result.error });
        return;
      }
      setStatus({ ok: true, text: result.message ?? "Image replaced." });
      setSelected(null);
      if (replaceRef.current) replaceRef.current.value = "";
      router.refresh();
    });
  };

  const saveAlt = () => {
    if (!selected) return;
    const mediaId = selected.id;
    startTransition(async () => {
      const result = await updateMediaAltAction(mediaId, altDraft);
      setStatus(
        result.ok
          ? { ok: true, text: result.message ?? "Saved." }
          : { ok: false, text: result.error }
      );
      router.refresh();
    });
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const mediaId = pendingDelete.id;
    startTransition(async () => {
      const result = await deleteMediaAction(mediaId);
      if (!result.ok) {
        setStatus({ ok: false, text: result.error });
        return;
      }
      setStatus({ ok: true, text: result.message ?? "Image deleted." });
      setPendingDelete(null);
      setSelected(null);
      router.refresh();
    });
  };

  const detailSrc = mediaSrc(selected, "detail");

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => uploadRef.current?.click()}
          disabled={isPending}
        >
          <UploadIcon className="h-4 w-4" />
          {isPending ? "Working…" : "Upload images"}
        </button>
        <p className="text-xs text-ink-400">
          Uploads are compressed and watermarked automatically.
        </p>
      </div>

      <input
        ref={uploadRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(event) => upload(event.target.files)}
      />

      {status ? (
        <div className="mb-4">
          <StatusMessage status={status} />
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="card p-10 text-center">
          <ImageIcon className="mx-auto h-8 w-8 text-ink-400" />
          <h2 className="mt-3 text-lg text-ink-900">No images yet</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-500">
            Every image you upload here or from a product form appears in this
            library and can be reused.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((item) => {
            const src = mediaSrc(item, "thumb");
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(item);
                    setAltDraft(item.alt ?? "");
                  }}
                  className="card group block w-full overflow-hidden text-left transition-shadow hover:shadow-sm"
                >
                  <span className="relative block aspect-square bg-cream-200">
                    {src ? (
                      <Image
                        src={src}
                        alt={item.alt ?? item.originalName}
                        fill
                        sizes="(min-width: 1024px) 20vw, 45vw"
                        className="object-cover"
                      />
                    ) : (
                      <ImageIcon className="absolute inset-0 m-auto h-6 w-6 text-ink-400" />
                    )}
                    {item.kind === "logo" ? (
                      <span className="absolute left-1.5 top-1.5">
                        <Badge tone="warning">Logo</Badge>
                      </span>
                    ) : null}
                  </span>
                  <span className="block px-2.5 py-2">
                    <span className="block truncate text-xs font-medium text-ink-700">
                      {item.originalName}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-ink-400">
                      {item.width}×{item.height} · {formatBytes(item.bytes)}
                      {item.usageCount > 0 ? ` · used ${item.usageCount}×` : " · unused"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Detail panel */}
      {selected ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-2 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Image: ${selected.originalName}`}
        >
          <button
            type="button"
            aria-label="Close image details"
            className="absolute inset-0 bg-ink-900/50"
            onClick={() => setSelected(null)}
          />
          <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-cream-200 px-5 py-4">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-ink-900">
                  {selected.originalName}
                </h2>
                <p className="text-xs text-ink-400">
                  {selected.width}×{selected.height} ·{" "}
                  {formatBytes(selected.bytes)} ·{" "}
                  {selected.usageCount > 0
                    ? `used in ${selected.usageCount} place(s)`
                    : "not used yet"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close image details"
                className="rounded-lg p-1.5 text-ink-400 hover:bg-cream-200"
              >
                <XIcon />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <div className="relative mx-auto flex max-h-72 justify-center overflow-hidden rounded-xl bg-cream-200">
                {detailSrc ? (
                  <Image
                    src={detailSrc}
                    alt={selected.alt ?? selected.originalName}
                    width={selected.width}
                    height={selected.height}
                    className="max-h-72 w-auto object-contain"
                  />
                ) : null}
              </div>

              <div className="mt-5">
                <label className="field-label" htmlFor="media-alt">
                  Image description (alt text)
                </label>
                <input
                  id="media-alt"
                  value={altDraft}
                  onChange={(event) => setAltDraft(event.target.value)}
                  className="field-input"
                  placeholder="Red silk saree with gold border"
                />
                <p className="field-hint">
                  Read aloud by screen readers and shown if the image fails to
                  load. Good for search engines too.
                </p>
                <button
                  type="button"
                  className="btn btn-outline mt-2"
                  onClick={saveAlt}
                  disabled={isPending}
                >
                  Save description
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-cream-200 px-5 py-4">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => replaceRef.current?.click()}
                disabled={isPending}
              >
                <UploadIcon className="h-4 w-4" />
                Replace image
              </button>
              {detailSrc ? (
                <a
                  href={detailSrc}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline"
                >
                  <ExternalIcon className="h-4 w-4" />
                  Open full size
                </a>
              ) : null}
              <button
                type="button"
                className="btn btn-danger sm:ml-auto"
                onClick={() => setPendingDelete(selected)}
                disabled={isPending}
              >
                <TrashIcon className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <input
        ref={replaceRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => replace(event.target.files?.[0])}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this image?"
        confirmLabel="Delete image"
        busy={isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        body={
          <p>
            {pendingDelete && pendingDelete.usageCount > 0 ? (
              <>
                This image is used in{" "}
                <strong>{pendingDelete.usageCount} place(s)</strong> on your site.
                Deleting it removes it from those products or categories as well.
                This cannot be undone.
              </>
            ) : (
              <>
                The file will be removed permanently. This cannot be undone.
              </>
            )}
          </p>
        }
      />
    </div>
  );
}
