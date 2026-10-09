/** URL-safe slug helpers used for SEO-friendly category and product paths. */

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Products are addressed as `/product/design-1025`, so the design number drives
 * the slug with the name as a readable suffix.
 */
export function productSlug(designNumber: string, name: string): string {
  const number = slugify(designNumber);
  const base = number ? `design-${number}` : slugify(name);
  return base || "design";
}

/** Appends `-2`, `-3`, … until the slug is unique. */
export async function uniqueSlug(
  base: string,
  exists: (candidate: string) => Promise<boolean>
): Promise<string> {
  const seed = base || "item";
  if (!(await exists(seed))) return seed;
  for (let suffix = 2; suffix < 500; suffix += 1) {
    const candidate = `${seed}-${suffix}`;
    if (!(await exists(candidate))) return candidate;
  }
  return `${seed}-${Date.now()}`;
}
