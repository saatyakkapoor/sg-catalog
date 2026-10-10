"use client";

import { useEffect, useMemo, useState } from "react";
import {
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase-web";
import { mediaSrc } from "@/lib/media";
import { childrenOf, effectiveWatermark, originalImageSrc, roots, wouldCreateCycle } from "@/lib/catalog-tree";
import { applyLogoGridWatermark, fileToCleanVariants, watermarkVariants } from "@/lib/watermark-client";
import {
  deleteCategory,
  deleteProduct,
  getSettings,
  listAudit,
  listCategories,
  listMedia,
  listProducts,
  logAudit,
  newId,
  removeMedia,
  saveCategory,
  saveMedia,
  saveProduct,
  saveSettings,
  subscribeProducts,
  type AuditEntry,
  type CatalogKind,
  type RemoteCategory,
  type RemoteMedia,
  type RemoteProduct,
  type RemoteSettings,
} from "@/lib/remote-db";
import {
  ExternalIcon,
  GridIcon,
  HomeIcon,
  ImageIcon,
  LayersIcon,
  LogoutIcon,
  MenuIcon,
  PlusIcon,
  SettingsIcon,
  XIcon,
} from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";

type View =
  | { name: "dashboard" }
  | { name: "login" }
  | { name: "products" }
  | { name: "product"; id?: string }
  | { name: "categories" }
  | { name: "category"; id?: string }
  | { name: "media" }
  | { name: "settings" }
  | { name: "account" };

function parsePath(pathname: string): View {
  const parts = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  if (parts[0] !== "admin") return { name: "dashboard" };
  const [, section, id] = parts;
  if (!section || section === "login") return section === "login" ? { name: "login" } : { name: "dashboard" };
  if (section === "products") return id === "new" ? { name: "product" } : id ? { name: "product", id } : { name: "products" };
  if (section === "categories") return id === "new" ? { name: "category" } : id ? { name: "category", id } : { name: "categories" };
  if (section === "media") return { name: "media" };
  if (section === "settings") return { name: "settings" };
  if (section === "account") return { name: "account" };
  return { name: "dashboard" };
}

function hrefFor(view: View): string {
  switch (view.name) {
    case "login":
      return "/admin/login/";
    case "products":
      return "/admin/products/";
    case "product":
      return view.id ? `/admin/products/${view.id}/` : "/admin/products/new/";
    case "categories":
      return "/admin/categories/";
    case "category":
      return view.id ? `/admin/categories/${view.id}/` : "/admin/categories/new/";
    case "media":
      return "/admin/media/";
    case "settings":
      return "/admin/settings/";
    case "account":
      return "/admin/account/";
    default:
      return "/admin/";
  }
}

function go(href: string) {
  window.history.pushState({}, "", href);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function authMessage(error: unknown): string {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code: string }).code) : "";
  if (code.includes("unauthorized-domain")) return "This website is not an authorized sign-in domain yet.";
  if (code.includes("invalid-email")) return "Use the full admin email, including .local if that is the account.";
  if (code.includes("too-many-requests")) return "Too many attempts. Wait a minute and try again.";
  if (code.includes("network-request-failed")) return "Network error. Check your connection.";
  if (code.includes("wrong-password") || code.includes("invalid-credential") || code.includes("user-not-found")) {
    return "Incorrect email or password.";
  }
  return error instanceof Error ? error.message : "Could not sign in.";
}

