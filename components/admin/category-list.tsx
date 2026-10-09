"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  deleteCategoryAction,
  reorderCategoriesAction,
  toggleCategoryPublishedAction,
  type DeleteCategoryStrategy,
} from "@/app/admin/_actions/categories";
import { mediaSrc, type MediaLike } from "@/lib/media";
import { Badge, ConfirmDialog, StatusMessage } from "@/components/admin/ui";
import {
  DragHandleIcon,
  EyeIcon,
  EyeOffIcon,
  ImageIcon,
  PencilIcon,
  TrashIcon,
} from "@/components/icons";

export type AdminCategoryRow = {
  id: string;
  name: string;
  slug: string;
  productCount: number;
  isPublished: boolean;
  image: MediaLike | null;
};

function Row({
  category,
  onToggle,
  onDelete,
  busy,
}: {
  category: AdminCategoryRow;
  onToggle: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: category.id });
  const src = mediaSrc(category.image, "thumb");

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 bg-white px-3 py-3 ${
        isDragging ? "relative z-10 rounded-xl shadow-lg" : "border-b border-cream-200 last:border-b-0"
      }`}
    >
      <button
        type="button"
        className="cursor-grab rounded p-1 text-ink-400 hover:bg-cream-200 active:cursor-grabbing"
        aria-label={`Reorder ${category.name}`}
        {...attributes}
        {...listeners}
      >
        <DragHandleIcon />
      </button>

      <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-cream-200">
        {src ? (
          <Image src={src} alt="" fill sizes="44px" className="object-cover" />
        ) : (
          <ImageIcon className="absolute inset-0 m-auto h-4 w-4 text-ink-400" />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-semibold text-ink-800">
            {category.name}
          </span>
          {category.isPublished ? (
            <Badge tone="success">Published</Badge>
          ) : (
            <Badge tone="muted">Hidden</Badge>
          )}
        </span>
        <span className="mt-0.5 block truncate text-xs text-ink-400">
          /category/{category.slug} · {category.productCount} product
          {category.productCount === 1 ? "" : "s"}
        </span>
      </span>

      <span className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onToggle}
          disabled={busy}
          title={category.isPublished ? "Hide from customers" : "Show to customers"}
          aria-label={
            category.isPublished
              ? `Hide ${category.name} from customers`
              : `Show ${category.name} to customers`
          }
          className="rounded-lg p-2 text-ink-500 hover:bg-cream-200 disabled:opacity-50"
        >
          {category.isPublished ? <EyeIcon /> : <EyeOffIcon />}
        </button>
        <Link
          href={`/admin/categories/${category.id}`}
          aria-label={`Edit ${category.name}`}
          className="rounded-lg p-2 text-ink-500 hover:bg-cream-200"
        >
          <PencilIcon />
        </Link>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          aria-label={`Delete ${category.name}`}
          className="rounded-lg p-2 text-ink-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
        >
          <TrashIcon />
        </button>
      </span>
    </li>
  );
}

export function CategoryList({ categories }: { categories: AdminCategoryRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(categories);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminCategoryRow | null>(null);
  const [strategy, setStrategy] = useState<DeleteCategoryStrategy>("move");
  const [targetId, setTargetId] = useState("");
  const [isPending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = rows.findIndex((row) => row.id === active.id);
    const to = rows.findIndex((row) => row.id === over.id);
    if (from < 0 || to < 0) return;

    const next = arrayMove(rows, from, to);
    setRows(next);
    startTransition(async () => {
      const result = await reorderCategoriesAction(next.map((row) => row.id));
      if (!result.ok) {
        setRows(rows);
        setStatus({ ok: false, text: result.error });
        return;
      }
      setStatus({ ok: true, text: "Order saved." });
      router.refresh();
    });
  };

  const toggle = (category: AdminCategoryRow) => {
    startTransition(async () => {
      const result = await toggleCategoryPublishedAction(category.id);
      if (!result.ok) {
        setStatus({ ok: false, text: result.error });
        return;
      }
      setRows((previous) =>
        previous.map((row) =>
          row.id === category.id
            ? { ...row, isPublished: result.data?.isPublished ?? !row.isPublished }
            : row
        )
      );
      setStatus({ ok: true, text: result.message ?? "Updated." });
      router.refresh();
    });
  };

  const openDelete = (category: AdminCategoryRow) => {
    setPendingDelete(category);
    setStrategy(category.productCount > 0 ? "move" : "unassign");
    const firstOther = rows.find((row) => row.id !== category.id);
    setTargetId(firstOther?.id ?? "");
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const category = pendingDelete;
    startTransition(async () => {
      const result = await deleteCategoryAction({
        categoryId: category.id,
        strategy,
        targetCategoryId: strategy === "move" ? targetId : undefined,
      });
      if (!result.ok) {
        setStatus({ ok: false, text: result.error });
        return;
      }
      setRows((previous) => previous.filter((row) => row.id !== category.id));
      setPendingDelete(null);
      setStatus({ ok: true, text: result.message ?? "Category deleted." });
      router.refresh();
    });
  };

  const otherCategories = rows.filter((row) => row.id !== pendingDelete?.id);

  return (
    <div>
      {status ? (
        <div className="mb-4">
          <StatusMessage status={status} />
        </div>
      ) : null}

      <p className="mb-3 text-xs text-ink-400">
        Drag the handles to change the order customers see.
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={rows.map((row) => row.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="card overflow-hidden">
            {rows.map((category) => (
              <Row
                key={category.id}
                category={category}
                busy={isPending}
                onToggle={() => toggle(category)}
                onDelete={() => openDelete(category)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={`Delete "${pendingDelete?.name ?? ""}"?`}
        confirmLabel="Delete category"
        busy={isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        body={
          pendingDelete && pendingDelete.productCount > 0 ? (
            <p>
              This category contains{" "}
              <strong>
                {pendingDelete.productCount} product
                {pendingDelete.productCount === 1 ? "" : "s"}
              </strong>
              . Choose what should happen to them — nothing is deleted without
              your say.
            </p>
          ) : (
            <p>This category has no products. It will be removed from the site.</p>
          )
        }
      >
        {pendingDelete && pendingDelete.productCount > 0 ? (
          <fieldset className="space-y-3">
            <legend className="sr-only">What to do with the products</legend>

            <label className="flex items-start gap-2.5 rounded-lg border border-cream-200 p-3">
              <input
                type="radio"
                name="strategy"
                className="mt-0.5"
                checked={strategy === "move"}
                onChange={() => setStrategy("move")}
              />
              <span className="flex-1">
                <span className="block text-sm font-semibold text-ink-700">
                  Move products to another category
                </span>
                {strategy === "move" ? (
                  otherCategories.length > 0 ? (
                    <select
                      className="field-input mt-2"
                      value={targetId}
                      onChange={(event) => setTargetId(event.target.value)}
                      aria-label="Destination category"
                    >
                      <option value="">Choose a category…</option>
                      {otherCategories.map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="mt-1 block text-xs text-ink-400">
                      There is no other category to move them into. Create one
                      first, or pick another option.
                    </span>
                  )
                ) : null}
              </span>
            </label>

            <label className="flex items-start gap-2.5 rounded-lg border border-cream-200 p-3">
              <input
                type="radio"
                name="strategy"
                className="mt-0.5"
                checked={strategy === "unassign"}
                onChange={() => setStrategy("unassign")}
              />
              <span>
                <span className="block text-sm font-semibold text-ink-700">
                  Keep products, remove their category
                </span>
                <span className="mt-0.5 block text-xs text-ink-400">
                  They stay in the catalog and search, with no category assigned.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50/50 p-3">
              <input
                type="radio"
                name="strategy"
                className="mt-0.5"
                checked={strategy === "deleteProducts"}
                onChange={() => setStrategy("deleteProducts")}
              />
              <span>
                <span className="block text-sm font-semibold text-red-700">
                  Delete the products too
                </span>
                <span className="mt-0.5 block text-xs text-red-600">
                  This cannot be undone. Images stay in the media library.
                </span>
              </span>
            </label>
          </fieldset>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}
