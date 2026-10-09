"use client";

import { useEffect, useState, useTransition } from "react";
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
  deleteProductAction,
  duplicateProductAction,
  reorderProductsAction,
  toggleProductPublishedAction,
} from "@/app/admin/_actions/products";
import { mediaSrc, type MediaLike } from "@/lib/media";
import { Badge, ConfirmDialog, StatusMessage } from "@/components/admin/ui";
import {
  CopyIcon,
  DragHandleIcon,
  EyeIcon,
  EyeOffIcon,
  ImageIcon,
  PencilIcon,
  TrashIcon,
} from "@/components/icons";

export type AdminProductRow = {
  id: string;
  designNumber: string;
  name: string;
  categoryName: string | null;
  isPublished: boolean;
  image: MediaLike | null;
};

function Row({
  product,
  sortable,
  busy,
  onToggle,
  onDuplicate,
  onDelete,
}: {
  product: AdminProductRow;
  sortable: boolean;
  busy: boolean;
  onToggle: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: product.id, disabled: !sortable });
  const src = mediaSrc(product.image, "thumb");

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 bg-white px-3 py-3 ${
        isDragging
          ? "relative z-10 rounded-xl shadow-lg"
          : "border-b border-cream-200 last:border-b-0"
      }`}
    >
      {sortable ? (
        <button
          type="button"
          className="cursor-grab rounded p-1 text-ink-400 hover:bg-cream-200 active:cursor-grabbing"
          aria-label={`Reorder ${product.name}`}
          {...attributes}
          {...listeners}
        >
          <DragHandleIcon />
        </button>
      ) : null}

      <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-cream-200">
        {src ? (
          <Image src={src} alt="" fill sizes="48px" className="object-cover" />
        ) : (
          <ImageIcon className="absolute inset-0 m-auto h-4 w-4 text-ink-400" />
        )}
      </span>

      <Link
        href={`/admin/products/${product.id}`}
        className="min-w-0 flex-1 rounded-lg py-0.5"
      >
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-semibold text-ink-800">
            {product.name}
          </span>
          {product.isPublished ? (
            <Badge tone="success">Published</Badge>
          ) : (
            <Badge tone="muted">Hidden</Badge>
          )}
        </span>
        <span className="mt-0.5 block truncate text-xs text-ink-400">
          Design No. {product.designNumber}
          {product.categoryName ? ` · ${product.categoryName}` : " · No category"}
        </span>
      </Link>

      <span className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={onToggle}
          disabled={busy}
          title={product.isPublished ? "Hide from customers" : "Show to customers"}
          aria-label={
            product.isPublished
              ? `Hide ${product.name} from customers`
              : `Show ${product.name} to customers`
          }
          className="rounded-lg p-2 text-ink-500 hover:bg-cream-200 disabled:opacity-50"
        >
          {product.isPublished ? <EyeIcon /> : <EyeOffIcon />}
        </button>
        <button
          type="button"
          onClick={onDuplicate}
          disabled={busy}
          title="Duplicate"
          aria-label={`Duplicate ${product.name}`}
          className="hidden rounded-lg p-2 text-ink-500 hover:bg-cream-200 disabled:opacity-50 sm:inline-flex"
        >
          <CopyIcon />
        </button>
        <Link
          href={`/admin/products/${product.id}`}
          aria-label={`Edit ${product.name}`}
          className="rounded-lg p-2 text-ink-500 hover:bg-cream-200"
        >
          <PencilIcon />
        </Link>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          aria-label={`Delete ${product.name}`}
          className="rounded-lg p-2 text-ink-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
        >
          <TrashIcon />
        </button>
      </span>
    </li>
  );
}

export function ProductList({
  products,
  sortable,
}: {
  products: AdminProductRow[];
  sortable: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(products);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminProductRow | null>(null);
  const [isPending, startTransition] = useTransition();

  // Keep the list in sync when filters, paging or a refresh change the data.
  useEffect(() => {
    setRows(products);
  }, [products]);

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

    const previous = rows;
    const next = arrayMove(rows, from, to);
    setRows(next);
    startTransition(async () => {
      const result = await reorderProductsAction(next.map((row) => row.id));
      if (!result.ok) {
        setRows(previous);
        setStatus({ ok: false, text: result.error });
        return;
      }
      setStatus({ ok: true, text: "Order saved." });
      router.refresh();
    });
  };

  const toggle = (product: AdminProductRow) => {
    startTransition(async () => {
      const result = await toggleProductPublishedAction(product.id);
      if (!result.ok) {
        setStatus({ ok: false, text: result.error });
        return;
      }
      setRows((previous) =>
        previous.map((row) =>
          row.id === product.id
            ? { ...row, isPublished: result.data?.isPublished ?? !row.isPublished }
            : row
        )
      );
      setStatus({ ok: true, text: result.message ?? "Updated." });
      router.refresh();
    });
  };

  const duplicate = (product: AdminProductRow) => {
    startTransition(async () => {
      const result = await duplicateProductAction(product.id);
      if (!result.ok) {
        setStatus({ ok: false, text: result.error });
        return;
      }
      setStatus({ ok: true, text: result.message ?? "Product duplicated." });
      router.refresh();
    });
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const product = pendingDelete;
    startTransition(async () => {
      const result = await deleteProductAction(product.id);
      if (!result.ok) {
        setStatus({ ok: false, text: result.error });
        return;
      }
      setRows((previous) => previous.filter((row) => row.id !== product.id));
      setPendingDelete(null);
      setStatus({ ok: true, text: result.message ?? "Product deleted." });
      router.refresh();
    });
  };

  return (
    <div>
      {status ? (
        <div className="mb-4">
          <StatusMessage status={status} />
        </div>
      ) : null}

      {sortable ? (
        <p className="mb-3 text-xs text-ink-400">
          Drag the handles to set the order customers see. Switch the sort option
          to browse differently.
        </p>
      ) : null}

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
            {rows.map((product) => (
              <Row
                key={product.id}
                product={product}
                sortable={sortable}
                busy={isPending}
                onToggle={() => toggle(product)}
                onDuplicate={() => duplicate(product)}
                onDelete={() => setPendingDelete(product)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={`Delete Design No. ${pendingDelete?.designNumber ?? ""}?`}
        confirmLabel="Delete product"
        busy={isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        body={
          <p>
            &ldquo;{pendingDelete?.name}&rdquo; will be removed from the public
            catalog. This cannot be undone, but its images stay in your media
            library. If you only want to take it offline for now, use the hide
            button instead.
          </p>
        }
      />
    </div>
  );
}
