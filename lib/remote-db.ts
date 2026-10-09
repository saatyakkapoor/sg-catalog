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

export type RemoteCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageId: string | null;
  image: RemoteMedia | null;
  sortOrder: number;
  isPublished: boolean;
  productCount: number;
};

export type RemoteProduct = {
  id: string;
  designNumber: string;
  name: string;
  slug: string;
  description: string | null;
  tags: string[];
  specs: Array<{ label: string; value: string }>;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  sortOrder: number;
  isPublished: boolean;
  createdAt: string;
  imageIds: string[];
  images: RemoteMedia[];
  coverUrl: string | null;
};

export type RemoteSettings = {
  id: string;
  businessName: string;
  tagline: string | null;
  logoId: string | null;
  logo: RemoteMedia | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  footerText: string | null;
  whatsappNumber: string;
  whatsappGeneralMessage: string;
  whatsappProductMessage: string;
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
  watermarkRotation: number;
  watermarkRepetitions: number;
  siteTitle: string;
  siteDescription: string;
  defaultSort: string;
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
      return {
        id: item.id,
        name: str(data.name),
        slug: str(data.slug),
        description: str(data.description) || null,
        imageId,
        image: imageId ? mediaMap.get(imageId) ?? null : null,
        sortOrder: num(data.sortOrder),
        isPublished: bool(data.isPublished, true),
        productCount: counts.get(item.id) ?? 0,
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
  imageId?: string;
  isPublished: boolean;
}): Promise<RemoteCategory> {
  const existing = await listCategories();
  const id = input.id ?? newId("cat");
  const current = existing.find((item) => item.id === id);
  const slug = await uniqueSlug(slugify(input.slug || input.name), async (candidate) =>
    existing.some((item) => item.slug === candidate && item.id !== id)
  );
  const record = {
    name: input.name.trim(),
    slug,
    description: input.description?.trim() || null,
    imageId: input.imageId || null,
    isPublished: input.isPublished,
    sortOrder: current?.sortOrder ?? existing.length + 1,
  };
  await setDoc(doc(db(), "sg_categories", id), record, { merge: true });
  const image = record.imageId ? await getMedia(record.imageId) : null;
  return {
    id,
    ...record,
    image,
    productCount: current?.productCount ?? 0,
  };
}

export async function deleteCategory(
  id: string,
  strategy: "move" | "deleteProducts" | "unassign",
  targetCategoryId?: string
): Promise<void> {
  const products = await listProducts({ includeHidden: true });
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
      return {
        id: item.id,
        designNumber: str(data.designNumber),
        name: str(data.name),
        slug: str(data.slug),
        description: str(data.description) || null,
        tags: parseJsonArray(data.tags, (tag) => (typeof tag === "string" ? tag : null)),
        specs: parseJsonArray(data.specs, (entry) => {
          const rec = asRecord(entry);
          return str(rec.label) && str(rec.value) ? { label: str(rec.label), value: str(rec.value) } : null;
        }),
        categoryId: str(data.categoryId) || null,
        categoryName: publishedCategory?.name ?? null,
        categorySlug: publishedCategory?.slug ?? null,
        sortOrder: num(data.sortOrder),
        isPublished: bool(data.isPublished, true),
        createdAt: str(data.createdAt) || "",
        imageIds,
        images: imageIds.map((id) => mediaMap.get(id)).filter((item): item is RemoteMedia => Boolean(item)),
        coverUrl: str(data.coverUrl) || null,
      };
    })
    .filter((product) => (options?.includeHidden ? true : product.isPublished))
    .filter((product) =>
      options?.categorySlug ? product.categorySlug === options.categorySlug : true
    )
    .sort((a, b) => a.sortOrder - b.sortOrder || a.designNumber.localeCompare(b.designNumber, undefined, { numeric: true }));
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
  return productsFromSnaps(productSnap, categorySnap, mediaSnap, options);
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
    onChange(
      productsFromSnaps(
        productSnap,
        categorySnap,
        mediaSnap,
        options
      )
    );
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
  name: string;
  description?: string;
  categoryId?: string;
  tags: string[];
  specs: Array<{ label: string; value: string }>;
  imageIds: string[];
  isPublished: boolean;
  coverUrl?: string | null;
}): Promise<RemoteProduct> {
  const products = await listProducts({ includeHidden: true });
  const id = input.id ?? newId("prd");
  const current = products.find((item) => item.id === id);
  if (
    products.some(
      (item) => item.designNumber === input.designNumber.trim() && item.id !== id
    )
  ) {
    throw new Error(`Design No. ${input.designNumber} is already used.`);
  }
  const slug =
    current && current.designNumber === input.designNumber.trim()
      ? current.slug
      : await uniqueSlug(productSlug(input.designNumber, input.name), async (candidate) =>
          products.some((item) => item.slug === candidate && item.id !== id)
        );

  const record = {
    designNumber: input.designNumber.trim(),
    name: input.name.trim(),
    slug,
    description: input.description?.trim() || null,
    categoryId: input.categoryId || null,
    tags: input.tags,
    specs: input.specs,
    imageIds: input.imageIds,
    isPublished: input.isPublished,
    coverUrl: input.coverUrl ?? current?.coverUrl ?? null,
    sortOrder: current?.sortOrder ?? products.length + 1,
    createdAt: current?.createdAt || new Date().toISOString(),
  };
  await setDoc(doc(db(), "sg_products", id), record, { merge: true });
  const saved = (await listProducts({ includeHidden: true })).find((item) => item.id === id);
  if (!saved) throw new Error("Could not save the product.");
  return saved;
}

