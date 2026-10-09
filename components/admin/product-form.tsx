"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { UploadedMedia } from "@/app/admin/_actions/media";
import {
  createProductAction,
  updateProductAction,
} from "@/app/admin/_actions/products";
import { ProductImagesField } from "@/components/admin/product-images-field";
import { StatusMessage, Toggle } from "@/components/admin/ui";
import { PlusIcon, TrashIcon, XIcon } from "@/components/icons";

export type ProductSpec = { label: string; value: string };

export type ProductFormValues = {
  id?: string;
  designNumber: string;
  name: string;
  description: string;
  categoryId: string;
  tags: string[];
  specs: ProductSpec[];
  images: UploadedMedia[];
  isPublished: boolean;
};

export type CategoryOption = { id: string; name: string; isPublished: boolean };

function TagsInput({ initial }: { initial: string[] }) {
  const [tags, setTags] = useState<string[]>(initial);
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const parts = raw
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    setTags((previous) => {
      const next = [...previous];
      for (const part of parts) {
        if (!next.some((tag) => tag.toLowerCase() === part.toLowerCase())) {
          next.push(part.slice(0, 40));
        }
      }
      return next.slice(0, 30);
    });
    setDraft("");
  };

  return (
    <div>
      <input type="hidden" name="tags" value={tags.join(",")} />
      <label className="field-label" htmlFor="tag-draft">
        Tags (optional)
      </label>

      {tags.length > 0 ? (
        <ul className="mb-2 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <li key={tag}>
              <span className="inline-flex items-center gap-1 rounded-full bg-cream-200 py-1 pl-2.5 pr-1 text-xs font-medium text-ink-700">
                {tag}
                <button
                  type="button"
                  onClick={() =>
                    setTags((previous) => previous.filter((item) => item !== tag))
                  }
                  aria-label={`Remove tag ${tag}`}
                  className="rounded-full p-0.5 text-ink-400 hover:bg-white hover:text-ink-700"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex gap-2">
        <input
          id="tag-draft"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              add(draft);
            }
          }}
          onBlur={() => add(draft)}
          className="field-input"
          placeholder="silk, wedding, red"
        />
        <button
          type="button"
          className="btn btn-outline shrink-0"
          onClick={() => add(draft)}
        >
          Add
        </button>
      </div>
      <p className="field-hint">
        Customers can find the design by searching these words. Press Enter after
        each tag.
      </p>
    </div>
  );
}

