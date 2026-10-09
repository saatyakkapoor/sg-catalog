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
import { slugify, uniqueSlug } from "@/lib/slug";

const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a category name.")
    .max(80, "Keep the name under 80 characters."),
  slug: z.string().trim().max(80).optional(),
  description: z.string().trim().max(2000).optional(),
  imageId: z.string().trim().optional(),
  isPublished: z.boolean(),
});

function readCategoryForm(formData: FormData) {
  return categorySchema.safeParse({
    name: formData.get("name") ?? "",
    slug: formData.get("slug") ?? "",
    description: formData.get("description") ?? "",
    imageId: formData.get("imageId") ?? "",
    isPublished: formData.get("isPublished") === "on",
  });
}

function firstIssue(error: z.ZodError): {
  message: string;
  fieldErrors: Record<string, string>;
} {
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

export async function createCategoryAction(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    await requireAdmin();

    const parsed = readCategoryForm(formData);
    if (!parsed.success) {
      const { message, fieldErrors } = firstIssue(parsed.error);
      return failure(message, fieldErrors);
    }
    const input = parsed.data;

    const slug = await uniqueSlug(
      slugify(input.slug || input.name),
      async (candidate) =>
        (await prisma.category.count({ where: { slug: candidate } })) > 0
    );

    const last = await prisma.category.findFirst({
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const category = await prisma.category.create({
      data: {
        name: input.name,
        slug,
        description: input.description || null,
        imageId: input.imageId || null,
        isPublished: input.isPublished,
        sortOrder: (last?.sortOrder ?? 0) + 1,
      },
    });

    revalidateSite();
    return success(`Category "${category.name}" created.`, { id: category.id });
  });
}

export async function updateCategoryAction(
  categoryId: string,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    await requireAdmin();

    const existing = await prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!existing) return failure("That category no longer exists.");

    const parsed = readCategoryForm(formData);
    if (!parsed.success) {
      const { message, fieldErrors } = firstIssue(parsed.error);
      return failure(message, fieldErrors);
    }
    const input = parsed.data;

    const desiredSlug = slugify(input.slug || input.name);
    const slug =
      desiredSlug === existing.slug
        ? existing.slug
        : await uniqueSlug(desiredSlug, async (candidate) =>
            (await prisma.category.count({
              where: { slug: candidate, NOT: { id: categoryId } },
            })) > 0
          );

    await prisma.category.update({
      where: { id: categoryId },
      data: {
        name: input.name,
        slug,
        description: input.description || null,
        imageId: input.imageId || null,
        isPublished: input.isPublished,
      },
    });

    revalidateSite();
    return success("Category saved.", { id: categoryId });
  });
}

export async function toggleCategoryPublishedAction(
  categoryId: string
): Promise<ActionResult<{ isPublished: boolean }>> {
  return guard(async () => {
    await requireAdmin();
    const existing = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { isPublished: true, name: true },
    });
    if (!existing) return failure("That category no longer exists.");

    const updated = await prisma.category.update({
      where: { id: categoryId },
      data: { isPublished: !existing.isPublished },
      select: { isPublished: true },
    });

    revalidateSite();
    return success(
      updated.isPublished
        ? `"${existing.name}" is now visible to customers.`
        : `"${existing.name}" is now hidden from customers.`,
      { isPublished: updated.isPublished }
    );
  });
}

export async function reorderCategoriesAction(
  orderedIds: string[]
): Promise<ActionResult> {
  return guard(async () => {
    await requireAdmin();
    if (orderedIds.length === 0) return success();

    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.category.update({
          where: { id },
          data: { sortOrder: index + 1 },
        })
      )
    );

    revalidateSite();
    return success("Category order saved.");
  });
}

export type DeleteCategoryStrategy = "move" | "deleteProducts" | "unassign";

/**
 * Deleting a category never silently removes its products. The caller must say
 * what should happen to them, and the UI surfaces the count first.
 */
export async function deleteCategoryAction(input: {
  categoryId: string;
  strategy: DeleteCategoryStrategy;
  targetCategoryId?: string;
}): Promise<ActionResult> {
  return guard(async () => {
    await requireAdmin();

    const category = await prisma.category.findUnique({
      where: { id: input.categoryId },
      include: { _count: { select: { products: true } } },
    });
    if (!category) return failure("That category no longer exists.");

    const productCount = category._count.products;

    if (productCount > 0 && input.strategy === "move") {
      const targetId = input.targetCategoryId;
      if (!targetId) {
        return failure("Choose the category to move these products into.");
      }
      if (targetId === input.categoryId) {
        return failure("Choose a different category to move the products into.");
      }
      const target = await prisma.category.findUnique({
        where: { id: targetId },
        select: { id: true, name: true },
      });
      if (!target) return failure("The chosen destination category no longer exists.");

      await prisma.$transaction([
        prisma.product.updateMany({
          where: { categoryId: input.categoryId },
          data: { categoryId: targetId },
        }),
        prisma.category.delete({ where: { id: input.categoryId } }),
      ]);

      revalidateSite();
      return success(
        `Deleted "${category.name}" and moved ${productCount} product(s) to "${target.name}".`
      );
    }

    if (productCount > 0 && input.strategy === "deleteProducts") {
      await prisma.$transaction([
        prisma.product.deleteMany({ where: { categoryId: input.categoryId } }),
        prisma.category.delete({ where: { id: input.categoryId } }),
      ]);
      revalidateSite();
      return success(
        `Deleted "${category.name}" and its ${productCount} product(s).`
      );
    }

    if (productCount > 0 && input.strategy === "unassign") {
      // Products survive with no category; they stay in the catalog and can be
      // reassigned later.
      await prisma.$transaction([
        prisma.product.updateMany({
          where: { categoryId: input.categoryId },
          data: { categoryId: null },
        }),
        prisma.category.delete({ where: { id: input.categoryId } }),
      ]);
      revalidateSite();
      return success(
        `Deleted "${category.name}". ${productCount} product(s) now have no category.`
      );
    }

    await prisma.category.delete({ where: { id: input.categoryId } });
    revalidateSite();
    return success(`Category "${category.name}" deleted.`);
  });
}
