import path from "node:path";
import sharp from "sharp";
import type { Media } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_UPLOAD_BYTES,
  MEDIA_KIND,
  parseVariants,
} from "@/lib/media";
import {
  deleteOriginalFile,
  deletePublicFile,
  ensureStorageDirs,
  originalExists,
  readOriginalFile,
  safeBaseName,
  uniqueToken,
  writeOriginalFile,
  writePublicFile,
} from "@/lib/storage";
import { applyWatermark, type WatermarkConfig } from "@/lib/watermark";
import { getSettings, watermarkSettingsFrom } from "@/lib/settings";

/**
 * Upload pipeline: compress -> watermark -> write responsive WebP derivatives.
 *
 * Originals are written to the private directory only. Everything the browser
 * can reach is generated from the watermarked master.
 */

const MASTER_MAX = 1800;
const VARIANT_WIDTHS = { detail: 1400, card: 700, thumb: 360 } as const;
const LOGO_MAX = 800;

export class UploadError extends Error {}

export type ProcessedUpload = { media: Media };

function assertAcceptable(file: { type: string; size: number; name: string }) {
  if (file.size === 0) {
    throw new UploadError(`"${file.name}" is empty.`);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError(
      `"${file.name}" is larger than ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.`
    );
  }
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    throw new UploadError(
      `"${file.name}" is not a supported image (use JPG, PNG, WebP or AVIF).`
    );
  }
}

async function resolveWatermarkConfig(): Promise<WatermarkConfig | null> {
  const settings = await getSettings();
  const watermark = watermarkSettingsFrom(settings);
  if (!watermark.enabled || !watermark.logo) return null;

  const logoPath = watermark.logo.originalPath;
  if (!logoPath || !(await originalExists(logoPath))) return null;

  return {
    logo: await readOriginalFile(logoPath),
    opacity: watermark.opacity,
    scale: watermark.scale,
    rotation: watermark.rotation,
    repetitions: watermark.repetitions,
  };
}

async function renderVariants(
  watermarkedMaster: Buffer,
  baseName: string,
  token: string
): Promise<{ variants: Record<string, string>; bytes: number }> {
  const variants: Record<string, string> = {};
  let bytes = 0;

  for (const [name, width] of Object.entries(VARIANT_WIDTHS)) {
    const buffer = await sharp(watermarkedMaster)
      .resize({ width, fit: "inside", withoutEnlargement: true })
      .webp({ quality: name === "thumb" ? 74 : 82 })
      .toBuffer();

    const filename = `${baseName}-${token}-${name}.webp`;
    await writePublicFile(filename, buffer);
    variants[name] = filename;
    bytes += buffer.byteLength;
  }

  return { variants, bytes };
}

/** Processes one product image: private original + watermarked public sizes. */
export async function createProductMedia(
  file: File,
  options: { alt?: string | null } = {}
): Promise<Media> {
  assertAcceptable(file);
  await ensureStorageDirs();

  const input = Buffer.from(await file.arrayBuffer());
  const baseName = safeBaseName(file.name);
  const token = uniqueToken();

  // Normalise orientation once so the stored original and the public copies
  // agree on which way is up.
  let normalized: Buffer;
  let width: number;
  let height: number;
  try {
    const pipeline = sharp(input, { failOn: "none" }).rotate();
    const meta = await pipeline.metadata();
    if (!meta.width || !meta.height) throw new Error("no dimensions");
    normalized = await pipeline
      .resize({ width: MASTER_MAX, height: MASTER_MAX, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 88 })
      .toBuffer();
    const normalizedMeta = await sharp(normalized).metadata();
    width = normalizedMeta.width ?? meta.width;
    height = normalizedMeta.height ?? meta.height;
  } catch {
    throw new UploadError(`"${file.name}" could not be read as an image.`);
  }

  const originalPath = `${baseName}-${token}.webp`;
  await writeOriginalFile(originalPath, normalized);

  const watermarkConfig = await resolveWatermarkConfig();
  const master = watermarkConfig
    ? await applyWatermark(normalized, watermarkConfig).catch(() => normalized)
    : normalized;

  const { variants, bytes } = await renderVariants(master, baseName, token);

  return prisma.media.create({
    data: {
      filename: `${baseName}-${token}`,
      originalName: file.name,
      mimeType: "image/webp",
      kind: MEDIA_KIND.product,
      width,
      height,
      bytes,
      originalPath,
      variants: JSON.stringify(variants),
      alt: options.alt?.trim() || null,
    },
  });
}

