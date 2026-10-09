"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { UploadedMedia } from "@/app/admin/_actions/media";
import {
  createCategoryAction,
  updateCategoryAction,
} from "@/app/admin/_actions/categories";
import { SingleImageField } from "@/components/admin/single-image-field";
import { StatusMessage, Toggle } from "@/components/admin/ui";

export type CategoryFormValues = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  isPublished: boolean;
  image: UploadedMedia | null;
};

export function CategoryForm({
  initial,
  cancelHref = "/admin/categories",
}: {
  initial?: CategoryFormValues;
  cancelHref?: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const isEdit = Boolean(initial?.id);

  const onSubmit = (formData: FormData) => {
    startTransition(async () => {
      setFieldErrors({});
      const result =
        isEdit && initial?.id
          ? await updateCategoryAction(initial.id, formData)
          : await createCategoryAction(formData);

      if (!result.ok) {
        setStatus({ ok: false, text: result.error });
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      setStatus({ ok: true, text: result.message ?? "Saved." });
      if (isEdit) {
        router.refresh();
      } else {
        router.push("/admin/categories");
      }
    });
  };

  return (
    <form action={onSubmit} className="space-y-6" noValidate>
      <div className="card space-y-4 p-5 sm:p-6">
        <div>
          <label className="field-label" htmlFor="name">
            Category name <span className="text-red-600">*</span>
          </label>
          <input
            id="name"
            name="name"
            required
            defaultValue={initial?.name ?? ""}
            className="field-input"
            placeholder="Premium Collection"
          />
          {fieldErrors.name ? (
            <p className="mt-1.5 text-xs font-medium text-red-600">
              {fieldErrors.name}
            </p>
          ) : null}
        </div>

        <div>
          <label className="field-label" htmlFor="slug">
            Web address (optional)
          </label>
          <div className="flex items-center gap-1.5">
            <span className="shrink-0 text-sm text-ink-400">/category/</span>
            <input
              id="slug"
              name="slug"
              defaultValue={initial?.slug ?? ""}
              className="field-input"
              placeholder="premium-collection"
            />
          </div>
          <p className="field-hint">
            Leave blank and it is created from the name automatically.
          </p>
        </div>

        <div>
          <label className="field-label" htmlFor="description">
            Description (optional)
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={initial?.description ?? ""}
            className="field-input"
            placeholder="A short line shown at the top of this category page."
          />
        </div>

        <SingleImageField
          name="imageId"
          label="Category image (optional)"
          initial={initial?.image ?? null}
          hint="Shown on the homepage category grid. Uploaded images get your watermark."
        />

        <div className="border-t border-cream-200 pt-4">
          <Toggle
            name="isPublished"
            label="Visible to customers"
            description="Turn this off to prepare the category before showing it publicly."
            defaultChecked={initial?.isPublished ?? true}
          />
        </div>
      </div>

      {status ? <StatusMessage status={status} /> : null}

      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn btn-primary" disabled={isPending}>
          {isPending ? "Saving…" : isEdit ? "Save changes" : "Create category"}
        </button>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => router.push(cancelHref)}
          disabled={isPending}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
