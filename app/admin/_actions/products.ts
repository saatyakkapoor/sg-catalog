"use server";

import { z } from "zod";
import { requireAdmin } from "@/auth";
import { prisma } from "@/lib/db";
import {
  failure,
  guard,
  revalidateSite,
  success,
  type ActionResult,
} from "@/lib/action-result";
import { productSlug, uniqueSlug } from "@/lib/slug";

const specSchema = z.object({
  label: z.string().trim().min(1).max(60),
  value: z.string().trim().min(1).max(200),
});

const productSchema = z.object({
  designNumber: z
    .string()
    .trim()
    .min(1, "Enter a design number.")
    .max(40, "Keep the design number under 40 characters."),
  name: z
    .string()
    .trim()
    .min(1, "Enter a product name.")
    .max(120, "Keep the name under 120 characters."),
  description: z.string().trim().max(5000).optional(),
  categoryId: z.string().trim().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(30),
  specs: z.array(specSchema).max(30),
  imageIds: z.array(z.string().trim().min(1)).max(20),
  isPublished: z.boolean(),
});

function parseTags(raw: FormDataEntryValue | null): string[] {
  const text = typeof raw === "string" ? raw : "";
  const seen = new Set<string>();
  return text
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => {
      if (!tag) return false;
      const key = tag.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 30);
}

function parseSpecs(raw: FormDataEntryValue | null) {
  const text = typeof raw === "string" ? raw : "";
  if (!text.trim()) return [];
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const { label, value } = entry as Record<string, unknown>;
        if (typeof label !== "string" || typeof value !== "string") return null;
        if (!label.trim() || !value.trim()) return null;
        return { label: label.trim(), value: value.trim() };
      })
      .filter((entry): entry is { label: string; value: string } => entry !== null)
      .slice(0, 30);
  } catch {
    return [];
  }
}

function parseImageIds(raw: FormDataEntryValue | null): string[] {
  const text = typeof raw === "string" ? raw : "";
  const seen = new Set<string>();
  return text
    .split(",")
    .map((id) => id.trim())
    .filter((id) => {
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .slice(0, 20);
}

function readProductForm(formData: FormData) {
  return productSchema.safeParse({
    designNumber: formData.get("designNumber") ?? "",
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? "",
    categoryId: formData.get("categoryId") ?? "",
    tags: parseTags(formData.get("tags")),
    specs: parseSpecs(formData.get("specs")),
    imageIds: parseImageIds(formData.get("imageIds")),
    isPublished: formData.get("isPublished") === "on",
  });
}

function firstIssue(error: z.ZodError) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    fieldErrors[key] ??= issue.message;
  }
  return {
    message: error.issues[0]?.message ?? "Check the form and try again.",
    fieldErrors,
  };
}

/** Keeps only image ids that still exist, preserving the admin's order. */
async function validImageIdsInOrder(imageIds: string[]): Promise<string[]> {
  if (imageIds.length === 0) return [];
  const found = await prisma.media.findMany({
    where: { id: { in: imageIds } },
    select: { id: true },
  });
  const valid = new Set(found.map((item) => item.id));
  return imageIds.filter((id) => valid.has(id));
}

export async function createProductAction(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    await requireAdmin();

    const parsed = readProductForm(formData);
    if (!parsed.success) {
      const { message, fieldErrors } = firstIssue(parsed.error);
      return failure(message, fieldErrors);
    }
    const input = parsed.data;

    const duplicate = await prisma.product.findUnique({
      where: { designNumber: input.designNumber },
      select: { id: true },
    });
    if (duplicate) {
      return failure(
        `Design No. ${input.designNumber} is already used by another product. Every design number must be unique.`,
        { designNumber: "This design number is already in use." }
      );
    }

    if (input.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: input.categoryId },
        select: { id: true },
      });
      if (!category) {
        return failure("The selected category no longer exists.", {
          categoryId: "Choose a category.",
        });
      }
    }

    const slug = await uniqueSlug(
      productSlug(input.designNumber, input.name),
      async (candidate) =>
        (await prisma.product.count({ where: { slug: candidate } })) > 0
    );

    const last = await prisma.product.findFirst({
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const imageIds = await validImageIdsInOrder(input.imageIds);

    const product = await prisma.product.create({
      data: {
        designNumber: input.designNumber,
        name: input.name,
        slug,
        description: input.description || null,
        categoryId: input.categoryId || null,
        tags: JSON.stringify(input.tags),
        specs: JSON.stringify(input.specs),
        isPublished: input.isPublished,
        sortOrder: (last?.sortOrder ?? 0) + 1,
        images: {
          create: imageIds.map((mediaId, index) => ({
            mediaId,
            sortOrder: index,
            isPrimary: index === 0,
          })),
        },
      },
    });

    revalidateSite();
    return success(`Design No. ${product.designNumber} added to the catalog.`, {
      id: product.id,
    });
  });
}