function SpecsEditor({ initial }: { initial: ProductSpec[] }) {
  const [specs, setSpecs] = useState<ProductSpec[]>(initial);

  const update = (index: number, patch: Partial<ProductSpec>) =>
    setSpecs((previous) =>
      previous.map((spec, i) => (i === index ? { ...spec, ...patch } : spec))
    );

  return (
    <div>
      <input
        type="hidden"
        name="specs"
        value={JSON.stringify(
          specs.filter((spec) => spec.label.trim() && spec.value.trim())
        )}
      />
      <span className="field-label">Specifications / custom fields (optional)</span>

      {specs.length === 0 ? (
        <p className="field-hint mb-2">
          Add extra details such as Material, Size or Finish. These appear on the
          product page.
        </p>
      ) : (
        <ul className="mb-2 space-y-2">
          {specs.map((spec, index) => (
            <li key={index} className="flex flex-wrap items-start gap-2">
              <input
                value={spec.label}
                onChange={(event) => update(index, { label: event.target.value })}
                className="field-input flex-1 sm:max-w-[12rem]"
                placeholder="Material"
                aria-label={`Specification ${index + 1} label`}
              />
              <input
                value={spec.value}
                onChange={(event) => update(index, { value: event.target.value })}
                className="field-input min-w-0 flex-1"
                placeholder="Pure silk"
                aria-label={`Specification ${index + 1} value`}
              />
              <button
                type="button"
                onClick={() =>
                  setSpecs((previous) => previous.filter((_, i) => i !== index))
                }
                aria-label={`Remove specification ${index + 1}`}
                className="rounded-lg p-2.5 text-ink-400 hover:bg-red-50 hover:text-red-600"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        className="btn btn-outline"
        onClick={() =>
          setSpecs((previous) =>
            previous.length >= 30 ? previous : [...previous, { label: "", value: "" }]
          )
        }
      >
        <PlusIcon className="h-4 w-4" />
        Add detail
      </button>
    </div>
  );
}

export function ProductForm({
  initial,
  categories,
}: {
  initial?: ProductFormValues;
  categories: CategoryOption[];
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
          ? await updateProductAction(initial.id, formData)
          : await createProductAction(formData);

      if (!result.ok) {
        setStatus({ ok: false, text: result.error });
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      setStatus({ ok: true, text: result.message ?? "Saved." });
      if (isEdit) {
        router.refresh();
      } else {
        router.push("/admin/products");
      }
    });
  };

  return (
    <form action={onSubmit} className="space-y-6" noValidate>
      <div className="card space-y-4 p-5 sm:p-6">
        <h2 className="text-lg text-ink-900">Design details</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="designNumber">
              Design / product number <span className="text-red-600">*</span>
            </label>
            <input
              id="designNumber"
              name="designNumber"
              required
              defaultValue={initial?.designNumber ?? ""}
              className="field-input"
              placeholder="1025"
              inputMode="text"
            />
            {fieldErrors.designNumber ? (
              <p className="mt-1.5 text-xs font-medium text-red-600">
                {fieldErrors.designNumber}
              </p>
            ) : (
              <p className="field-hint">
                Must be unique. Customers use this to enquire.
              </p>
            )}
          </div>

          <div>
            <label className="field-label" htmlFor="name">
              Product name <span className="text-red-600">*</span>
            </label>
            <input
              id="name"
              name="name"
              required
              defaultValue={initial?.name ?? ""}
              className="field-input"
              placeholder="Hand-embroidered silk design"
            />
            {fieldErrors.name ? (
              <p className="mt-1.5 text-xs font-medium text-red-600">
                {fieldErrors.name}
              </p>
            ) : null}
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="categoryId">
            Category
          </label>
          <select
            id="categoryId"
            name="categoryId"
            defaultValue={initial?.categoryId ?? ""}
            className="field-input"
          >
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
                {category.isPublished ? "" : " (hidden)"}
              </option>
            ))}
          </select>
          {fieldErrors.categoryId ? (
            <p className="mt-1.5 text-xs font-medium text-red-600">
              {fieldErrors.categoryId}
            </p>
          ) : categories.length === 0 ? (
            <p className="field-hint">
              You have no categories yet. You can add one later and assign this
              product to it.
            </p>
          ) : null}
        </div>

        <div>
          <label className="field-label" htmlFor="description">
            Description (optional)
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            defaultValue={initial?.description ?? ""}
            className="field-input"
            placeholder="Describe the design, material and any details worth mentioning."
          />
          <p className="field-hint">
            Do not include the price — customers get that from you on WhatsApp.
          </p>
        </div>
      </div>

      <div className="card p-5 sm:p-6">
        <h2 className="mb-4 text-lg text-ink-900">Images</h2>
        <ProductImagesField initial={initial?.images ?? []} />
      </div>

      <div className="card space-y-5 p-5 sm:p-6">
        <h2 className="text-lg text-ink-900">Search and extra details</h2>
        <TagsInput initial={initial?.tags ?? []} />
        <SpecsEditor initial={initial?.specs ?? []} />
      </div>

      <div className="card p-5 sm:p-6">
        <Toggle
          name="isPublished"
          label="Visible to customers"
          description="Turn this off to keep the design ready but hidden from the public catalog."
          defaultChecked={initial?.isPublished ?? true}
        />
      </div>

      {status ? <StatusMessage status={status} /> : null}

      <div className="sticky bottom-0 -mx-4 flex flex-wrap gap-2 border-t border-cream-200 bg-cream-100/95 px-4 py-3 backdrop-blur sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:backdrop-blur-none">
        <button type="submit" className="btn btn-primary" disabled={isPending}>
          {isPending ? "Saving…" : isEdit ? "Save changes" : "Add product"}
        </button>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => router.push("/admin/products")}
          disabled={isPending}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
