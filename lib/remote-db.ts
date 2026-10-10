import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  type Query,
  type QuerySnapshot,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase-web";
import { productSlug, slugify, uniqueSlug } from "@/lib/slug";
import type { MediaLike } from "@/lib/media";

export type RemoteMedia = MediaLike & {
  originalName: string;
  bytes: number;
  originalData?: string | null;
  createdAt?: string;
};

export type CatalogKind = "category" | "brand" | "model";

export type WatermarkOverride = {
  inherit: boolean;
  enabled: boolean;
  logoId: string | null;
  logo?: RemoteMedia | null;
  opacity?: number;
  scale?: number;
  spacing?: number;
  rotation?: number;
};

export type RemoteCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  kind: CatalogKind;
  imageId: string | null;
  logoId: string | null;
  image: RemoteMedia | null;
  logo: RemoteMedia | null;
  sortOrder: number;
  isPublished: boolean;
  productCount: number;
  seoTitle: string | null;
  seoDescription: string | null;
  watermarkInherit: boolean;
  watermarkEnabled: boolean;
  watermarkLogoId: string | null;
  watermarkLogo: RemoteMedia | null;
  watermarkOpacity: number | null;
  watermarkScale: number | null;
  watermarkSpacing: number | null;
  watermarkRotation: number | null;
};

export type RemoteProduct = {
  id: string;
  designNumber: string;
  name: string;
  slug: string;
  description: string | null;
  tags: string[];
  sizes: string[];
  specs: Array<{ label: string; value: string }>;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  brandName: string | null;
  modelName: string | null;
  sortOrder: number;
  isPublished: boolean;
  createdAt: string;
  imageIds: string[];
  images: RemoteMedia[];
  coverUrl: string | null;
  originalCoverUrl: string | null;
  watermarkStatus: "none" | "ready" | "pending" | "error";
  watermarkError: string | null;
  watermarkRevision: string | null;
  watermarkOverride: WatermarkOverride | null;
};

export type RemoteSettings = {
  id: string;
  businessName: string;
  tagline: string | null;
  logoId: string | null;
  logo: RemoteMedia | null;
  faviconId: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  footerText: string | null;
  whatsappNumber: string;
  whatsappGeneralMessage: string;
  whatsappProductMessage: string;
  enquiryButtonLabel: string;
  mapEmbedUrl: string | null;
  mapLink: string | null;
  latitude: number | null;
  longitude: number | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  youtubeUrl: string | null;
  twitterUrl: string | null;
  linkedinUrl: string | null;
  watermarkEnabled: boolean;
  watermarkLogoId: string | null;
  watermarkLogo: RemoteMedia | null;
  watermarkOpacity: number;
  watermarkScale: number;
  watermarkSpacing: number;
  watermarkRotation: number;
  watermarkRepetitions: number;
  watermarkRevision: string;
  siteTitle: string;
  siteDescription: string;
  homepageHeading: string;
  homepageIntro: string;
  aboutText: string;
  navCatalogLabel: string;
  navContactLabel: string;
  defaultSort: string;
};

export type AuditEntry = {
  id: string;
  at: string;
  action: string;
  detail: string;
};

function db() {
  return getFirebaseDb();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export function parseJsonArray<T>(raw: unknown, map: (item: unknown) => T | null): T[] {
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw.map(map).filter((item): item is T => item !== null);
}

export function toMedia(id: string, data: Record<string, unknown>): RemoteMedia {
  return {
    id,
    filename: str(data.filename, id),
    mimeType: str(data.mimeType, "image/webp"),
    kind: str(data.kind, "product"),
    width: num(data.width),
    height: num(data.height),
    variants: typeof data.variants === "string" ? data.variants : JSON.stringify(data.variants ?? {}),
    alt: str(data.alt) || null,
    originalName: str(data.originalName, str(data.filename, id)),
    bytes: num(data.bytes),
    originalData: str(data.originalData) || null,
    createdAt: str(data.createdAt) || undefined,
  };
}

async function loadMediaMap(ids: string[]): Promise<Map<string, RemoteMedia>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const entries = await Promise.all(
    unique.map(async (id) => {
      const snap = await getDoc(doc(db(), "sg_media", id));
      return snap.exists() ? ([id, toMedia(id, asRecord(snap.data()))] as const) : null;
    })
  );
  return new Map(entries.filter((entry): entry is readonly [string, RemoteMedia] => Boolean(entry)));
}