export async function updateProductAction(
  productId: string,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    await requireAdmin();

    const existing = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!existing) return failure("That product no longer exists.");

    const parsed = readProductForm(formData);
    if (!parsed.success) {
      const { message, fieldErrors } = firstIssue(parsed.error);
      return failure(message, fieldErrors);
    }
    const input = parsed.data;

    if (input.designNumber !== existing.designNumber) {
      const duplicate = await prisma.product.findUnique({
        where: { designNumber: input.designNumber },
        select: { id: true },
      });
      if (duplicate) {
        return failure(
          `Design No. ${input.designNumber} is already used by another product.`,
          { designNumber: "This design number is already in use." }
        );
      }
    }

    if (input.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: input.categoryId },
        select: { id: true },
      });
      if (!category) {
        return failure("The selected category no longer exists.", {
          categoryId: "Choose a category.",
        });
      }
    }

    // Regenerate the slug only when the design number changes, so links that
    // are already shared keep working otherwise.
    const slug =
      input.designNumber === existing.designNumber
        ? existing.slug
        : await uniqueSlug(
            productSlug(input.designNumber, input.name),
            async (candidate) =>
              (await prisma.product.count({
                where: { slug: candidate, NOT: { id: productId } },
              })) > 0
          );

    const imageIds = await validImageIdsInOrder(input.imageIds);

    await prisma.$transaction([
      prisma.productImage.deleteMany({ where: { productId } }),
      prisma.product.update({
        where: { id: productId },
        data: {
          designNumber: input.designNumber,
          name: input.name,
          slug,
          description: input.description || null,
          categoryId: input.categoryId || null,
          tags: JSON.stringify(input.tags),
          specs: JSON.stringify(input.specs),
          isPublished: input.isPublished,
          images: {
            create: imageIds.map((mediaId, index) => ({
              mediaId,
              sortOrder: index,
              isPrimary: index === 0,
            })),
          },
        },
      }),
    ]);

    revalidateSite();
    return success("Product saved.", { id: productId });
  });
}

export async function toggleProductPublishedAction(
  productId: string
): Promise<ActionResult<{ isPublished: boolean }>> {
  return guard(async () => {
    await requireAdmin();
    const existing = await prisma.product.findUnique({
      where: { id: productId },
      select: { isPublished: true, designNumber: true },
    });
    if (!existing) return failure("That product no longer exists.");

    const updated = await prisma.product.update({
      where: { id: productId },
      data: { isPublished: !existing.isPublished },
      select: { isPublished: true },
    });

    revalidateSite();
    return success(
      updated.isPublished
        ? `Design No. ${existing.designNumber} is now visible to customers.`
        : `Design No. ${existing.designNumber} is now hidden from customers.`,
      { isPublished: updated.isPublished }
    );
  });
}

export async function duplicateProductAction(
  productId: string
): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    await requireAdmin();

    const source = await prisma.product.findUnique({
      where: { id: productId },
      include: { images: { orderBy: { sortOrder: "asc" } } },
    });
    if (!source) return failure("That product no longer exists.");

    // Find a free design number based on the original, e.g. 1025 -> 1025-copy.
    let designNumber = `${source.designNumber}-copy`;
    for (let attempt = 2; attempt < 200; attempt += 1) {
      const taken = await prisma.product.count({ where: { designNumber } });
      if (taken === 0) break;
      designNumber = `${source.designNumber}-copy-${attempt}`;
    }

    const slug = await uniqueSlug(
      productSlug(designNumber, source.name),
      async (candidate) =>
        (await prisma.product.count({ where: { slug: candidate } })) > 0
    );

    const last = await prisma.product.findFirst({
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const copy = await prisma.product.create({
      data: {
        designNumber,
        name: `${source.name} (copy)`,
        slug,
        description: source.description,
        categoryId: source.categoryId,
        tags: source.tags,
        specs: source.specs,
        // A copy starts hidden so it can be edited before customers see it.
        isPublished: false,
        sortOrder: (last?.sortOrder ?? 0) + 1,
        images: {
          create: source.images.map((image, index) => ({
            mediaId: image.mediaId,
            sortOrder: index,
            isPrimary: index === 0,
          })),
        },
      },
    });

    revalidateSite();
    return success(
      `Copied as Design No. ${designNumber}. It is hidden until you publish it.`,
      { id: copy.id }
    );
  });
}

/**
 * Reorders a subset of products (one admin page at a time) by redistributing
 * the sort orders those products already occupy. This keeps their positions
 * relative to products on other pages intact.
 */
export async function reorderProductsAction(
  orderedIds: string[]
): Promise<ActionResult> {
  return guard(async () => {
    await requireAdmin();
    if (orderedIds.length === 0) return success();

    const existing = await prisma.product.findMany({
      where: { id: { in: orderedIds } },
      select: { id: true, sortOrder: true },
    });
    if (existing.length !== orderedIds.length) {
      return failure("The list changed while you were reordering. Reloading.");
    }

    const slots = existing.map((item) => item.sortOrder).sort((a, b) => a - b);

    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.product.update({
          where: { id },
          data: { sortOrder: slots[index] },
        })
      )
    );

    revalidateSite();
    return success("Product order saved.");
  });
}

export async function deleteProductAction(
  productId: string
): Promise<ActionResult> {
  return guard(async () => {
    await requireAdmin();
    const existing = await prisma.product.findUnique({
      where: { id: productId },
      select: { designNumber: true },
    });
    if (!existing) return failure("That product no longer exists.");

    // ProductImage rows cascade; the underlying media stays in the library so
    // it can be reused and is not lost by accident.
    await prisma.product.delete({ where: { id: productId } });

    revalidateSite();
    return success(
      `Design No. ${existing.designNumber} deleted. Its images are still in the media library.`
    );
  });
}
