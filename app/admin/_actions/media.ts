"use server";

import type { Media } from "@prisma/client";
import { requireAdmin } from "@/auth";
import { prisma } from "@/lib/db";
import {
  createLogoMedia,
  createProductMedia,
  deleteMedia,
  reprocessAllProductMedia,
  UploadError,
} from "@/lib/images.server";
import {
  failure,
  guard,
  revalidateSite,
  safeError,
  success,
  type ActionResult,
} from "@/lib/action-result";

export type UploadedMedia = {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  kind: string;
  width: number;
  height: number;
  bytes: number;
  variants: string;
  alt: string | null;
};

function toClient(media: Media): UploadedMedia {
  return {
    id: media.id,
    filename: media.filename,
    originalName: media.originalName,
    mimeType: media.mimeType,
    kind: media.kind,
    width: media.width,
    height: media.height,
    bytes: media.bytes,
    variants: media.variants,
    alt: media.alt,
  };
}

/** Uploads one or more product images; each gets the brand watermark. */
export async function uploadProductImagesAction(
  formData: FormData
): Promise<ActionResult<UploadedMedia[]>> {
  return guard(async () => {
    await requireAdmin();

    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);

    if (files.length === 0) {
      return failure("Choose at least one image to upload.");
    }
    if (files.length > 12) {
      return failure("Upload up to 12 images at a time.");
    }

    const created: UploadedMedia[] = [];
    const problems: string[] = [];

    for (const file of files) {
      try {
        created.push(toClient(await createProductMedia(file)));
      } catch (error) {
        problems.push(
          error instanceof UploadError
            ? error.message
            : `"${file.name}" could not be processed.`
        );
      }
    }

    if (created.length === 0) {
      return failure(problems.join(" ") || "Upload failed. Please try again.");
    }

    revalidateSite();
    const note =
      problems.length > 0
        ? `Uploaded ${created.length} image(s). ${problems.join(" ")}`
        : `Uploaded ${created.length} image(s).`;
    return success(note, created);
  });
}

/** Uploads a brand logo / watermark asset (never watermarked itself). */
export async function uploadLogoAction(
  formData: FormData
): Promise<ActionResult<UploadedMedia>> {
  return guard(async () => {
    await requireAdmin();

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return failure("Choose a logo image to upload.");
    }

    try {
      const media = await createLogoMedia(file);
      revalidateSite();
      return success("Logo uploaded.", toClient(media));
    } catch (error) {
      if (error instanceof UploadError) return failure(error.message);
      throw error;
    }
  });
}

export async function updateMediaAltAction(
  mediaId: string,
  alt: string
): Promise<ActionResult> {
  return guard(async () => {
    await requireAdmin();
    const trimmed = alt.trim();
    await prisma.media.update({
      where: { id: mediaId },
      data: { alt: trimmed.length > 0 ? trimmed.slice(0, 200) : null },
    });
    revalidateSite();
    return success("Description saved.");
  });
}

/**
 * Replaces the pixels behind an existing media record. References from
 * products, categories and settings are preserved because the id is unchanged.
 */
export async function replaceMediaAction(
  formData: FormData
): Promise<ActionResult<UploadedMedia>> {
  return guard(async () => {
    await requireAdmin();

    const mediaId = String(formData.get("mediaId") ?? "");
    const file = formData.get("file");
    if (!mediaId) return failure("Nothing selected to replace.");
    if (!(file instanceof File) || file.size === 0) {
      return failure("Choose a replacement image.");
    }

    const existing = await prisma.media.findUnique({ where: { id: mediaId } });
    if (!existing) return failure("That image no longer exists.");

    try {
      const replacement =
        existing.kind === "logo"
          ? await createLogoMedia(file)
          : await createProductMedia(file, { alt: existing.alt });

      // Move the new files onto the original record, then drop the temporary
      // one so no references break.
      const updated = await prisma.media.update({
        where: { id: mediaId },
        data: {
          filename: replacement.filename,
          originalName: replacement.originalName,
          mimeType: replacement.mimeType,
          width: replacement.width,
          height: replacement.height,
          bytes: replacement.bytes,
          originalPath: replacement.originalPath,
          variants: replacement.variants,
        },
      });

      // Delete the old files (now unreferenced) and the placeholder row.
      await prisma.media.delete({ where: { id: replacement.id } });
      await deleteOldFiles(existing);

      revalidateSite();
      return success("Image replaced.", toClient(updated));
    } catch (error) {
      if (error instanceof UploadError) return failure(error.message);
      throw error;
    }
  });
}

async function deleteOldFiles(previous: Media): Promise<void> {
  const { parseVariants } = await import("@/lib/media");
  const { deleteOriginalFile, deletePublicFile } = await import("@/lib/storage");
  const variants = parseVariants(previous.variants);
  await Promise.all(
    [variants.detail, variants.card, variants.thumb]
      .filter((value): value is string => Boolean(value))
      .map((value) => deletePublicFile(value).catch(() => undefined))
  );
  if (previous.originalPath) {
    await deleteOriginalFile(previous.originalPath).catch(() => undefined);
  }
}

export async function deleteMediaAction(mediaId: string): Promise<ActionResult> {
  return guard(async () => {
    await requireAdmin();

    const media = await prisma.media.findUnique({
      where: { id: mediaId },
      include: {
        _count: { select: { productImages: true, categoryImages: true } },
        settingsAsLogo: { select: { id: true } },
        settingsAsWatermark: { select: { id: true } },
      },
    });
    if (!media) return failure("That image no longer exists.");

    // Detaching happens automatically (cascade / set null), but the admin
    // should know before the catalog changes.
    await deleteMedia(mediaId);
    revalidateSite();

    const uses =
      media._count.productImages +
      media._count.categoryImages +
      media.settingsAsLogo.length +
      media.settingsAsWatermark.length;

    return success(
      uses > 0
        ? `Image deleted and removed from ${uses} place(s) on the site.`
        : "Image deleted."
    );
  });
}

/** Re-applies the current watermark settings to every product image. */
export async function reprocessWatermarksAction(): Promise<ActionResult> {
  return guard(async () => {
    await requireAdmin();
    const { updated, skipped } = await reprocessAllProductMedia();
    revalidateSite();
    if (updated === 0 && skipped === 0) {
      return success("There are no product images to update yet.");
    }
    if (skipped > 0) {
      return success(
        `Re-watermarked ${updated} image(s). ${skipped} could not be updated because the original file is missing.`
      );
    }
    return success(`Re-watermarked ${updated} image(s).`);
  });
}

/** Used by the media picker to page through the library. */
export async function listMediaAction(options: {
  kind?: string;
  skip?: number;
  take?: number;
}): Promise<ActionResult<{ items: UploadedMedia[]; total: number }>> {
  return guard(async () => {
    await requireAdmin();
    const take = Math.min(Math.max(options.take ?? 24, 1), 60);
    const skip = Math.max(options.skip ?? 0, 0);
    const where = options.kind ? { kind: options.kind } : {};

    const [items, total] = await Promise.all([
      prisma.media.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.media.count({ where }),
    ]);

    if (total < 0) throw safeError("Could not load the media library.");
    return success(undefined, { items: items.map(toClient), total });
  });
}
