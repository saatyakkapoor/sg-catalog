export type ClientWatermarkSettings = {
  enabled: boolean;
  logoSrc: string | null;
  opacity: number;
  scale: number;
  spacing: number;
  rotation: number;
};

export const WATERMARK_DEFAULTS: Omit<ClientWatermarkSettings, "logoSrc"> = {
  enabled: true,
  opacity: 0.16,
  scale: 0.18,
  spacing: 0.08,
  rotation: -28,
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read that image."));
    image.src = src;
  });
}

function drawSized(
  source: CanvasImageSource,
  width: number,
  height: number,
  quality: number
): string {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process the image.");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/webp", quality);
}

export async function fileToCleanVariants(file: File, kind: "product" | "logo") {
  const bitmap = await createImageBitmap(file);
  const max = kind === "logo" ? 720 : 1100;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const original = drawSized(bitmap, width, height, kind === "logo" ? 0.92 : 0.82);
  const detail = drawSized(bitmap, Math.min(width, 900), Math.min(height, Math.round((900 / width) * height)), 0.74);
  const card = kind === "logo" ? detail : drawSized(bitmap, 560, Math.round((560 / width) * height), 0.7);
  const thumb = drawSized(bitmap, 280, Math.round((280 / width) * height), 0.65);
  return {
    width,
    height,
    bytes: Math.round((original.length * 3) / 4),
    variants: { original, detail, card, thumb },
    originalData: original,
  };
}

export async function applyLogoGridWatermark(
  imageSrc: string,
  settings: ClientWatermarkSettings
): Promise<string> {
  if (!settings.enabled || !settings.logoSrc) return imageSrc;

  const [image, logo] = await Promise.all([
    loadImage(imageSrc),
    loadImage(settings.logoSrc),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not draw the watermark.");

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  const shorter = Math.min(canvas.width, canvas.height);
  const tileW = Math.max(36, Math.round(shorter * clamp(settings.scale, 0.06, 0.45)));
  const tileH = Math.max(24, Math.round((logo.naturalHeight / logo.naturalWidth) * tileW));
  const gap = Math.max(12, Math.round(shorter * clamp(settings.spacing, 0.02, 0.3)));
  const stepX = tileW + gap;
  const stepY = tileH + gap;
  const pad = Math.max(canvas.width, canvas.height);

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((clamp(settings.rotation, -80, 80) * Math.PI) / 180);
  ctx.translate(-canvas.width / 2, -canvas.height / 2);
  ctx.globalAlpha = clamp(settings.opacity, 0.04, 0.45);
  ctx.imageSmoothingEnabled = true;

  for (let y = -pad; y < canvas.height + pad; y += stepY) {
    for (let x = -pad; x < canvas.width + pad; x += stepX) {
      ctx.drawImage(logo, x, y, tileW, tileH);
    }
  }
  ctx.restore();

  return canvas.toDataURL("image/webp", 0.74);
}

export async function watermarkVariants(
  originalSrc: string,
  settings: ClientWatermarkSettings
): Promise<Record<string, string>> {
  const marked = await applyLogoGridWatermark(originalSrc, settings);
  const image = await loadImage(marked);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  return {
    original: originalSrc,
    detail: marked,
    card: drawSized(image, Math.min(560, width), Math.round((Math.min(560, width) / width) * height), 0.7),
    thumb: drawSized(image, Math.min(280, width), Math.round((Math.min(280, width) / width) * height), 0.65),
  };
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
