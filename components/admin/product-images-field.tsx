"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  uploadProductImagesAction,
  type UploadedMedia,
} from "@/app/admin/_actions/media";
import { mediaSrc } from "@/lib/media";
import { MediaPicker } from "@/components/admin/media-picker";
import { StatusMessage } from "@/components/admin/ui";
import {
  DragHandleIcon,
  ImageIcon,
  TrashIcon,
  UploadIcon,
} from "@/components/icons";

export type ProductImageValue = UploadedMedia;

function SortableImage({
  media,
  index,
  onRemove,
}: {
  media: ProductImageValue;
  index: number;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: media.id });
  const src = mediaSrc(media, "thumb");

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative overflow-hidden rounded-xl border bg-white ${
        isDragging ? "border-gold-500 shadow-lg" : "border-cream-200"
      }`}
    >
      <span className="relative block aspect-square bg-cream-200">
        {src ? (
          <Image
            src={src}
            alt={media.alt ?? media.originalName}
            fill
            sizes="200px"
            className="object-cover"
          />
        ) : (
          <ImageIcon className="absolute inset-0 m-auto h-6 w-6 text-ink-400" />
        )}
        {index === 0 ? (
          <span className="absolute left-1.5 top-1.5 rounded-full bg-ink-900/80 px-2 py-0.5 text-[10px] font-semibold text-cream-100">
            Main image
          </span>
        ) : null}
      </span>

      <span className="flex items-center justify-between gap-1 px-1.5 py-1.5">
        <button
          type="button"
          className="cursor-grab rounded p-1 text-ink-400 hover:bg-cream-200 active:cursor-grabbing"
          aria-label={`Reorder ${media.originalName}`}
          {...attributes}
          {...listeners}
        >
          <DragHandleIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${media.originalName} from this product`}
          className="rounded p-1 text-ink-400 hover:bg-red-50 hover:text-red-600"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </span>
    </li>
  );
}

/**
 * Product image manager: upload new files (watermarked automatically), reuse
 * library images, drag to reorder. The first image is the main image.
 *
 * Serialises the ordered media ids into a hidden input named `imageIds`.
 */
export function ProductImagesField({
  initial = [],
}: {
  initial?: ProductImageValue[];
}) {
  const [images, setImages] = useState<ProductImageValue[]>(initial);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const formData = new FormData();
    for (const file of Array.from(files)) formData.append("files", file);

    startTransition(async () => {
      setStatus({ ok: true, text: "Uploading and applying watermark…" });
      const result = await uploadProductImagesAction(formData);
      if (!result.ok) {
        setStatus({ ok: false, text: result.error });
        return;
      }
      const uploaded = result.data ?? [];
      setImages((previous) => [
        ...previous,
        ...uploaded.filter((item) => !previous.some((p) => p.id === item.id)),
      ]);
      setStatus({ ok: true, text: result.message ?? "Images uploaded." });
      if (inputRef.current) inputRef.current.value = "";
    });
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setImages((previous) => {
      const from = previous.findIndex((item) => item.id === active.id);
      const to = previous.findIndex((item) => item.id === over.id);
      if (from < 0 || to < 0) return previous;
      return arrayMove(previous, from, to);
    });
  };

  return (
    <div>
      <input
        type="hidden"
        name="imageIds"
        value={images.map((image) => image.id).join(",")}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => inputRef.current?.click()}
          disabled={isPending}
        >
          <UploadIcon className="h-4 w-4" />
          {isPending ? "Uploading…" : "Upload images"}
        </button>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => setPickerOpen(true)}
          disabled={isPending}
        >
          <ImageIcon className="h-4 w-4" />
          Choose from library
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(event) => handleFiles(event.target.files)}
      />

      <p className="field-hint mt-2">
        Your brand logo is added as a light watermark automatically. Drag to
        reorder — the first image is shown as the main image.
      </p>

      {status ? (
        <div className="mt-3">
          <StatusMessage status={status} />
        </div>
      ) : null}

      {images.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-cream-300 p-8 text-center">
          <ImageIcon className="mx-auto h-7 w-7 text-ink-400" />
          <p className="mt-2 text-sm text-ink-500">
            No images yet. Upload at least one photo of this design.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToParentElement]}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={images.map((image) => image.id)}
            strategy={rectSortingStrategy}
          >
            <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {images.map((media, index) => (
                <SortableImage
                  key={media.id}
                  media={media}
                  index={index}
                  onRemove={() =>
                    setImages((previous) =>
                      previous.filter((item) => item.id !== media.id)
                    )
                  }
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <MediaPicker
        open={pickerOpen}
        kind="product"
        multiple
        excludeIds={images.map((image) => image.id)}
        onClose={() => setPickerOpen(false)}
        onSelect={(selection) =>
          setImages((previous) => [
            ...previous,
            ...selection.filter((item) => !previous.some((p) => p.id === item.id)),
          ])
        }
      />
    </div>
  );
}
