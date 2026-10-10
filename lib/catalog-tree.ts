import { mediaSrc, parseVariants } from "@/lib/media";
import type { RemoteCategory, RemoteMedia, RemoteProduct, RemoteSettings } from "@/lib/remote-db";
import {
  WATERMARK_DEFAULTS,
  type ClientWatermarkSettings,
} from "@/lib/watermark-client";

export type CatalogKind = "category" | "brand" | "model";

export function nodeKind(node: Pick<RemoteCategory, "kind"> | null | undefined): CatalogKind {
  return node?.kind === "brand" || node?.kind === "model" ? node.kind : "category";
}

export function ancestorsOf(
  nodeId: string | null | undefined,
  nodes: RemoteCategory[]
): RemoteCategory[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const chain: RemoteCategory[] = [];
  const seen = new Set<string>();
  let current = nodeId ? byId.get(nodeId) : undefined;
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    chain.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return chain;
}

export function descendantsOf(nodeId: string, nodes: RemoteCategory[]): RemoteCategory[] {
  const children = nodes.filter((node) => node.parentId === nodeId);
  return children.flatMap((child) => [child, ...descendantsOf(child.id, nodes)]);
}

export function productMatchesNode(
  product: RemoteProduct,
  node: RemoteCategory,
  nodes: RemoteCategory[]
): boolean {
  const ids = new Set([
    product.categoryId,
    ...ancestorsOf(product.categoryId, nodes).map((item) => item.id),
    ...descendantsOf(node.id, nodes).map((item) => item.id),
  ]);
  return ids.has(node.id) || product.categorySlug === node.slug;
}

export function pathLabel(product: RemoteProduct, nodes: RemoteCategory[]): string {
  const chain = ancestorsOf(product.categoryId, nodes);
  if (chain.length === 0) {
    return [product.categoryName, product.brandName, product.modelName]
      .filter(Boolean)
      .join(" / ");
  }
  return chain.map((node) => node.name).join(" / ");
}

export function roots(nodes: RemoteCategory[]): RemoteCategory[] {
  return nodes
    .filter((node) => !node.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export function childrenOf(parentId: string | null, nodes: RemoteCategory[]): RemoteCategory[] {
  return nodes
    .filter((node) => (parentId ? node.parentId === parentId : !node.parentId))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export function wouldCreateCycle(
  nodeId: string,
  nextParentId: string | null,
  nodes: RemoteCategory[]
): boolean {
  if (!nextParentId) return false;
  if (nextParentId === nodeId) return true;
  return ancestorsOf(nextParentId, nodes).some((node) => node.id === nodeId);
}

function logoSrc(media: RemoteMedia | null | undefined): string | null {
  if (!media) return null;
  return (
    parseVariants(media.variants).original ||
    mediaSrc(media, "detail") ||
    mediaSrc(media, "card")
  );
}

export function effectiveWatermark(
  product: Pick<RemoteProduct, "categoryId" | "watermarkOverride"> | null,
  nodes: RemoteCategory[],
  settings: RemoteSettings
): ClientWatermarkSettings {
  const override = product?.watermarkOverride;
  if (override && override.inherit === false) {
    return {
      enabled: override.enabled,
      logoSrc: logoSrc(override.logo) || logoSrc(settings.watermarkLogo) || logoSrc(settings.logo),
      opacity: override.opacity ?? settings.watermarkOpacity,
      scale: override.scale ?? settings.watermarkScale,
      spacing: override.spacing ?? settings.watermarkSpacing,
      rotation: override.rotation ?? settings.watermarkRotation,
    };
  }

  const chain = ancestorsOf(product?.categoryId, nodes).reverse();
  for (const node of chain) {
    if (node.watermarkInherit !== false) continue;
    return {
      enabled: node.watermarkEnabled,
      logoSrc: logoSrc(node.watermarkLogo) || logoSrc(node.logo) || logoSrc(settings.watermarkLogo) || logoSrc(settings.logo),
      opacity: node.watermarkOpacity ?? settings.watermarkOpacity,
      scale: node.watermarkScale ?? settings.watermarkScale,
      spacing: node.watermarkSpacing ?? settings.watermarkSpacing,
      rotation: node.watermarkRotation ?? settings.watermarkRotation,
    };
  }

  return {
    enabled: settings.watermarkEnabled,
    logoSrc: logoSrc(settings.watermarkLogo) || logoSrc(settings.logo),
    opacity: settings.watermarkOpacity ?? WATERMARK_DEFAULTS.opacity,
    scale: settings.watermarkScale ?? WATERMARK_DEFAULTS.scale,
    spacing: settings.watermarkSpacing ?? WATERMARK_DEFAULTS.spacing,
    rotation: settings.watermarkRotation ?? WATERMARK_DEFAULTS.rotation,
  };
}

export function originalImageSrc(media: RemoteMedia | null | undefined): string | null {
  if (!media) return null;
  const variants = parseVariants(media.variants);
  return variants.original || media.originalData || mediaSrc(media, "detail") || mediaSrc(media, "card");
}
