import sharp from "sharp";

/**
 * Tiled brand-logo watermarking.
 *
 * The watermark is burned into the pixels of every public derivative, so the
 * only copies reachable from the browser are watermarked ones.
 */

export type WatermarkConfig = {
  /** Logo bytes with transparency (PNG/WebP work best). */
  logo: Buffer;
  /** 0.02 - 0.6; how visible each placement is. */
  opacity: number;
  /** 0.05 - 0.6; tile width as a fraction of the image's shorter side. */
  scale: number;
  /** Degrees, e.g. -30 for a diagonal look. */
  rotation: number;
  /** How many times the logo is stamped across the image. */
  repetitions: number;
};

export const WATERMARK_LIMITS = {
  opacity: { min: 0.02, max: 0.6 },
  scale: { min: 0.05, max: 0.6 },
  rotation: { min: -90, max: 90 },
  repetitions: { min: 1, max: 12 },
} as const;

export function clampWatermarkConfig<T extends Omit<WatermarkConfig, "logo">>(
  input: T
): T {
  return {
    ...input,
    opacity: clamp(input.opacity, WATERMARK_LIMITS.opacity.min, WATERMARK_LIMITS.opacity.max),
    scale: clamp(input.scale, WATERMARK_LIMITS.scale.min, WATERMARK_LIMITS.scale.max),
    rotation: Math.round(
      clamp(input.rotation, WATERMARK_LIMITS.rotation.min, WATERMARK_LIMITS.rotation.max)
    ),
    repetitions: Math.round(
      clamp(
        input.repetitions,
        WATERMARK_LIMITS.repetitions.min,
        WATERMARK_LIMITS.repetitions.max
      )
    ),
  };
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/**
 * Relative anchor points, ordered so that taking the first N gives a balanced
 * spread. Separate sets per orientation keep placements from bunching up on
 * very wide or very tall images.
 */
function anchorsFor(count: number, width: number, height: number): Array<[number, number]> {
  const aspect = width / height;

  const square: Array<[number, number]> = [
    [0.5, 0.5],
    [0.2, 0.22],
    [0.8, 0.78],
    [0.78, 0.24],
    [0.22, 0.76],
    [0.5, 0.1],
    [0.5, 0.9],
    [0.1, 0.5],
    [0.9, 0.5],
    [0.34, 0.42],
    [0.66, 0.58],
    [0.12, 0.88],
  ];

  const wide: Array<[number, number]> = [
    [0.5, 0.5],
    [0.16, 0.26],
    [0.84, 0.74],
    [0.34, 0.76],
    [0.68, 0.24],
    [0.08, 0.72],
    [0.92, 0.28],
    [0.26, 0.14],
    [0.74, 0.86],
    [0.42, 0.3],
    [0.58, 0.7],
    [0.5, 0.92],
  ];

  const tall: Array<[number, number]> = [
    [0.5, 0.5],
    [0.26, 0.16],
    [0.74, 0.84],
    [0.76, 0.34],
    [0.24, 0.68],
    [0.72, 0.08],
    [0.28, 0.92],
    [0.14, 0.26],
    [0.86, 0.74],
    [0.3, 0.42],
    [0.7, 0.58],
    [0.5, 0.08],
  ];

  const set = aspect >= 1.45 ? wide : aspect <= 0.69 ? tall : square;
  return set.slice(0, Math.max(1, Math.min(count, set.length)));
}

/**
 * Resizes and rotates the logo, then scales its alpha channel down so the
 * stamp reads as a light overlay instead of a solid sticker.
 */
async function buildTile(
  logo: Buffer,
  targetWidth: number,
  rotation: number,
  opacity: number
): Promise<{ data: Buffer; width: number; height: number }> {
  const rotated = sharp(logo, { failOn: "none" })
    .resize({
      width: Math.max(16, Math.round(targetWidth)),
      fit: "inside",
      withoutEnlargement: false,
    })
    .rotate(rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha();

  const { data, info } = await rotated
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Multiply the existing alpha so transparent logo areas stay transparent.
  for (let i = 3; i < data.length; i += 4) {
    data[i] = Math.round(data[i] * opacity);
  }

  const png = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();

  return { data: png, width: info.width, height: info.height };
}

/**
 * Applies the tiled watermark to `image` and returns the composited buffer.
 * Any failure (bad logo, unreadable image) is surfaced to the caller so the
 * upload can decide whether to fail or continue unwatermarked.
 */
export async function applyWatermark(
  image: Buffer,
  config: WatermarkConfig
): Promise<Buffer> {
  const base = sharp(image, { failOn: "none" });
  const meta = await base.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) throw new Error("Could not read image dimensions.");

  const shorterSide = Math.min(width, height);
  const desiredTileWidth = Math.max(
    48,
    Math.min(Math.round(shorterSide * config.scale), Math.round(width * 0.7))
  );

  const tile = await buildTile(
    config.logo,
    desiredTileWidth,
    config.rotation,
    config.opacity
  );

  // A rotated tile can exceed the frame; shrink it until it fits.
  let placedTile = tile;
  if (tile.width > width || tile.height > height) {
    const shrink = Math.min(width / tile.width, height / tile.height) * 0.9;
    placedTile = await buildTile(
      config.logo,
      Math.max(32, Math.round(desiredTileWidth * shrink)),
      config.rotation,
      config.opacity
    );
  }

  const anchors = anchorsFor(config.repetitions, width, height);
  const maxLeft = Math.max(0, width - placedTile.width);
  const maxTop = Math.max(0, height - placedTile.height);

  const overlays = anchors.map(([fx, fy]) => ({
    input: placedTile.data,
    left: Math.round(clamp(fx * width - placedTile.width / 2, 0, maxLeft)),
    top: Math.round(clamp(fy * height - placedTile.height / 2, 0, maxTop)),
    blend: "over" as const,
  }));

  return sharp(image, { failOn: "none" }).composite(overlays).toBuffer();
}