/**
 * Processes a logo / watermark asset. Logos are never watermarked and keep
 * their transparency so they can be composited onto product images.
 */
export async function createLogoMedia(file: File): Promise<Media> {
  assertAcceptable(file);
  await ensureStorageDirs();

  const input = Buffer.from(await file.arrayBuffer());
  const baseName = safeBaseName(file.name);
  const token = uniqueToken();

  let processed: Buffer;
  let width: number;
  let height: number;
  try {
    processed = await sharp(input, { failOn: "none" })
      .rotate()
      .resize({ width: LOGO_MAX, height: LOGO_MAX, fit: "inside", withoutEnlargement: true })
      .png({ compressionLevel: 9 })
      .toBuffer();
    const meta = await sharp(processed).metadata();
    width = meta.width ?? 0;
    height = meta.height ?? 0;
  } catch {
    throw new UploadError(`"${file.name}" could not be read as an image.`);
  }

  const originalPath = `${baseName}-${token}.png`;
  await writeOriginalFile(originalPath, processed);

  // The logo itself must be visible on the site, so its public copy is the
  // logo as-is (transparency preserved, no watermark).
  const publicName = `${baseName}-${token}-logo.png`;
  await writePublicFile(publicName, processed);

  return prisma.media.create({
    data: {
      filename: `${baseName}-${token}`,
      originalName: file.name,
      mimeType: "image/png",
      kind: MEDIA_KIND.logo,
      width,
      height,
      bytes: processed.byteLength,
      originalPath,
      variants: JSON.stringify({
        detail: publicName,
        card: publicName,
        thumb: publicName,
      }),
    },
  });
}

/** Deletes every file belonging to a media record, then the record itself. */
export async function deleteMedia(mediaId: string): Promise<void> {
  const media = await prisma.media.findUnique({ where: { id: mediaId } });
  if (!media) return;

  const variants = parseVariants(media.variants);
  await Promise.all(
    [variants.detail, variants.card, variants.thumb]
      .filter((value): value is string => Boolean(value))
      .map((value) => deletePublicFile(value))
  );
  if (media.originalPath) {
    await deleteOriginalFile(media.originalPath);
  }
  await prisma.media.delete({ where: { id: mediaId } });
}

/**
 * Regenerates the public derivatives for one product image from its private
 * original, so changing watermark settings updates the live catalog.
 */
export async function reprocessProductMedia(mediaId: string): Promise<boolean> {
  const media = await prisma.media.findUnique({ where: { id: mediaId } });
  if (!media || media.kind !== MEDIA_KIND.product) return false;
  if (!media.originalPath || !(await originalExists(media.originalPath))) return false;

  await ensureStorageDirs();
  const original = await readOriginalFile(media.originalPath);
  const watermarkConfig = await resolveWatermarkConfig();
  const master = watermarkConfig
    ? await applyWatermark(original, watermarkConfig).catch(() => original)
    : original;

  const baseName = path.basename(media.filename).replace(/-[0-9a-f]{12}$/, "");
  const token = uniqueToken();
  const { variants, bytes } = await renderVariants(
    master,
    safeBaseName(baseName),
    token
  );

  const previous = parseVariants(media.variants);

  await prisma.media.update({
    where: { id: media.id },
    data: { variants: JSON.stringify(variants), bytes },
  });

  // Remove superseded files only after the record points at the new ones.
  await Promise.all(
    [previous.detail, previous.card, previous.thumb]
      .filter((value): value is string => Boolean(value))
      .filter((value) => !Object.values(variants).includes(value))
      .map((value) => deletePublicFile(value))
  );

  return true;
}

/** Re-watermarks the whole product image library. Returns counts. */
export async function reprocessAllProductMedia(): Promise<{
  updated: number;
  skipped: number;
}> {
  const all = await prisma.media.findMany({
    where: { kind: MEDIA_KIND.product },
    select: { id: true },
  });

  let updated = 0;
  let skipped = 0;
  for (const { id } of all) {
    try {
      const ok = await reprocessProductMedia(id);
      if (ok) updated += 1;
      else skipped += 1;
    } catch {
      skipped += 1;
    }
  }
  return { updated, skipped };
}
