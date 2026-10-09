import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { MediaLike } from "@/lib/media";

/**
 * Read model for the public catalog. Every query here is scoped to published
 * records, so unpublished work in progress can never leak to customers.
 */

export const CATALOG_PAGE_SIZE = 24;

export type CatalogSort = "manual" | "newest" | "oldest" | "designNumber";

export function parseSort(
  value: string | undefined,
  fallback: string
): CatalogSort {
  const candidate = value ?? fallback;
  return candidate === "newest" ||
    candidate === "oldest" ||
    candidate === "designNumber"
    ? candidate
    : "manual";
}

function orderBy(sort: CatalogSort): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "newest":
      return [{ createdAt: "desc" }, { designNumber: "asc" }];
    case "oldest":
      return [{ createdAt: "asc" }, { designNumber: "asc" }];
    case "designNumber":
      return [{ designNumber: "asc" }];
    default:
      return [{ sortOrder: "asc" }, { createdAt: "desc" }];
  }
}

export type CatalogProduct = {
  id: string;
  slug: string;
  designNumber: string;
  name: string;
  categoryName: string | null;
  categorySlug: string | null;
  image: MediaLike | null;
};

const listSelect = {
  id: true,
  slug: true,
  designNumber: true,
  name: true,
  category: { select: { name: true, slug: true, isPublished: true } },
  images: {
    orderBy: [{ isPrimary: "desc" as const }, { sortOrder: "asc" as const }],
    take: 1,
    select: { media: true },
  },
} satisfies Prisma.ProductSelect;

type ListRow = Prisma.ProductGetPayload<{ select: typeof listSelect }>;

function toCatalogProduct(row: ListRow): CatalogProduct {
  // A hidden category must not be named or linked to from a public card, even
  // though its products stay browsable.
  const category = row.category?.isPublished ? row.category : null;
  return {
    id: row.id,
    slug: row.slug,
    designNumber: row.designNumber,
    name: row.name,
    categoryName: category?.name ?? null,
    categorySlug: category?.slug ?? null,
    image: row.images[0]?.media ?? null,
  };
}

export type CatalogQuery = {
  q?: string;
  categorySlug?: string;
  sort?: CatalogSort;
  page?: number;
  pageSize?: number;
};

function whereFor(query: CatalogQuery): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { isPublished: true };

  if (query.categorySlug) {
    where.category = { slug: query.categorySlug, isPublished: true };
  }

  const term = query.q?.trim();
  if (term) {
    // SQLite's LIKE is case-insensitive for ASCII, which covers design numbers,
    // product names and tags.
    where.OR = [
      { designNumber: { contains: term } },
      { name: { contains: term } },
      { tags: { contains: term } },
      { description: { contains: term } },
      { category: { name: { contains: term }, isPublished: true } },
    ];
  }

  return where;
}

export async function findCatalogProducts(query: CatalogQuery): Promise<{
  products: CatalogProduct[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const pageSize = query.pageSize ?? CATALOG_PAGE_SIZE;
  const page = Math.max(1, query.page ?? 1);
  const where = whereFor(query);

  const [total, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: orderBy(query.sort ?? "manual"),
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: listSelect,
    }),
  ]);

  return {
    products: rows.map(toCatalogProduct),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  productCount: number;
  image: MediaLike | null;
};

export async function findPublishedCategories(): Promise<CatalogCategory[]> {
  const categories = await prisma.category.findMany({
    where: { isPublished: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      image: true,
      _count: { select: { products: { where: { isPublished: true } } } },
    },
  });

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    productCount: category._count.products,
    image: category.image,
  }));
}

export async function findPublishedCategoryBySlug(slug: string) {
  return prisma.category.findFirst({
    where: { slug, isPublished: true },
    include: {
      image: true,
      _count: { select: { products: { where: { isPublished: true } } } },
    },
  });
}

export type ProductSpec = { label: string; value: string };

export type ProductDetail = {
  id: string;
  slug: string;
  designNumber: string;
  name: string;
  description: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  tags: string[];
  specs: ProductSpec[];
  images: MediaLike[];
  updatedAt: Date;
};

function parseJsonArray<T>(raw: string, map: (entry: unknown) => T | null): T[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((entry) => {
      const mapped = map(entry);
      return mapped === null ? [] : [mapped];
    });
  } catch {
    return [];
  }
}

export async function findPublishedProductBySlug(
  slug: string
): Promise<ProductDetail | null> {
  const product = await prisma.product.findFirst({
    where: { slug, isPublished: true },
    include: {
      category: { select: { name: true, slug: true, isPublished: true } },
      images: {
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
        select: { media: true },
      },
    },
  });
  if (!product) return null;

  return {
    id: product.id,
    slug: product.slug,
    designNumber: product.designNumber,
    name: product.name,
    description: product.description,
    // A product in a hidden category stays reachable by its own link, but the
    // category is not advertised.
    categoryName: product.category?.isPublished ? product.category.name : null,
    categorySlug: product.category?.isPublished ? product.category.slug : null,
    tags: parseJsonArray(product.tags, (entry) =>
      typeof entry === "string" && entry.trim() ? entry : null
    ),
    specs: parseJsonArray(product.specs, (entry) => {
      if (!entry || typeof entry !== "object") return null;
      const { label, value } = entry as Record<string, unknown>;
      if (typeof label !== "string" || typeof value !== "string") return null;
      if (!label.trim() || !value.trim()) return null;
      return { label, value };
    }),
    images: product.images.map(({ media }) => media),
    updatedAt: product.updatedAt,
  };
}

/** A few more designs to show at the bottom of a product page. */
export async function findRelatedProducts(
  product: { id: string; categorySlug: string | null },
  take = 6
): Promise<CatalogProduct[]> {
  const sameCategory = product.categorySlug
    ? await prisma.product.findMany({
        where: {
          isPublished: true,
          id: { not: product.id },
          category: { slug: product.categorySlug, isPublished: true },
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        take,
        select: listSelect,
      })
    : [];

  if (sameCategory.length >= take) {
    return sameCategory.map(toCatalogProduct);
  }

  const filler = await prisma.product.findMany({
    where: {
      isPublished: true,
      id: { notIn: [product.id, ...sameCategory.map((row) => row.id)] },
    },
    orderBy: [{ createdAt: "desc" }],
    take: take - sameCategory.length,
    select: listSelect,
  });

  return [...sameCategory, ...filler].map(toCatalogProduct);
}

export async function catalogCounts() {
  const [products, categories] = await Promise.all([
    prisma.product.count({ where: { isPublished: true } }),
    prisma.category.count({ where: { isPublished: true } }),
  ]);
  return { products, categories };
}
