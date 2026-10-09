/** Display an admin-entered design number the way the catalogue labels it. */
export function formatDesignLabel(raw: string): string {
  const cleaned = raw.trim();
  if (!cleaned) return "";
  const withoutPrefix = cleaned.replace(/^sd[\s._-]*/i, "");
  return `SD ${withoutPrefix}`;
}

export function designNumberValue(raw: string): number | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  const value = Number.parseInt(digits, 10);
  return Number.isFinite(value) ? value : null;
}

export type DesignRange = {
  label: string;
  min: number;
  max: number;
};

/**
 * Builds filter chips from the numbers actually in the catalogue, in 50-wide
 * buckets so a new batch of designs grows the bar automatically.
 */
export function buildDesignRanges(numbers: string[]): DesignRange[] {
  const values = numbers
    .map(designNumberValue)
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);
  if (values.length === 0) return [];

  const min = values[0];
  const max = values[values.length - 1];
  const start = Math.floor(min / 50) * 50 || min;
  const ranges: DesignRange[] = [];

  for (let cursor = start; cursor <= max; cursor += 50) {
    const lo = cursor;
    const hi = cursor + 49;
    if (values.some((value) => value >= lo && value <= hi)) {
      ranges.push({ label: `${lo}–${hi}`, min: lo, max: hi });
    }
  }
  return ranges;
}