export function HostedAdmin() {
  const [path, setPath] = useState("/admin");
  const [user, setUser] = useState<string | null | undefined>(undefined);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<RemoteProduct[]>([]);
  const [categories, setCategories] = useState<RemoteCategory[]>([]);
  const [media, setMedia] = useState<RemoteMedia[]>([]);
  const [settings, setSettings] = useState<RemoteSettings | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [busy, setBusy] = useState(false);

  const view = useMemo(() => parsePath(path), [path]);

  useEffect(() => {
    const sync = () => setPath(window.location.pathname);
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  useEffect(() => {
    return onAuthStateChanged(getFirebaseAuth(), (next) => {
      setUser(next?.email ?? null);
    });
  }, []);

  async function refresh() {
    const [nextProducts, nextCategories, nextMedia, nextSettings, nextAudit] = await Promise.all([
      listProducts({ includeHidden: true }),
      listCategories(),
      listMedia(),
      getSettings(),
      listAudit(8),
    ]);
    setProducts(nextProducts);
    setCategories(nextCategories);
    setMedia(nextMedia);
    setSettings(nextSettings);
    setAudit(nextAudit);
  }

  useEffect(() => {
    if (!user) return;
    refresh().catch((err) => setError(err instanceof Error ? err.message : "Could not load the catalog."));
    return subscribeProducts({ includeHidden: true }, (items) => setProducts(items), (err) => setError(err.message));
  }, [user]);

  useEffect(() => {
    if (user === null && view.name !== "login") go("/admin/login/");
    if (user && view.name === "login") go("/admin/");
  }, [user, view.name]);

  if (user === undefined) return <p className="p-8 text-sm text-ink-500">Loading admin…</p>;

  return (
    <div className="min-h-screen bg-bg text-ink-800">
      {user ? (
        <AdminChrome email={user} settings={settings} path={path}>
          {status ? <Note ok text={status} onClose={() => setStatus(null)} /> : null}
          {error ? <Note ok={false} text={error} onClose={() => setError(null)} /> : null}
          {view.name === "dashboard" ? (
            <Dashboard products={products} categories={categories} settings={settings} audit={audit} />
          ) : null}
          {view.name === "products" ? (
            <ProductList products={products} onStatus={setStatus} onError={setError} onRefresh={refresh} />
          ) : null}
          {view.name === "product" ? (
            <ProductEditor
              product={products.find((item) => item.id === view.id)}
              categories={categories}
              settings={settings}
              busy={busy}
              onBusy={setBusy}
              onStatus={setStatus}
              onError={setError}
              onRefresh={refresh}
            />
          ) : null}
          {view.name === "categories" ? (
            <CategoryTree categories={categories} onStatus={setStatus} onError={setError} onRefresh={refresh} />
          ) : null}
          {view.name === "category" ? (
            <CategoryEditor
              category={categories.find((item) => item.id === view.id)}
              categories={categories}
              settings={settings}
              onStatus={setStatus}
              onError={setError}
              onRefresh={refresh}
            />
          ) : null}
          {view.name === "media" ? (
            <MediaView media={media} onStatus={setStatus} onError={setError} onRefresh={refresh} />
          ) : null}
          {view.name === "settings" && settings ? (
            <SettingsView
              settings={settings}
              products={products}
              categories={categories}
              onStatus={setStatus}
              onError={setError}
              onRefresh={refresh}
            />
          ) : null}
          {view.name === "account" ? <AccountView email={user} onStatus={setStatus} onError={setError} /> : null}
        </AdminChrome>
      ) : (
        <LoginView onError={setError} error={error} />
      )}
    </div>
  );
}

function Note({ ok, text, onClose }: { ok: boolean; text: string; onClose: () => void }) {
  return (
    <div className={`mb-4 flex items-start justify-between gap-3 rounded-lg px-3 py-2 text-sm ${ok ? "note-ok" : "note-err"}`}>
      <p>{text}</p>
      <button type="button" onClick={onClose} className="text-current">
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

function AdminChrome({
  email,
  settings,
  path,
  children,
}: {
  email: string;
  settings: RemoteSettings | null;
  path: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const links = [
    { href: "/admin/", label: "Dashboard", Icon: HomeIcon },
    { href: "/admin/categories/", label: "Catalogue", Icon: LayersIcon },
    { href: "/admin/products/", label: "Products", Icon: GridIcon },
    { href: "/admin/media/", label: "Media", Icon: ImageIcon },
    { href: "/admin/settings/", label: "Website", Icon: SettingsIcon },
    { href: "/admin/account/", label: "Account", Icon: SettingsIcon },
  ];

  return (
    <div className="lg:flex">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-panel/95 px-4 py-3 lg:hidden">
        <button type="button" className="btn btn-outline !min-h-0 !px-2.5 !py-2" onClick={() => setOpen(true)}>
          <MenuIcon />
        </button>
        <span className="text-sm font-semibold">{settings?.businessName ?? "Admin"}</span>
        <div className="ml-auto">
          <ThemeToggle compact />
        </div>
      </header>
      <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-line bg-panel p-4 lg:sticky lg:top-0 lg:flex lg:h-screen">
        <div>
          <p className="mb-6 px-3 font-display text-lg">{settings?.businessName ?? "Admin"}</p>
          <nav className="space-y-1">
            {links.map(({ href, label, Icon }) => {
              const current = path.replace(/\/+$/, "") || "/admin";
              const target = href.replace(/\/+$/, "") || "/admin";
              const active =
                target === "/admin" ? current === "/admin" : current === target || current.startsWith(`${target}/`);
              return (
                <a
                  key={href}
                  href={href}
                  onClick={(event) => {
                    event.preventDefault();
                    go(href);
                  }}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-cream-200 ${
                    active ? "bg-cream-200 text-ink-900" : "text-ink-600"
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  {label}
                </a>
              );
            })}
          </nav>
        </div>
        <div className="space-y-1 border-t border-line pt-3">
          <div className="px-3 pb-3">
            <ThemeToggle />
          </div>
          <p className="px-3 pb-2 text-xs text-ink-400">Signed in as {email}</p>
          <a href="/" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-600 hover:bg-cream-200">
            <ExternalIcon className="h-[18px] w-[18px]" />
            View public site
          </a>
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-600 hover:bg-cream-200"
            onClick={() => signOut(getFirebaseAuth())}
          >
            <LogoutIcon className="h-[18px] w-[18px]" />
            Sign out
          </button>
        </div>
      </aside>
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" className="absolute inset-0 bg-ink-900/50" aria-label="Close menu" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col justify-between bg-panel p-4 shadow-xl">
            <nav className="space-y-1">
              {links.map(({ href, label, Icon }) => (
                <a
                  key={href}
                  href={href}
                  onClick={(event) => {
                    event.preventDefault();
                    go(href);
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-cream-200"
                >
                  <Icon className="h-[18px] w-[18px]" />
                  {label}
                </a>
              ))}
            </nav>
          </aside>
        </div>
      ) : null}
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">{children}</main>
    </div>
  );
}

function LoginView({ error, onError }: { error: string | null; onError: (value: string | null) => void }) {
  const [pending, setPending] = useState(false);
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <form
        className="card w-full max-w-sm space-y-4 p-6"
        onSubmit={async (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setPending(true);
          onError(null);
          try {
            await signInWithEmailAndPassword(
              getFirebaseAuth(),
              String(data.get("email") ?? "").trim(),
              String(data.get("password") ?? "")
            );
          } catch (err) {
            onError(authMessage(err));
          } finally {
            setPending(false);
          }
        }}
      >
        <h1 className="text-2xl text-ink-900">Admin sign in</h1>
        <p className="text-sm text-ink-500">Use your admin email. The .local address is valid here.</p>
        <label className="block">
          <span className="field-label">Email</span>
          <input
            name="email"
            type="text"
            inputMode="email"
            autoComplete="username"
            required
            className="field-input"
            defaultValue="admin@sgcatalog.local"
          />
        </label>
        <label className="block">
          <span className="field-label">Password</span>
          <input name="password" type="password" autoComplete="current-password" required className="field-input" />
        </label>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button type="submit" className="btn btn-primary w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

function Dashboard({
  products,
  categories,
  settings,
  audit,
}: {
  products: RemoteProduct[];
  categories: RemoteCategory[];
  settings: RemoteSettings | null;
  audit: AuditEntry[];
}) {
  const missing = products.filter((item) => !item.coverUrl && item.imageIds.length === 0);
  const watermarkErrors = products.filter((item) => item.watermarkStatus === "error");
  return (
    <div>
      <h1 className="text-2xl text-ink-900">Dashboard</h1>
      <p className="mt-1 text-sm text-ink-500">
        {settings?.businessName ?? "Catalogue"} — changes appear on the public site immediately.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Products", products.length, `${products.filter((item) => item.isPublished).length} published`],
          ["Collections", categories.filter((item) => item.kind === "category").length, `${categories.filter((item) => item.parentId).length} nested`],
          ["Brands / models", categories.filter((item) => item.kind !== "category").length, `${categories.filter((item) => item.kind === "brand").length} brands`],
          ["Needs attention", missing.length + watermarkErrors.length, `${watermarkErrors.length} watermark errors`],
        ].map(([label, value, hint]) => (
          <div key={String(label)} className="card p-5">
            <p className="text-sm text-ink-500">{label}</p>
            <p className="mt-2 font-display text-3xl">{value}</p>
            <p className="text-xs text-ink-400">{hint}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <a href="/admin/products/new/" onClick={(event) => { event.preventDefault(); go("/admin/products/new/"); }} className="btn btn-primary">
          <PlusIcon className="h-4 w-4" /> Add design
        </a>
        <a href="/admin/categories/new/" onClick={(event) => { event.preventDefault(); go("/admin/categories/new/"); }} className="btn btn-outline">
          <PlusIcon className="h-4 w-4" /> Add collection
        </a>
        <a href="/admin/settings/" onClick={(event) => { event.preventDefault(); go("/admin/settings/"); }} className="btn btn-outline">
          Website & watermarks
        </a>
      </div>
      {audit.length > 0 ? (
        <div className="mt-8">
          <h2 className="text-lg">Recent changes</h2>
          <ul className="mt-3 space-y-2">
            {audit.map((item) => (
              <li key={item.id} className="text-sm text-ink-500">
                <span className="text-ink-400">{new Date(item.at).toLocaleString()} · </span>
                {item.detail}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ProductList({
  products,
  onStatus,
  onError,
  onRefresh,
}: {
  products: RemoteProduct[];
  onStatus: (value: string) => void;
  onError: (value: string) => void;
  onRefresh: () => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const filtered = products.filter((product) => {
    const term = query.trim().toLowerCase();
    if (!term) return true;
    return (
      product.designNumber.toLowerCase().includes(term) ||
      product.sizes.some((size) => size.toLowerCase().includes(term))
    );
  });

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl">Products</h1>
          <p className="mt-1 text-sm text-ink-400">{filtered.length} of {products.length} designs</p>
        </div>
        <a href="/admin/products/new/" onClick={(event) => { event.preventDefault(); go("/admin/products/new/"); }} className="btn btn-primary">
          <PlusIcon className="h-4 w-4" /> Add design
        </a>
      </div>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search design number or size"
        className="field-input mb-4 max-w-md"
      />
      <ul className="space-y-2">
        {filtered.map((product) => (
          <li key={product.id} className="card flex items-center gap-3 p-3">
            <img src={product.coverUrl || mediaSrc(product.images[0], "thumb") || ""} alt="" className="h-14 w-14 rounded-lg bg-cream-200 object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{product.designNumber}</p>
              <p className="text-xs text-ink-400">
                {[product.categoryName, product.brandName, product.modelName].filter(Boolean).join(" / ") || "Unassigned"}
                {product.isPublished ? "" : " · hidden"}
                {product.watermarkStatus === "error" ? " · watermark error" : ""}
              </p>
            </div>
            <a href={hrefFor({ name: "product", id: product.id })} onClick={(event) => { event.preventDefault(); go(hrefFor({ name: "product", id: product.id })); }} className="btn btn-outline !min-h-0 !py-2">
              Edit
            </a>
            <button
              type="button"
              className="btn btn-outline !min-h-0 !py-2"
              onClick={async () => {
                if (!confirm(`Delete design ${product.designNumber}?`)) return;
                try {
                  await deleteProduct(product.id);
                  await onRefresh();
                  onStatus(`Design ${product.designNumber} deleted.`);
                } catch (error) {
                  onError(error instanceof Error ? error.message : "Delete failed.");
                }
              }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

async function uploadAsset(file: File, kind: "product" | "logo") {
  const processed = await fileToCleanVariants(file, kind);
  const id = newId(kind === "logo" ? "logo" : "img");
  await saveMedia({
    id,
    filename: file.name,
    originalName: file.name,
    mimeType: "image/webp",
    kind,
    width: processed.width,
    height: processed.height,
    bytes: processed.bytes,
    variants: JSON.stringify(processed.variants),
    alt: null,
    originalData: processed.originalData,
    createdAt: new Date().toISOString(),
  });
  return { id, original: processed.originalData, variants: processed.variants };
}

async function stampProduct(
  product: Pick<RemoteProduct, "id" | "designNumber" | "description" | "categoryId" | "sizes" | "imageIds" | "isPublished" | "watermarkOverride">,
  settings: RemoteSettings,
  categories: RemoteCategory[],
  media: RemoteMedia[],
  originalSrc: string,
  imageIds: string[]
) {
  const mark = effectiveWatermark(product, categories, settings);
  const variants = await watermarkVariants(originalSrc, mark);
  await saveProduct({
    id: product.id,
    designNumber: product.designNumber,
    description: product.description ?? "",
    categoryId: product.categoryId ?? undefined,
    sizes: product.sizes,
    imageIds,
    isPublished: product.isPublished,
    coverUrl: variants.card || variants.detail,
    originalCoverUrl: originalSrc,
    watermarkStatus: mark.enabled && mark.logoSrc ? "ready" : "none",
    watermarkError: null,
    watermarkRevision: settings.watermarkRevision,
    watermarkOverride: product.watermarkOverride,
  });
  const first = imageIds[0];
  if (first) {
    const current = media.find((item) => item.id === first);
    await saveMedia({
      id: first,
      filename: current?.filename ?? `${product.designNumber}.webp`,
      originalName: current?.originalName ?? product.designNumber,
      mimeType: "image/webp",
      kind: "product",
      width: current?.width ?? 0,
      height: current?.height ?? 0,
      bytes: current?.bytes ?? 0,
      variants: JSON.stringify(variants),
      alt: product.designNumber,
      originalData: originalSrc,
      createdAt: current?.createdAt,
    });
  }
}

function ProductEditor({
  product,
  categories,
  settings,
  busy,
  onBusy,
  onStatus,
  onError,
  onRefresh,
}: {
  product?: RemoteProduct;
  categories: RemoteCategory[];
  settings: RemoteSettings | null;
  busy: boolean;
  onBusy: (value: boolean) => void;
  onStatus: (value: string) => void;
  onError: (value: string) => void;
  onRefresh: () => Promise<void>;
}) {
  const [imageIds, setImageIds] = useState(product?.imageIds ?? []);
  const [coverUrl, setCoverUrl] = useState(product?.coverUrl ?? null);
  const [originalCoverUrl, setOriginalCoverUrl] = useState(product?.originalCoverUrl ?? null);
  const [sizes, setSizes] = useState(product?.sizes.join(", ") ?? "");

  useEffect(() => {
    setImageIds(product?.imageIds ?? []);
    setCoverUrl(product?.coverUrl ?? null);
    setOriginalCoverUrl(product?.originalCoverUrl ?? null);
    setSizes(product?.sizes.join(", ") ?? "");
  }, [product?.id, product?.imageIds?.join(","), product?.coverUrl, product?.originalCoverUrl, product?.sizes.join(",")]);

  async function uploadPhotos(files: File[]) {
    if (!settings) return;
    onBusy(true);
    try {
      let nextIds = imageIds;
      let nextOriginal = originalCoverUrl;
      for (const [index, file] of files.entries()) {
        const uploaded = await uploadAsset(file, "product");
        nextIds = index === 0 ? [uploaded.id, ...nextIds.filter((id) => id !== uploaded.id)] : [...nextIds, uploaded.id];
        if (index === 0) nextOriginal = uploaded.original;
      }
      setImageIds(nextIds);
      setOriginalCoverUrl(nextOriginal);
      if (product && nextOriginal) {
        const latest = await listMedia();
        await stampProduct(
          { ...product, imageIds: nextIds, sizes: sizes.split(",").map((item) => item.trim()).filter(Boolean) },
          settings,
          categories,
          latest,
          nextOriginal,
          nextIds
        );
        const saved = (await listProducts({ includeHidden: true })).find((item) => item.id === product.id);
        setCoverUrl(saved?.coverUrl ?? null);
      }
      await onRefresh();
      onStatus("Photo saved and watermarked.");
    } catch (error) {
      onError(error instanceof Error ? error.message : "Photo upload failed.");
    } finally {
      onBusy(false);
    }
  }

  return (
    <form
      className="max-w-3xl space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        onBusy(true);
        try {
          const saved = await saveProduct({
            id: product?.id,
            designNumber: String(data.get("designNumber") ?? ""),
            description: String(data.get("description") ?? ""),
            categoryId: String(data.get("categoryId") ?? "") || undefined,
            sizes: sizes.split(",").map((item) => item.trim()).filter(Boolean),
            imageIds,
            isPublished: data.get("isPublished") === "on",
            coverUrl,
            originalCoverUrl,
          });
          if (settings && originalCoverUrl) {
            const latest = await listMedia();
            await stampProduct(saved, settings, categories, latest, originalCoverUrl, imageIds);
          }
          await onRefresh();
          onStatus("Design saved.");
          go(hrefFor({ name: "product", id: saved.id }));
        } catch (error) {
          onError(error instanceof Error ? error.message : "Could not save.");
        } finally {
          onBusy(false);
        }
      }}
    >
      <h1 className="text-2xl">{product ? `Design ${product.designNumber}` : "Add design"}</h1>
      <label className="block">
        <span className="field-label">Design number</span>
        <input name="designNumber" required className="field-input" defaultValue={product?.designNumber ?? ""} placeholder="1001 or any code you use" />
        <p className="field-hint">This is the only required identifier. No prefix is added.</p>
      </label>
      <label className="block">
        <span className="field-label">Collection / brand / model</span>
        <select name="categoryId" className="field-input" defaultValue={product?.categoryId ?? ""}>
          <option value="">Unassigned</option>
          {flattenOptions(categories).map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="field-label">Available sizes</span>
        <input
          className="field-input"
          value={sizes}
          onChange={(event) => setSizes(event.target.value)}
          placeholder="4 × 6 ft, 5 × 7 ft, custom"
        />
        <p className="field-hint">Optional. Separate multiple sizes with commas.</p>
      </label>
      <label className="block">
        <span className="field-label">Description</span>
        <textarea name="description" rows={4} className="field-input" defaultValue={product?.description ?? ""} />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isPublished" defaultChecked={product?.isPublished ?? true} />
        Published
      </label>
      <div>
        <p className="field-label">Photos</p>
        {coverUrl ? <img src={coverUrl} alt="" className="mt-2 h-32 w-32 rounded-lg object-cover" /> : null}
        <label className="btn btn-primary mt-2 !min-h-0 !py-2">
          {imageIds[0] ? "Replace main photo" : "Upload photo"}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              const files = [...(event.target.files ?? [])];
              event.target.value = "";
              void uploadPhotos(files);
            }}
          />
        </label>
      </div>
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? "Saving…" : "Save design"}
      </button>
    </form>
  );
}

function flattenOptions(categories: RemoteCategory[], parentId: string | null = null, depth = 0): Array<{ id: string; label: string }> {
  return childrenOf(parentId, categories).flatMap((item) => [
    { id: item.id, label: `${"— ".repeat(depth)}${item.name} (${item.kind})` },
    ...flattenOptions(categories, item.id, depth + 1),
  ]);
}

function CategoryTree({
  categories,
  onStatus,
  onError,
  onRefresh,
}: {
  categories: RemoteCategory[];
  onStatus: (value: string) => void;
  onError: (value: string) => void;
  onRefresh: () => Promise<void>;
}) {
  return (
    <div>
      <div className="mb-5 flex items-end justify-between">
        <h1 className="text-2xl">Catalogue</h1>
        <a href="/admin/categories/new/" onClick={(event) => { event.preventDefault(); go("/admin/categories/new/"); }} className="btn btn-primary">
          <PlusIcon className="h-4 w-4" /> Add collection
        </a>
      </div>
      <TreeList
        parentId={null}
        categories={categories}
        onStatus={onStatus}
        onError={onError}
        onRefresh={onRefresh}
      />
    </div>
  );
}

function TreeList({
  parentId,
  categories,
  onStatus,
  onError,
  onRefresh,
}: {
  parentId: string | null;
  categories: RemoteCategory[];
  onStatus: (value: string) => void;
  onError: (value: string) => void;
  onRefresh: () => Promise<void>;
}) {
  const items = childrenOf(parentId, categories);
  if (items.length === 0 && parentId === null) {
    return <p className="text-sm text-ink-400">No collections yet. Add a category, then nest brands or models under it.</p>;
  }
  return (
    <ul className={parentId ? "ml-4 space-y-2 border-l border-line pl-4" : "space-y-2"}>
      {items.map((item) => (
        <li key={item.id} className="card p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{item.name}</p>
              <p className="text-xs text-ink-400">
                {item.kind} · {item.productCount} products{item.isPublished ? "" : " · hidden"}
              </p>
            </div>
            <a
              href={hrefFor({ name: "category", id: item.id })}
              onClick={(event) => {
                event.preventDefault();
                go(hrefFor({ name: "category", id: item.id }));
              }}
              className="btn btn-outline !min-h-0 !py-2"
            >
              Edit
            </a>
            <button
              type="button"
              className="btn btn-outline !min-h-0 !py-2"
              onClick={async () => {
                if (!confirm(`Delete “${item.name}”? Nested items must be removed first. Products will be unassigned, not deleted.`)) return;
                try {
                  await deleteCategory(item.id, "unassign");
                  await onRefresh();
                  onStatus(`${item.name} deleted. Products were kept.`);
                } catch (error) {
                  onError(error instanceof Error ? error.message : "Could not delete.");
                }
              }}
            >
              Delete
            </button>
          </div>
          <div className="mt-3">
            <TreeList parentId={item.id} categories={categories} onStatus={onStatus} onError={onError} onRefresh={onRefresh} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function CategoryEditor({
  category,
  categories,
  settings,
  onStatus,
  onError,
  onRefresh,
}: {
  category?: RemoteCategory;
  categories: RemoteCategory[];
  settings: RemoteSettings | null;
  onStatus: (value: string) => void;
  onError: (value: string) => void;
  onRefresh: () => Promise<void>;
}) {
  const [inherit, setInherit] = useState(category?.watermarkInherit ?? true);

  return (
    <form
      className="max-w-3xl space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const parentId = String(data.get("parentId") ?? "") || null;
        if (category && wouldCreateCycle(category.id, parentId, categories)) {
          onError("That parent would create a loop.");
          return;
        }
        try {
          const logoFile = (data.get("logoFile") as File | null)?.size ? (data.get("logoFile") as File) : null;
          const markFile = (data.get("watermarkFile") as File | null)?.size ? (data.get("watermarkFile") as File) : null;
          const logo = logoFile ? await uploadAsset(logoFile, "logo") : null;
          const mark = markFile ? await uploadAsset(markFile, "logo") : null;
          const saved = await saveCategory({
            id: category?.id,
            name: String(data.get("name") ?? ""),
            description: String(data.get("description") ?? ""),
            parentId,
            kind: String(data.get("kind") ?? "category") as CatalogKind,
            isPublished: data.get("isPublished") === "on",
            seoTitle: String(data.get("seoTitle") ?? ""),
            seoDescription: String(data.get("seoDescription") ?? ""),
            logoId: logo?.id ?? category?.logoId,
            watermarkInherit: inherit,
            watermarkEnabled: data.get("watermarkEnabled") === "on",
            watermarkLogoId: mark?.id ?? category?.watermarkLogoId,
            watermarkOpacity: Number(data.get("watermarkOpacity") || settings?.watermarkOpacity || 0.16),
            watermarkScale: Number(data.get("watermarkScale") || settings?.watermarkScale || 0.18),
            watermarkSpacing: Number(data.get("watermarkSpacing") || settings?.watermarkSpacing || 0.08),
            watermarkRotation: Number(data.get("watermarkRotation") || settings?.watermarkRotation || -28),
          });
          await onRefresh();
          onStatus("Collection saved. It is available in product forms and the public menu.");
          go(hrefFor({ name: "category", id: saved.id }));
        } catch (error) {
          onError(error instanceof Error ? error.message : "Could not save.");
        }
      }}
    >
      <h1 className="text-2xl">{category ? category.name : "Add collection"}</h1>
      <label className="block">
        <span className="field-label">Name</span>
        <input name="name" required className="field-input" defaultValue={category?.name ?? ""} />
      </label>
      <label className="block">
        <span className="field-label">Type</span>
        <select name="kind" className="field-input" defaultValue={category?.kind ?? "category"}>
          <option value="category">Category / subcategory</option>
          <option value="brand">Brand</option>
          <option value="model">Model / collection</option>
        </select>
      </label>
      <label className="block">
        <span className="field-label">Nested under</span>
        <select name="parentId" className="field-input" defaultValue={category?.parentId ?? ""}>
          <option value="">Top level</option>
          {flattenOptions(categories)
            .filter((item) => item.id !== category?.id)
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
        </select>
      </label>
      <label className="block">
        <span className="field-label">Description</span>
        <textarea name="description" rows={3} className="field-input" defaultValue={category?.description ?? ""} />
      </label>
      <label className="block">
        <span className="field-label">SEO title</span>
        <input name="seoTitle" className="field-input" defaultValue={category?.seoTitle ?? ""} />
      </label>
      <label className="block">
        <span className="field-label">SEO description</span>
        <textarea name="seoDescription" rows={2} className="field-input" defaultValue={category?.seoDescription ?? ""} />
      </label>
      <label className="block">
        <span className="field-label">Logo / image</span>
        <input name="logoFile" type="file" accept="image/*" className="field-input" />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isPublished" defaultChecked={category?.isPublished ?? true} />
        Published
      </label>
      <div className="card space-y-3 p-4">
        <h2 className="text-lg">Watermark</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={inherit} onChange={(event) => setInherit(event.target.checked)} />
          Inherit from parent / website default
        </label>
        {!inherit ? (
          <>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="watermarkEnabled" defaultChecked={category?.watermarkEnabled ?? true} />
              Enable watermark
            </label>
            <label className="block">
              <span className="field-label">Watermark image</span>
              <input name="watermarkFile" type="file" accept="image/*" className="field-input" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block"><span className="field-label">Opacity</span><input name="watermarkOpacity" type="number" step="0.01" className="field-input" defaultValue={category?.watermarkOpacity ?? settings?.watermarkOpacity} /></label>
              <label className="block"><span className="field-label">Size</span><input name="watermarkScale" type="number" step="0.01" className="field-input" defaultValue={category?.watermarkScale ?? settings?.watermarkScale} /></label>
              <label className="block"><span className="field-label">Spacing</span><input name="watermarkSpacing" type="number" step="0.01" className="field-input" defaultValue={category?.watermarkSpacing ?? settings?.watermarkSpacing} /></label>
              <label className="block"><span className="field-label">Rotation</span><input name="watermarkRotation" type="number" className="field-input" defaultValue={category?.watermarkRotation ?? settings?.watermarkRotation} /></label>
            </div>
          </>
        ) : null}
      </div>
      <button type="submit" className="btn btn-primary">Save collection</button>
    </form>
  );
}

function MediaView({
  media,
  onStatus,
  onError,
  onRefresh,
}: {
  media: RemoteMedia[];
  onStatus: (value: string) => void;
  onError: (value: string) => void;
  onRefresh: () => Promise<void>;
}) {
  return (
    <div>
      <h1 className="text-2xl">Media library</h1>
      <label className="btn btn-primary mt-4 inline-flex">
        Upload images
        <input
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={async (event) => {
            const files = [...(event.target.files ?? [])];
            event.target.value = "";
            try {
              for (const file of files) await uploadAsset(file, "product");
              await onRefresh();
              onStatus(`Uploaded ${files.length} image(s).`);
            } catch (error) {
              onError(error instanceof Error ? error.message : "Upload failed.");
            }
          }}
        />
      </label>
      <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {media.map((item) => {
          const src = mediaSrc(item, "card") || originalImageSrc(item);
          return (
            <li key={item.id} className="card overflow-hidden">
              {src ? <img src={src} alt={item.alt ?? item.originalName} className="aspect-square w-full object-cover" /> : null}
              <div className="flex items-center justify-between p-2">
                <p className="truncate text-xs">{item.originalName}</p>
                <button
                  type="button"
                  className="text-xs text-red-700"
                  onClick={async () => {
                    if (!confirm("Delete this image?")) return;
                    await removeMedia(item.id);
                    await onRefresh();
                    onStatus("Image deleted.");
                  }}
                >
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SettingsView({
  settings,
  products,
  categories,
  onStatus,
  onError,
  onRefresh,
}: {
  settings: RemoteSettings;
  products: RemoteProduct[];
  categories: RemoteCategory[];
  onStatus: (value: string) => void;
  onError: (value: string) => void;
  onRefresh: () => Promise<void>;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  return (
    <form
      className="max-w-3xl space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        try {
          const logoFile = (data.get("logoFile") as File | null)?.size ? (data.get("logoFile") as File) : null;
          const markFile = (data.get("watermarkFile") as File | null)?.size ? (data.get("watermarkFile") as File) : null;
          const logo = logoFile ? await uploadAsset(logoFile, "logo") : null;
          const mark = markFile ? await uploadAsset(markFile, "logo") : null;
          await saveSettings({
            businessName: String(data.get("businessName") ?? ""),
            tagline: String(data.get("tagline") ?? "") || null,
            homepageHeading: String(data.get("homepageHeading") ?? ""),
            homepageIntro: String(data.get("homepageIntro") ?? ""),
            aboutText: String(data.get("aboutText") ?? ""),
            address: String(data.get("address") ?? "") || null,
            phone: String(data.get("phone") ?? "") || null,
            email: String(data.get("email") ?? "") || null,
            footerText: String(data.get("footerText") ?? "") || null,
            whatsappNumber: String(data.get("whatsappNumber") ?? "").replace(/\D/g, ""),
            whatsappGeneralMessage: String(data.get("whatsappGeneralMessage") ?? ""),
            whatsappProductMessage: String(data.get("whatsappProductMessage") ?? ""),
            enquiryButtonLabel: String(data.get("enquiryButtonLabel") ?? "Enquire on WhatsApp"),
            siteTitle: String(data.get("siteTitle") ?? ""),
            siteDescription: String(data.get("siteDescription") ?? ""),
            navCatalogLabel: String(data.get("navCatalogLabel") ?? "Catalog"),
            navContactLabel: String(data.get("navContactLabel") ?? "Contact"),
            instagramUrl: String(data.get("instagramUrl") ?? "") || null,
            facebookUrl: String(data.get("facebookUrl") ?? "") || null,
            youtubeUrl: String(data.get("youtubeUrl") ?? "") || null,
            twitterUrl: String(data.get("twitterUrl") ?? "") || null,
            linkedinUrl: String(data.get("linkedinUrl") ?? "") || null,
            logoId: logo?.id ?? settings.logoId,
            watermarkEnabled: data.get("watermarkEnabled") === "on",
            watermarkLogoId: mark?.id ?? settings.watermarkLogoId,
            watermarkOpacity: Number(data.get("watermarkOpacity") || 0.16),
            watermarkScale: Number(data.get("watermarkScale") || 0.18),
            watermarkSpacing: Number(data.get("watermarkSpacing") || 0.08),
            watermarkRotation: Number(data.get("watermarkRotation") || -28),
            watermarkRevision: String(Date.now()),
          });
          await onRefresh();
          onStatus("Settings saved. The public site updates immediately.");
        } catch (error) {
          onError(error instanceof Error ? error.message : "Could not save settings.");
        }
      }}
    >
      <h1 className="text-2xl">Website settings</h1>
      <label className="block"><span className="field-label">Company / brand name</span><input name="businessName" className="field-input" defaultValue={settings.businessName} required /></label>
      <label className="block"><span className="field-label">Tagline</span><input name="tagline" className="field-input" defaultValue={settings.tagline ?? ""} /></label>
      <label className="block"><span className="field-label">Homepage heading</span><input name="homepageHeading" className="field-input" defaultValue={settings.homepageHeading} /></label>
      <label className="block"><span className="field-label">Homepage introduction</span><textarea name="homepageIntro" rows={3} className="field-input" defaultValue={settings.homepageIntro} /></label>
      <label className="block"><span className="field-label">About / footer text</span><textarea name="aboutText" rows={3} className="field-input" defaultValue={settings.aboutText || settings.footerText || ""} /></label>
      <label className="block"><span className="field-label">Footer text</span><textarea name="footerText" rows={2} className="field-input" defaultValue={settings.footerText ?? ""} /></label>
      <label className="block"><span className="field-label">WhatsApp number</span><input name="whatsappNumber" className="field-input" defaultValue={settings.whatsappNumber} /></label>
      <label className="block"><span className="field-label">Enquiry button label</span><input name="enquiryButtonLabel" className="field-input" defaultValue={settings.enquiryButtonLabel} /></label>
      <label className="block"><span className="field-label">General WhatsApp message</span><textarea name="whatsappGeneralMessage" rows={3} className="field-input" defaultValue={settings.whatsappGeneralMessage} /></label>
      <label className="block"><span className="field-label">Product WhatsApp message</span><textarea name="whatsappProductMessage" rows={4} className="field-input" defaultValue={settings.whatsappProductMessage} /></label>
      <label className="block"><span className="field-label">Address</span><textarea name="address" rows={2} className="field-input" defaultValue={settings.address ?? ""} /></label>
      <label className="block"><span className="field-label">Phone</span><input name="phone" className="field-input" defaultValue={settings.phone ?? ""} /></label>
      <label className="block"><span className="field-label">Email</span><input name="email" className="field-input" defaultValue={settings.email ?? ""} /></label>
      <label className="block"><span className="field-label">Site title</span><input name="siteTitle" className="field-input" defaultValue={settings.siteTitle} /></label>
      <label className="block"><span className="field-label">Site description</span><textarea name="siteDescription" rows={2} className="field-input" defaultValue={settings.siteDescription} /></label>
      <label className="block"><span className="field-label">Catalog menu label</span><input name="navCatalogLabel" className="field-input" defaultValue={settings.navCatalogLabel} /></label>
      <label className="block"><span className="field-label">Contact menu label</span><input name="navContactLabel" className="field-input" defaultValue={settings.navContactLabel} /></label>
      <label className="block"><span className="field-label">Instagram URL</span><input name="instagramUrl" className="field-input" defaultValue={settings.instagramUrl ?? ""} /></label>
      <label className="block"><span className="field-label">Facebook URL</span><input name="facebookUrl" className="field-input" defaultValue={settings.facebookUrl ?? ""} /></label>
      <label className="block"><span className="field-label">YouTube URL</span><input name="youtubeUrl" className="field-input" defaultValue={settings.youtubeUrl ?? ""} /></label>
      <label className="block"><span className="field-label">X / Twitter URL</span><input name="twitterUrl" className="field-input" defaultValue={settings.twitterUrl ?? ""} /></label>
      <label className="block"><span className="field-label">LinkedIn URL</span><input name="linkedinUrl" className="field-input" defaultValue={settings.linkedinUrl ?? ""} /></label>
      <label className="block"><span className="field-label">Company logo</span><input name="logoFile" type="file" accept="image/*" className="field-input" /></label>
      <div className="card space-y-3 p-4">
        <h2 className="text-lg">Default watermark</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="watermarkEnabled" defaultChecked={settings.watermarkEnabled} />
          Enable watermark
        </label>
        <label className="block"><span className="field-label">Watermark logo</span><input name="watermarkFile" type="file" accept="image/*" className="field-input" /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="field-label">Opacity</span><input name="watermarkOpacity" type="number" step="0.01" className="field-input" defaultValue={settings.watermarkOpacity} /></label>
          <label className="block"><span className="field-label">Size</span><input name="watermarkScale" type="number" step="0.01" className="field-input" defaultValue={settings.watermarkScale} /></label>
          <label className="block"><span className="field-label">Spacing</span><input name="watermarkSpacing" type="number" step="0.01" className="field-input" defaultValue={settings.watermarkSpacing} /></label>
          <label className="block"><span className="field-label">Rotation</span><input name="watermarkRotation" type="number" className="field-input" defaultValue={settings.watermarkRotation} /></label>
        </div>
        <button
          type="button"
          className="btn btn-outline"
          onClick={async () => {
            const sample = products.find((item) => item.originalCoverUrl || item.coverUrl);
            const src = sample?.originalCoverUrl || sample?.coverUrl;
            if (!src) {
              onError("Upload a product photo first to preview.");
              return;
            }
            const mark = effectiveWatermark(sample ?? null, categories, settings);
            setPreview(await applyLogoGridWatermark(src, mark));
          }}
        >
          Preview watermark
        </button>
        {preview ? <img src={preview} alt="Watermark preview" className="max-w-xs rounded-lg border border-line" /> : null}
        <button
          type="button"
          className="btn btn-outline"
          disabled={regenerating}
          onClick={async () => {
            setRegenerating(true);
            try {
              const latestMedia = await listMedia();
              const latestSettings = await getSettings();
              let done = 0;
              for (const product of products) {
                const original =
                  product.originalCoverUrl ||
                  originalImageSrc(product.images[0]) ||
                  product.coverUrl;
                if (!original) continue;
                await stampProduct(product, latestSettings, categories, latestMedia, original, product.imageIds);
                done += 1;
              }
              await logAudit("watermark", `Regenerated ${done} product image(s)`);
              await onRefresh();
              onStatus(`Regenerated watermarks on ${done} design(s).`);
            } catch (error) {
              onError(error instanceof Error ? error.message : "Regeneration failed.");
            } finally {
              setRegenerating(false);
            }
          }}
        >
          {regenerating ? "Regenerating…" : "Regenerate existing product watermarks"}
        </button>
      </div>
      <button type="submit" className="btn btn-primary">Save settings</button>
    </form>
  );
}

function AccountView({
  email,
  onStatus,
  onError,
}: {
  email: string;
  onStatus: (value: string) => void;
  onError: (value: string | null) => void;
}) {
  const [pending, setPending] = useState(false);
  return (
    <form
      className="card max-w-md space-y-4 p-6"
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const current = String(data.get("current") ?? "");
        const next = String(data.get("next") ?? "");
        const confirm = String(data.get("confirm") ?? "");
        if (next.length < 8) {
          onError("New password must be at least 8 characters.");
          return;
        }
        if (next !== confirm) {
          onError("New password and confirmation do not match.");
          return;
        }
        const user = getFirebaseAuth().currentUser;
        if (!user?.email) {
          onError("Sign in again before changing the password.");
          return;
        }
        setPending(true);
        onError(null);
        try {
          const cred = EmailAuthProvider.credential(user.email, current);
          await reauthenticateWithCredential(user, cred);
          await updatePassword(user, next);
          onStatus("Password updated. Use the new password next time you sign in.");
          event.currentTarget.reset();
        } catch (error) {
          onError(authMessage(error));
        } finally {
          setPending(false);
        }
      }}
    >
      <h1 className="text-2xl">Account</h1>
      <p className="text-sm text-ink-500">Signed in as {email}. Passwords are stored only in Firebase Authentication.</p>
      <label className="block"><span className="field-label">Current password</span><input name="current" type="password" required className="field-input" /></label>
      <label className="block"><span className="field-label">New password</span><input name="next" type="password" required className="field-input" /></label>
      <label className="block"><span className="field-label">Confirm new password</span><input name="confirm" type="password" required className="field-input" /></label>
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Updating…" : "Change password"}
      </button>
    </form>
  );
}
