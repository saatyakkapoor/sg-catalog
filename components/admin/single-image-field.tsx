"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import {
  uploadLogoAction,
  uploadProductImagesAction,
  type UploadedMedia,
} from "@/app/admin/_actions/media";
import { mediaSrc } from "@/lib/media";
import { MediaPicker } from "@/components/admin/media-picker";
import { StatusMessage } from "@/components/admin/ui";
import { ImageIcon, TrashIcon, UploadIcon } from "@/components/icons";

/**
 * One-image field used for category images and brand/watermark logos.
 * Writes the selected media id into a hidden input so it posts with the form.
 */
export function SingleImageField({
  name,
  kind = "product",
  initial,
  label,
  hint,
  previewClassName = "h-28 w-28 object-cover",
  onChange,
}: {
  name: string;
  kind?: "product" | "logo";
  initial?: UploadedMedia | null;
  label: string;
  hint?: string;
  previewClassName?: string;
  /** Notified whenever the selection changes, for live previews. */
  onChange?: (media: UploadedMedia | null) => void;
}) {
  const [media, setMediaState] = useState<UploadedMedia | null>(initial ?? null);

  const setMedia = (next: UploadedMedia | null) => {
    setMediaState(next);
    onChange?.(next);
  };
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = (file: File | undefined) => {
    if (!file) return;
    startTransition(async () => {
      setStatus({ ok: true, text: "Uploading…" });
      if (kind === "logo") {
        const formData = new FormData();
        formData.append("file", file);
        const result = await uploadLogoAction(formData);
        if (!result.ok) {
          setStatus({ ok: false, text: result.error });
          return;
        }
        setMedia(result.data ?? null);
      } else {
        const formData = new FormData();
        formData.append("files", file);
        const result = await uploadProductImagesAction(formData);
        if (!result.ok) {
          setStatus({ ok: false, text: result.error });
          return;
        }
        setMedia(result.data?.[0] ?? null);
      }
      setStatus({ ok: true, text: "Image uploaded. Remember to save." });
      if (inputRef.current) inputRef.current.value = "";
    });
  };

  const src = mediaSrc(media, "card");

  return (
    <div>
      <span className="field-label">{label}</span>
      <input type="hidden" name={name} value={media?.id ?? ""} />

      <div className="flex flex-wrap items-start gap-4">
        <span className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-cream-200 bg-cream-200">
          {src ? (
            <Image
              src={src}
              alt={media?.alt ?? label}
              width={160}
              height={160}
              className={previewClassName}
            />
          ) : (
            <ImageIcon className="h-6 w-6 text-ink-400" />
          )}
        </span>

        <div className="flex flex-1 flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => inputRef.current?.click()}
            disabled={isPending}
          >
            <UploadIcon className="h-4 w-4" />
            {isPending ? "Uploading…" : media ? "Replace" : "Upload"}
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setPickerOpen(true)}
            disabled={isPending}
          >
            <ImageIcon className="h-4 w-4" />
            Library
          </button>
          {media ? (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setMedia(null);
                setStatus(null);
              }}
            >
              <TrashIcon className="h-4 w-4" />
              Remove
            </button>
          ) : null}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => upload(event.target.files?.[0])}
      />

      {hint ? <p className="field-hint mt-2">{hint}</p> : null}
      {status ? (
        <div className="mt-2">
          <StatusMessage status={status} />
        </div>
      ) : null}

      <MediaPicker
        open={pickerOpen}
        kind={kind}
        onClose={() => setPickerOpen(false)}
        onSelect={(selection) => {
          setMedia(selection[0] ?? null);
          setStatus(null);
        }}
      />
    </div>
  );
}