export async function deleteProduct(id: string): Promise<void> {
  await deleteDoc(doc(db(), "sg_products", id));
}

export async function getSettings(): Promise<RemoteSettings> {
  const snap = await getDoc(doc(db(), "sg_settings", "site"));
  const data = snap.exists() ? asRecord(snap.data()) : {};
  const logoId = str(data.logoId) || null;
  const watermarkLogoId = str(data.watermarkLogoId) || null;
  const media = await loadMediaMap([logoId ?? "", watermarkLogoId ?? ""]);
  return {
    id: "site",
    businessName: str(data.businessName, "Shagun Digital"),
    tagline: str(data.tagline) || null,
    logoId,
    logo: logoId ? media.get(logoId) ?? null : null,
    address: str(data.address) || null,
    phone: str(data.phone) || null,
    email: str(data.email) || null,
    footerText: str(data.footerText) || null,
    whatsappNumber: str(data.whatsappNumber),
    whatsappGeneralMessage: str(
      data.whatsappGeneralMessage,
      "Hello, I would like to make an enquiry regarding your designs."
    ),
    whatsappProductMessage: str(
      data.whatsappProductMessage,
      "Hello, I am interested in your product.\n\nProduct: {productName}\nDesign No.: {designNumber}\nCategory: {categoryName}"
    ),
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
    watermarkOpacity: num(data.watermarkOpacity, 0.18),
    watermarkScale: num(data.watermarkScale, 0.22),
    watermarkRotation: num(data.watermarkRotation, -30),
    watermarkRepetitions: num(data.watermarkRepetitions, 4),
    siteTitle: str(data.siteTitle, "Print Design Catalogue"),
    siteDescription: str(data.siteDescription, "Browse our catalog and enquire on WhatsApp."),
    defaultSort: str(data.defaultSort, "designNumber"),
  };
}

export async function saveSettings(input: Partial<RemoteSettings>): Promise<void> {
  const { logo, watermarkLogo, id, ...rest } = input;
  await setDoc(doc(db(), "sg_settings", "site"), rest, { merge: true });
}

export async function fileToVariants(
  file: File,
  kind: "product" | "logo"
): Promise<{
  width: number;
  height: number;
  bytes: number;
  variants: Record<string, string>;
  originalData: string;
}> {
  const bitmap = await createImageBitmap(file);
  const max = kind === "logo" ? 640 : 900;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const draw = (w: number, quality: number) => {
    const canvas = document.createElement("canvas");
    const ratio = w / width;
    canvas.width = Math.max(1, Math.round(width * Math.min(1, ratio)));
    canvas.height = Math.max(1, Math.round(height * Math.min(1, ratio)));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process the image.");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/webp", quality);
  };

  const detail = draw(kind === "logo" ? width : 900, 0.72);
  const card = kind === "logo" ? detail : draw(560, 0.7);
  const thumb = draw(280, 0.65);
  return {
    width,
    height,
    bytes: Math.round((detail.length * 3) / 4),
    variants: { detail, card, thumb },
    originalData: card,
  };
}