export async function listMedia(): Promise<RemoteMedia[]> {
  const snap = await getDocs(collection(db(), "sg_media"));
  return snap.docs
    .map((item) => toMedia(item.id, asRecord(item.data())))
    .sort((a, b) => str(b.createdAt).localeCompare(str(a.createdAt)));
}

export async function getMedia(id: string): Promise<RemoteMedia | null> {
  const snap = await getDoc(doc(db(), "sg_media", id));
  return snap.exists() ? toMedia(id, asRecord(snap.data())) : null;
}

export async function saveMedia(media: RemoteMedia & { originalData?: string | null }): Promise<void> {
  await setDoc(doc(db(), "sg_media", media.id), {
    filename: media.filename,
    originalName: media.originalName,
    mimeType: media.mimeType,
    kind: media.kind,
    width: media.width,
    height: media.height,
    bytes: media.bytes,
    variants: media.variants,
    alt: media.alt ?? null,
    originalData: media.originalData ?? null,
    createdAt: media.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export async function removeMedia(id: string): Promise<void> {
  await deleteDoc(doc(db(), "sg_media", id));
}

export async function listCategories(publishedOnly = false): Promise<RemoteCategory[]> {
  const [cats, products, media] = await Promise.all([
    getDocs(collection(db(), "sg_categories")),
    getDocs(collection(db(), "sg_products")),
    listMedia(),
  ]);
  const mediaMap = new Map(media.map((item) => [item.id, item]));
  const counts = new Map<string, number>();
  for (const product of products.docs) {
    const data = asRecord(product.data());
    if (publishedOnly && !bool(data.isPublished, true)) continue;
    const categoryId = str(data.categoryId);
    if (!categoryId) continue;
    counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1);
  }

  return cats.docs
    .map((item) => {
      const data = asRecord(item.data());
      const imageId = str(data.imageId) || null;
      const logoId = str(data.logoId) || null;
      const watermarkLogoId = str(data.watermarkLogoId) || null;
      const kind = str(data.kind);
      return {
        id: item.id,
        name: str(data.name),
        slug: str(data.slug),
        description: str(data.description) || null,
        parentId: str(data.parentId) || null,
        kind: (kind === "brand" || kind === "model" ? kind : "category") as CatalogKind,
        imageId,
        logoId,
        image: imageId ? mediaMap.get(imageId) ?? null : null,
        logo: logoId ? mediaMap.get(logoId) ?? null : null,
        sortOrder: num(data.sortOrder),
        isPublished: bool(data.isPublished, true),
        productCount: counts.get(item.id) ?? 0,
        seoTitle: str(data.seoTitle) || null,
        seoDescription: str(data.seoDescription) || null,
        watermarkInherit: bool(data.watermarkInherit, true),
        watermarkEnabled: bool(data.watermarkEnabled, true),
        watermarkLogoId,
        watermarkLogo: watermarkLogoId ? mediaMap.get(watermarkLogoId) ?? null : null,
        watermarkOpacity: typeof data.watermarkOpacity === "number" ? data.watermarkOpacity : null,
        watermarkScale: typeof data.watermarkScale === "number" ? data.watermarkScale : null,
        watermarkSpacing: typeof data.watermarkSpacing === "number" ? data.watermarkSpacing : null,
        watermarkRotation: typeof data.watermarkRotation === "number" ? data.watermarkRotation : null,
      };
    })
    .filter((item) => (publishedOnly ? item.isPublished : true))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export async function saveCategory(input: {
  id?: string;
  name: string;
  slug?: string;
  description?: string;
  parentId?: string | null;
  kind?: CatalogKind;
  imageId?: string | null;
  logoId?: string | null;
  isPublished: boolean;
  seoTitle?: string;
  seoDescription?: string;
  sortOrder?: number;
  watermarkInherit?: boolean;
  watermarkEnabled?: boolean;
  watermarkLogoId?: string | null;
  watermarkOpacity?: number | null;
  watermarkScale?: number | null;
  watermarkSpacing?: number | null;
  watermarkRotation?: number | null;
}): Promise<RemoteCategory> {
  const existing = await listCategories();
  const id = input.id ?? newId("cat");
  const current = existing.find((item) => item.id === id);
  if (input.parentId && input.parentId === id) {
    throw new Error("A collection cannot be nested under itself.");
  }
  const slug = await uniqueSlug(slugify(input.slug || input.name), async (candidate) =>
    existing.some((item) => item.slug === candidate && item.id !== id)
  );
  const record = {
    name: input.name.trim(),
    slug,
    description: input.description?.trim() || null,
    parentId: input.parentId || null,
    kind: input.kind ?? current?.kind ?? "category",
    imageId: input.imageId ?? current?.imageId ?? null,
    logoId: input.logoId ?? current?.logoId ?? null,
    isPublished: input.isPublished,
    seoTitle: input.seoTitle?.trim() || null,
    seoDescription: input.seoDescription?.trim() || null,
    sortOrder: input.sortOrder ?? current?.sortOrder ?? existing.length + 1,
    watermarkInherit: input.watermarkInherit ?? current?.watermarkInherit ?? true,
    watermarkEnabled: input.watermarkEnabled ?? current?.watermarkEnabled ?? true,
    watermarkLogoId: input.watermarkLogoId ?? current?.watermarkLogoId ?? null,
    watermarkOpacity: input.watermarkOpacity ?? current?.watermarkOpacity ?? null,
    watermarkScale: input.watermarkScale ?? current?.watermarkScale ?? null,
    watermarkSpacing: input.watermarkSpacing ?? current?.watermarkSpacing ?? null,
    watermarkRotation: input.watermarkRotation ?? current?.watermarkRotation ?? null,
  };
  await setDoc(doc(db(), "sg_categories", id), record, { merge: true });
  await logAudit("catalogue", `${record.kind} “${record.name}” saved`);
  const saved = (await listCategories()).find((item) => item.id === id);
  if (!saved) throw new Error("Could not save the collection.");
  return saved;
}

export async function deleteCategory(
  id: string,
  strategy: "move" | "deleteProducts" | "unassign",
  targetCategoryId?: string
): Promise<void> {
  const [products, categories] = await Promise.all([
    listProducts({ includeHidden: true }),
    listCategories(),
  ]);
  const children = categories.filter((item) => item.parentId === id);
  if (children.length > 0) {
    throw new Error("Move or delete nested collections first. Products under this item were not changed.");
  }
  const owned = products.filter((product) => product.categoryId === id);
  if (strategy === "move" && targetCategoryId) {
    await Promise.all(
      owned.map((product) => updateDoc(doc(db(), "sg_products", product.id), { categoryId: targetCategoryId }))
    );
  } else if (strategy === "deleteProducts") {
    await Promise.all(owned.map((product) => deleteDoc(doc(db(), "sg_products", product.id))));
  } else {
    await Promise.all(owned.map((product) => updateDoc(doc(db(), "sg_products", product.id), { categoryId: null })));
  }
  await deleteDoc(doc(db(), "sg_categories", id));
  await logAudit("catalogue", `Collection deleted (${owned.length} product(s) ${strategy})`);
}

export async function logAudit(action: string, detail: string): Promise<void> {
  try {
    const id = newId("log");
    await setDoc(doc(db(), "sg_audit", id), {
      at: new Date().toISOString(),
      action,
      detail,
    });
  } catch {
    // Audit is best-effort and must not block saving products or settings.
  }
}

export async function listAudit(limit = 8): Promise<AuditEntry[]> {
  const snap = await getDocs(collection(db(), "sg_audit"));
  return snap.docs
    .map((item) => {
      const data = asRecord(item.data());
      return { id: item.id, at: str(data.at), action: str(data.action), detail: str(data.detail) };
    })
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);
}

function productsFromSnaps(
  productSnap: QuerySnapshot,
  categorySnap: QuerySnapshot | null,
  mediaSnap: QuerySnapshot | null,
  options?: { includeHidden?: boolean; categorySlug?: string }
): RemoteProduct[] {
  const mediaMap = new Map(
    (mediaSnap?.docs ?? []).map((item) => [item.id, toMedia(item.id, asRecord(item.data()))])
  );
  const categoryMap = new Map(
    (categorySnap?.docs ?? []).map((item) => {
      const data = asRecord(item.data());
      return [
        item.id,
        {
          isPublished: bool(data.isPublished, true),
          name: str(data.name),
          slug: str(data.slug),
        },
      ] as const;
    })
  );

  return productSnap.docs
    .map((item) => {
      const data = asRecord(item.data());
      const imageIds = parseJsonArray(data.imageIds ?? data.images, (entry) =>
        typeof entry === "string" ? entry : null
      );
      const category = categoryMap.get(str(data.categoryId));
      const publishedCategory = category?.isPublished ? category : null;
      const sizes = parseJsonArray(data.sizes ?? data.tags, (tag) =>
        typeof tag === "string" && tag.trim() ? tag.trim() : null
      );
      const overrideRaw = asRecord(data.watermarkOverride);
      return {
        id: item.id,
        designNumber: str(data.designNumber),
        name: str(data.name) || str(data.designNumber),
        slug: str(data.slug),
        description: str(data.description) || null,
        tags: parseJsonArray(data.tags, (tag) => (typeof tag === "string" ? tag : null)),
        sizes,
        specs: parseJsonArray(data.specs, (entry) => {
          const rec = asRecord(entry);
          return str(rec.label) && str(rec.value) ? { label: str(rec.label), value: str(rec.value) } : null;
        }),
        categoryId: str(data.categoryId) || null,
        categoryName: publishedCategory?.name ?? (str(data.categoryName) || null),
        categorySlug: publishedCategory?.slug ?? (str(data.categorySlug) || null),
        brandName: str(data.brandName) || null,
        modelName: str(data.modelName) || null,
        sortOrder: num(data.sortOrder),
        isPublished: bool(data.isPublished, true),
        createdAt: str(data.createdAt) || "",
        imageIds,
        images: imageIds.map((id) => mediaMap.get(id)).filter((item): item is RemoteMedia => Boolean(item)),
        coverUrl: str(data.coverUrl) || null,
        originalCoverUrl: str(data.originalCoverUrl) || null,
        watermarkStatus: (
          data.watermarkStatus === "ready" ||
          data.watermarkStatus === "pending" ||
          data.watermarkStatus === "error"
            ? data.watermarkStatus
            : "none"
        ) as RemoteProduct["watermarkStatus"],
        watermarkError: str(data.watermarkError) || null,
        watermarkRevision: str(data.watermarkRevision) || null,
        watermarkOverride: Object.keys(overrideRaw).length
          ? {
              inherit: bool(overrideRaw.inherit, true),
              enabled: bool(overrideRaw.enabled, true),
              logoId: str(overrideRaw.logoId) || null,
              opacity: typeof overrideRaw.opacity === "number" ? overrideRaw.opacity : undefined,
              scale: typeof overrideRaw.scale === "number" ? overrideRaw.scale : undefined,
              spacing: typeof overrideRaw.spacing === "number" ? overrideRaw.spacing : undefined,
              rotation: typeof overrideRaw.rotation === "number" ? overrideRaw.rotation : undefined,
            }
          : null,
      };
    })
    .filter((product) => (options?.includeHidden ? true : product.isPublished))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.designNumber.localeCompare(b.designNumber, undefined, { numeric: true }));
}

function nodesFromSnap(categorySnap: QuerySnapshot | null): RemoteCategory[] {
  return (categorySnap?.docs ?? []).map((item) => {
    const data = asRecord(item.data());
    const kind = str(data.kind);
    return {
      id: item.id,
      name: str(data.name),
      slug: str(data.slug),
      description: str(data.description) || null,
      parentId: str(data.parentId) || null,
      kind: (kind === "brand" || kind === "model" ? kind : "category") as CatalogKind,
      imageId: str(data.imageId) || null,
      logoId: str(data.logoId) || null,
      image: null,
      logo: null,
      sortOrder: num(data.sortOrder),
      isPublished: bool(data.isPublished, true),
      productCount: 0,
      seoTitle: null,
      seoDescription: null,
      watermarkInherit: bool(data.watermarkInherit, true),
      watermarkEnabled: bool(data.watermarkEnabled, true),
      watermarkLogoId: str(data.watermarkLogoId) || null,
      watermarkLogo: null,
      watermarkOpacity: typeof data.watermarkOpacity === "number" ? data.watermarkOpacity : null,
      watermarkScale: typeof data.watermarkScale === "number" ? data.watermarkScale : null,
      watermarkSpacing: typeof data.watermarkSpacing === "number" ? data.watermarkSpacing : null,
      watermarkRotation: typeof data.watermarkRotation === "number" ? data.watermarkRotation : null,
    };
  });
}

function matchesCategorySlug(
  product: RemoteProduct,
  slug: string | undefined,
  categories: RemoteCategory[]
): boolean {
  if (!slug) return true;
  if (product.categorySlug === slug) return true;
  const byId = new Map(categories.map((item) => [item.id, item]));
  const target = categories.find((item) => item.slug === slug);
  if (!target) return false;
  const ids = new Set<string>([target.id]);
  const stack = [target.id];
  while (stack.length) {
    const current = stack.pop()!;
    for (const child of categories) {
      if (child.parentId === current && !ids.has(child.id)) {
        ids.add(child.id);
        stack.push(child.id);
      }
    }
  }
  if (product.categoryId && ids.has(product.categoryId)) return true;
  let walk = product.categoryId ? byId.get(product.categoryId) : undefined;
  const seen = new Set<string>();
  while (walk && !seen.has(walk.id)) {
    seen.add(walk.id);
    if (ids.has(walk.id)) return true;
    walk = walk.parentId ? byId.get(walk.parentId) : undefined;
  }
  return false;
}

function productsRef(includeHidden?: boolean): Query {
  const ref = collection(db(), "sg_products");
  return includeHidden ? ref : query(ref, where("isPublished", "==", true));
}

export async function listProducts(options?: {
  includeHidden?: boolean;
  categorySlug?: string;
}): Promise<RemoteProduct[]> {
  const [productSnap, categorySnap, mediaSnap] = await Promise.all([
    getDocs(productsRef(options?.includeHidden)),
    getDocs(collection(db(), "sg_categories")),
    getDocs(collection(db(), "sg_media")),
  ]);
  const nodes = nodesFromSnap(categorySnap);
  const products = decorateProducts(
    productsFromSnaps(productSnap, categorySnap, mediaSnap, options),
    nodes
  );
  return products.filter((product) => matchesCategorySlug(product, options?.categorySlug, nodes));
}

function decorateProducts(products: RemoteProduct[], categories: RemoteCategory[]): RemoteProduct[] {
  const byId = new Map(categories.map((item) => [item.id, item]));
  return products.map((product) => {
    const chain: RemoteCategory[] = [];
    const seen = new Set<string>();
    let current = product.categoryId ? byId.get(product.categoryId) : undefined;
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      chain.unshift(current);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    const published = chain.filter((item) => item.isPublished);
    const brand = [...published].reverse().find((item) => item.kind === "brand");
    const model = [...published].reverse().find((item) => item.kind === "model");
    const leaf = published[published.length - 1] ?? null;
    return {
      ...product,
      categoryName: leaf?.name ?? product.categoryName,
      categorySlug: leaf?.slug ?? product.categorySlug,
      brandName: brand?.name ?? product.brandName,
      modelName: model?.name ?? product.modelName,
    };
  });
}

export function subscribeProducts(
  options: { includeHidden?: boolean; categorySlug?: string } | undefined,
  onChange: (products: RemoteProduct[]) => void,
  onError?: (error: Error) => void
): () => void {
  let productSnap: QuerySnapshot | null = null;
  let categorySnap: QuerySnapshot | null = null;
  let mediaSnap: QuerySnapshot | null = null;

  const emit = () => {
    if (!productSnap) return;
    const nodes = nodesFromSnap(categorySnap);
    const products = decorateProducts(
      productsFromSnaps(productSnap, categorySnap, mediaSnap, options),
      nodes
    );
    onChange(products.filter((product) => matchesCategorySlug(product, options?.categorySlug, nodes)));
  };

  const handleError = (error: Error) => {
    console.error("[catalog]", error);
    onError?.(error);
  };
  const unsubProducts = onSnapshot(
    productsRef(options?.includeHidden),
    (snap) => {
      productSnap = snap;
      emit();
    },
    handleError
  );
  const unsubCategories = onSnapshot(
    collection(db(), "sg_categories"),
    (snap) => {
      categorySnap = snap;
      emit();
    },
    handleError
  );
  const unsubMedia = onSnapshot(
    collection(db(), "sg_media"),
    (snap) => {
      mediaSnap = snap;
      emit();
    },
    handleError
  );

  return () => {
    unsubProducts();
    unsubCategories();
    unsubMedia();
  };
}

export async function getProductBySlug(slug: string): Promise<RemoteProduct | null> {
  const products = await listProducts({ includeHidden: true });
  return products.find((product) => product.slug === slug) ?? null;
}

export async function saveProduct(input: {
  id?: string;
  designNumber: string;
  name?: string;
  description?: string;
  categoryId?: string;
  sizes?: string[];
  specs?: Array<{ label: string; value: string }>;
  imageIds: string[];
  isPublished: boolean;
  coverUrl?: string | null;
  originalCoverUrl?: string | null;
  watermarkStatus?: RemoteProduct["watermarkStatus"];
  watermarkError?: string | null;
  watermarkRevision?: string | null;
  watermarkOverride?: WatermarkOverride | null;
}): Promise<RemoteProduct> {
  const products = await listProducts({ includeHidden: true });
  const id = input.id ?? newId("prd");
  const current = products.find((item) => item.id === id);
  const designNumber = input.designNumber.trim();
  if (!designNumber) throw new Error("Enter a design number.");
  if (products.some((item) => item.designNumber === designNumber && item.id !== id)) {
    throw new Error(`Design ${designNumber} is already used.`);
  }
  const slug =
    current && current.designNumber === designNumber
      ? current.slug
      : await uniqueSlug(productSlug(designNumber, designNumber), async (candidate) =>
          products.some((item) => item.slug === candidate && item.id !== id)
        );

  const record = {
    designNumber,
    name: designNumber,
    slug,
    description: input.description?.trim() || null,
    categoryId: input.categoryId || null,
    sizes: (input.sizes ?? current?.sizes ?? []).map((item) => item.trim()).filter(Boolean),
    tags: [],
    specs: input.specs ?? current?.specs ?? [],
    imageIds: input.imageIds,
    isPublished: input.isPublished,
    coverUrl: input.coverUrl ?? current?.coverUrl ?? null,
    originalCoverUrl: input.originalCoverUrl ?? current?.originalCoverUrl ?? null,
    watermarkStatus: input.watermarkStatus ?? current?.watermarkStatus ?? "none",
    watermarkError: input.watermarkError ?? current?.watermarkError ?? null,
    watermarkRevision: input.watermarkRevision ?? current?.watermarkRevision ?? null,
    watermarkOverride: input.watermarkOverride ?? current?.watermarkOverride ?? null,
    sortOrder: current?.sortOrder ?? products.length + 1,
    createdAt: current?.createdAt || new Date().toISOString(),
  };
  await setDoc(doc(db(), "sg_products", id), record, { merge: true });
  await logAudit("product", `Design ${designNumber} saved`);
  const saved = (await listProducts({ includeHidden: true })).find((item) => item.id === id);
  if (!saved) throw new Error("Could not save the product.");
  return saved;
}

export async function deleteProduct(id: string): Promise<void> {
  await deleteDoc(doc(db(), "sg_products", id));
  await logAudit("product", `Product ${id} deleted`);
}

export async function getSettings(): Promise<RemoteSettings> {
  const snap = await getDoc(doc(db(), "sg_settings", "site"));
  const data = snap.exists() ? asRecord(snap.data()) : {};
  const logoId = str(data.logoId) || null;
  const faviconId = str(data.faviconId) || null;
  const watermarkLogoId = str(data.watermarkLogoId) || null;
  const media = await loadMediaMap([logoId ?? "", faviconId ?? "", watermarkLogoId ?? ""]);
  return {
    id: "site",
    businessName: str(data.businessName, "A.S. Exports"),
    tagline: str(data.tagline) || null,
    logoId,
    logo: logoId ? media.get(logoId) ?? null : null,
    faviconId,
    address: str(data.address) || null,
    phone: str(data.phone) || null,
    email: str(data.email) || null,
    footerText: str(data.footerText) || null,
    whatsappNumber: str(data.whatsappNumber),
    whatsappGeneralMessage: str(
      data.whatsappGeneralMessage,
      "Hello, I would like to make an enquiry."
    ),
    whatsappProductMessage: str(
      data.whatsappProductMessage,
      "Hello, I am interested in this design.\n\nDesign No.: {designNumber}\nCategory: {categoryName}\n{productUrl}"
    ),
    enquiryButtonLabel: str(data.enquiryButtonLabel, "Enquire on WhatsApp"),
    mapEmbedUrl: str(data.mapEmbedUrl) || null,
    mapLink: str(data.mapLink) || null,
    latitude: typeof data.latitude === "number" ? data.latitude : null,
    longitude: typeof data.longitude === "number" ? data.longitude : null,
    instagramUrl: str(data.instagramUrl) || null,
    facebookUrl: str(data.facebookUrl) || null,
    youtubeUrl: str(data.youtubeUrl) || null,
    twitterUrl: str(data.twitterUrl) || null,
    linkedinUrl: str(data.linkedinUrl) || null,
    watermarkEnabled: bool(data.watermarkEnabled, true),
    watermarkLogoId,
    watermarkLogo: watermarkLogoId ? media.get(watermarkLogoId) ?? null : null,
    watermarkOpacity: num(data.watermarkOpacity, 0.16),
    watermarkScale: num(data.watermarkScale, 0.18),
    watermarkSpacing: num(data.watermarkSpacing, 0.08),
    watermarkRotation: num(data.watermarkRotation, -28),
    watermarkRepetitions: num(data.watermarkRepetitions, 4),
    watermarkRevision: str(data.watermarkRevision) || "1",
    siteTitle: str(data.siteTitle, "Product Catalogue"),
    siteDescription: str(data.siteDescription, "Browse our catalog and enquire on WhatsApp."),
    homepageHeading: str(data.homepageHeading, ""),
    homepageIntro: str(data.homepageIntro, ""),
    aboutText: str(data.aboutText, ""),
    navCatalogLabel: str(data.navCatalogLabel, "Catalog"),
    navContactLabel: str(data.navContactLabel, "Contact"),
    defaultSort: str(data.defaultSort, "designNumber"),
  };
}

export async function saveSettings(input: Partial<RemoteSettings>): Promise<void> {
  const { logo, watermarkLogo, id, ...rest } = input;
  await setDoc(doc(db(), "sg_settings", "site"), rest, { merge: true });
  await logAudit("settings", "Website settings updated");
}

export { fileToCleanVariants as fileToVariants } from "@/lib/watermark-client";
