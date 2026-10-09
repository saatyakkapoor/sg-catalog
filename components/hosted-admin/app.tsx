"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase-web";
import { mediaSrc } from "@/lib/media";
import {
  deleteCategory,
  deleteProduct,
  fileToVariants,
  getSettings,
  listCategories,
  listMedia,
  listProducts,
  newId,
  removeMedia,
  saveCategory,
  saveMedia,
  saveProduct,
  saveSettings,
  subscribeProducts,
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
  | { name: "settings" };

function parsePath(pathname: string): View {
  const parts = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  if (parts[0] !== "admin") return { name: "dashboard" };
  const [, section, id] = parts;
  if (!section || section === "login") return section === "login" ? { name: "login" } : { name: "dashboard" };
  if (section === "products") return id === "new" ? { name: "product" } : id ? { name: "product", id } : { name: "products" };
  if (section === "categories") return id === "new" ? { name: "category" } : id ? { name: "category", id } : { name: "categories" };
  if (section === "media") return { name: "media" };
  if (section === "settings") return { name: "settings" };
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
    default:
      return "/admin/";
  }
}

function go(href: string) {
  window.history.pushState({}, "", href);
  window.dispatchEvent(new PopStateEvent("popstate"));
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
    const [nextProducts, nextCategories, nextMedia, nextSettings] = await Promise.all([
      listProducts({ includeHidden: true }),
      listCategories(),
      listMedia(),
      getSettings(),
    ]);
    setProducts(nextProducts);
    setCategories(nextCategories);
    setMedia(nextMedia);
    setSettings(nextSettings);
  }

  useEffect(() => {
    if (!user) return;
    refresh().catch((err) => setError(err instanceof Error ? err.message : "Could not load the catalog."));
    return subscribeProducts(
      { includeHidden: true },
      (items) => setProducts(items),
      (err) => setError(err.message)
    );
  }, [user]);

  useEffect(() => {
    if (user === null && view.name !== "login") go("/admin/login/");
    if (user && view.name === "login") go("/admin/");
  }, [user, view.name]);

  if (user === undefined) {
    return <p className="p-8 text-sm text-ink-500">Loading admin…</p>;
  }

  return (
    <div className="min-h-screen bg-bg text-ink-800">
      {user ? (
        <AdminChrome
          email={user}
          settings={settings}
          path={path}
        >
          {status ? <Note ok text={status} onClose={() => setStatus(null)} /> : null}
          {error ? <Note ok={false} text={error} onClose={() => setError(null)} /> : null}
          {view.name === "dashboard" ? (
            <Dashboard products={products} categories={categories} media={media} settings={settings} />
          ) : null}
          {view.name === "products" ? <ProductList products={products} onStatus={setStatus} onError={setError} onRefresh={refresh} /> : null}
          {view.name === "product" ? (
            <ProductEditor
              product={products.find((item) => item.id === view.id)}
              categories={categories}
              media={media}
              busy={busy}
              onBusy={setBusy}
              onStatus={setStatus}
              onError={setError}
              onRefresh={refresh}
            />
          ) : null}
          {view.name === "categories" ? (
            <CategoryListView categories={categories} onStatus={setStatus} onError={setError} onRefresh={refresh} />
          ) : null}
          {view.name === "category" ? (
            <CategoryEditor
              category={categories.find((item) => item.id === view.id)}
              media={media}
              onStatus={setStatus}
              onError={setError}
              onRefresh={refresh}
            />
          ) : null}
          {view.name === "media" ? (
            <MediaView media={media} onStatus={setStatus} onError={setError} onRefresh={refresh} />
          ) : null}
          {view.name === "settings" && settings ? (
            <SettingsView settings={settings} media={media} onStatus={setStatus} onError={setError} onRefresh={refresh} />
          ) : null}
        </AdminChrome>
      ) : (
        <LoginView onError={setError} error={error} />
      )}
    </div>
  );
}

function Note({
  ok,
  text,
  onClose,
}: {
  ok: boolean;
  text: string;
  onClose: () => void;
}) {
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
    { href: "/admin/categories/", label: "Categories", Icon: LayersIcon },
    { href: "/admin/products/", label: "Products", Icon: GridIcon },
    { href: "/admin/media/", label: "Media library", Icon: ImageIcon },
    { href: "/admin/settings/", label: "Settings", Icon: SettingsIcon },
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
          <p className="mb-6 px-3 font-display text-lg">{settings?.businessName ?? "Shagun Digital"}</p>
          <nav className="space-y-1">
            {links.map(({ href, label, Icon }) => {
              const current = path.replace(/\/+$/, "") || "/admin";
              const target = href.replace(/\/+$/, "") || "/admin";
              const active =
                target === "/admin"
                  ? current === "/admin"
                  : current === target || current.startsWith(`${target}/`);
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
          <button
            type="button"
            className="absolute inset-0 bg-ink-900/50"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
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
            <div className="space-y-2 border-t border-line pt-3">
              <ThemeToggle />
              <a href="/" className="btn btn-outline w-full">
                View public site
              </a>
              <button
                type="button"
                className="btn btn-outline w-full"
                onClick={() => signOut(getFirebaseAuth())}
              >
                Sign out
              </button>
            </div>
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
              String(data.get("email") ?? ""),
              String(data.get("password") ?? "")
            );
          } catch {
            onError("Incorrect email or password.");
          } finally {
            setPending(false);
          }
        }}
      >
        <h1 className="text-2xl text-ink-900">Admin sign in</h1>
        <p className="text-sm text-ink-500">
          Changes you make here appear on the public catalog immediately.
        </p>
        <label className="block">
          <span className="field-label">Email</span>
          <input name="email" type="email" required className="field-input" defaultValue="admin@sgcatalog.local" />
        </label>
        <label className="block">
          <span className="field-label">Password</span>
          <input name="password" type="password" required className="field-input" />
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
  media,
  settings,
}: {
  products: RemoteProduct[];
  categories: RemoteCategory[];
  media: RemoteMedia[];
  settings: RemoteSettings | null;
}) {
  return (
    <div>
      <h1 className="text-2xl text-ink-900">Dashboard</h1>
      <p className="mt-1 text-sm text-ink-500">
        Manage the {settings?.businessName ?? "catalog"}. Changes appear on the public site immediately.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          ["Products", products.length, `${products.filter((item) => item.isPublished).length} published`],
          ["Categories", categories.length, `${categories.filter((item) => item.isPublished).length} published`],
          ["Images", media.length, "stored on Firestore (free)"],
        ].map(([label, value, hint]) => (
          <div key={String(label)} className="card p-5">
            <p className="text-sm text-ink-500">{label}</p>
            <p className="mt-2 font-display text-3xl">{value}</p>
            <p className="text-xs text-ink-400">{hint}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 flex gap-2">
        <a href="/admin/products/new/" onClick={(event) => { event.preventDefault(); go("/admin/products/new/"); }} className="btn btn-primary">
          <PlusIcon className="h-4 w-4" /> Add product
        </a>
        <a href="/admin/categories/new/" onClick={(event) => { event.preventDefault(); go("/admin/categories/new/"); }} className="btn btn-outline">
          <PlusIcon className="h-4 w-4" /> Add category
        </a>
      </div>
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
      product.name.toLowerCase().includes(term)
    );
  });

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl">Products</h1>
          <p className="mt-1 text-sm text-ink-400">
            {filtered.length} of {products.length} designs
          </p>
        </div>
        <a href="/admin/products/new/" onClick={(event) => { event.preventDefault(); go("/admin/products/new/"); }} className="btn btn-primary">
          <PlusIcon className="h-4 w-4" /> Add product
        </a>
      </div>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by SD number or name"
        className="field-input mb-4 max-w-md"
        aria-label="Search products"
      />
      {filtered.length === 0 ? (
        <p className="rounded-card border border-dashed border-line px-4 py-10 text-center text-sm text-ink-400">
          No designs match that search.
        </p>
      ) : null}
      <ul className="space-y-2">
        {filtered.map((product) => (
          <li key={product.id} className="card flex items-center gap-3 p-3">
            <img src={product.coverUrl || mediaSrc(product.images[0], "thumb") || ""} alt="" className="h-14 w-14 rounded-lg object-cover bg-cream-200" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{product.name}</p>
              <p className="text-xs text-ink-400">SD {product.designNumber}{product.isPublished ? "" : " · hidden"}</p>
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

function ProductEditor({
  product,
  categories,
  media,
  busy,
  onBusy,
  onStatus,
  onError,
  onRefresh,
}: {
  product?: RemoteProduct;
  categories: RemoteCategory[];
  media: RemoteMedia[];
  busy: boolean;
  onBusy: (value: boolean) => void;
  onStatus: (value: string) => void;
  onError: (value: string) => void;
  onRefresh: () => Promise<void>;
}) {
  const [imageIds, setImageIds] = useState(product?.imageIds ?? []);
  const [coverUrl, setCoverUrl] = useState<string | null>(product?.coverUrl ?? null);

  useEffect(() => {
    setImageIds(product?.imageIds ?? []);
    setCoverUrl(product?.coverUrl ?? null);
  }, [product?.id, product?.imageIds?.join(","), product?.coverUrl]);

  async function uploadPhotos(files: File[], replaceMain: boolean) {
    if (files.length === 0) return;
    onBusy(true);
    try {
      const created: string[] = [];
      let nextCover = coverUrl;
      for (const [index, file] of files.entries()) {
        const processed = await fileToVariants(file, "product");
        if (index === 0) nextCover = processed.variants.card || processed.variants.detail || nextCover;
        const reuseId = replaceMain && index === 0 ? imageIds[0] : undefined;
        const id = reuseId || newId("img");
        try {
          await saveMedia({
            id,
            filename: file.name,
            originalName: file.name,
            mimeType: "image/webp",
            kind: "product",
            width: processed.width,
            height: processed.height,
            bytes: processed.bytes,
            variants: JSON.stringify({
              card: processed.variants.card,
              thumb: processed.variants.thumb,
              detail: processed.variants.card,
            }),
            alt: product?.name ?? null,
            createdAt: new Date().toISOString(),
          });
        } catch {
          // Product coverUrl is enough for the public site.
        }
        created.push(id);
      }
      const nextIds = replaceMain && created[0]
        ? [created[0], ...imageIds.filter((id) => id !== created[0])]
        : [...created, ...imageIds.filter((id) => !created.includes(id))];
      setImageIds(nextIds);
      setCoverUrl(nextCover);
      if (product) {
        await saveProduct({
          id: product.id,
          designNumber: product.designNumber,
          name: product.name,
          description: product.description ?? "",
          categoryId: product.categoryId ?? undefined,
          tags: product.tags,
          specs: product.specs,
          imageIds: nextIds,
          isPublished: product.isPublished,
          coverUrl: nextCover,
        });
      }
      await onRefresh();
      onStatus(replaceMain ? "Main photo is live on the catalog." : `Uploaded ${created.length} photo(s).`);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Photo upload failed. Try a smaller image.");
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
            name: String(data.get("name") ?? ""),
            description: String(data.get("description") ?? ""),
            categoryId: String(data.get("categoryId") ?? "") || undefined,
            tags: String(data.get("tags") ?? "").split(",").map((tag) => tag.trim()).filter(Boolean),
            specs: [],
            imageIds,
            isPublished: data.get("isPublished") === "on",
            coverUrl,
          });
          await onRefresh();
          onStatus("Product saved. It is live on the public site.");
          go(hrefFor({ name: "product", id: saved.id }));
        } catch (error) {
          onError(error instanceof Error ? error.message : "Could not save.");
        } finally {
          onBusy(false);
        }
      }}
    >
      <h1 className="text-2xl">{product ? `Design ${product.designNumber}` : "Add product"}</h1>
      <label className="block">
        <span className="field-label">Design number</span>
        <input name="designNumber" required className="field-input" defaultValue={product?.designNumber ?? ""} />
      </label>
      <label className="block">
        <span className="field-label">Name</span>
        <input name="name" required className="field-input" defaultValue={product?.name ?? ""} />
      </label>
      <label className="block">
        <span className="field-label">Description</span>
        <textarea name="description" rows={4} className="field-input" defaultValue={product?.description ?? ""} />
      </label>
      <label className="block">
        <span className="field-label">Category</span>
        <select name="categoryId" className="field-input" defaultValue={product?.categoryId ?? ""}>
          <option value="">None</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="field-label">Tags (comma separated)</span>
        <input name="tags" className="field-input" defaultValue={product?.tags.join(", ") ?? ""} />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isPublished" defaultChecked={product?.isPublished ?? true} />
        Published
      </label>
      <div>
        <p className="field-label">Photos</p>
        {coverUrl ? (
          <img src={coverUrl} alt="" className="mt-2 h-32 w-32 rounded-lg object-cover" />
        ) : null}
        <div className="mt-2 flex flex-wrap gap-2">
          <label className="btn btn-primary !min-h-0 !py-2">
            {imageIds[0] ? "Replace main photo" : "Upload photo"}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => {
                const files = [...(event.target.files ?? [])];
                event.target.value = "";
                void uploadPhotos(files, true);
              }}
            />
          </label>
          <label className="btn btn-outline !min-h-0 !py-2">
            Add more photos
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(event) => {
                const files = [...(event.target.files ?? [])];
                event.target.value = "";
                void uploadPhotos(files, false);
              }}
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {media.filter((item) => item.kind === "product").map((item) => {
            const selected = imageIds.includes(item.id);
            const src = mediaSrc(item, "thumb");
            return (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  setImageIds((current) =>
                    current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id]
                  )
                }
                className={`overflow-hidden rounded-lg border ${selected ? "border-gold-500 ring-2 ring-gold-300" : "border-cream-300"}`}
              >
                {src ? <img src={src} alt="" className="h-20 w-20 object-cover" /> : null}
              </button>
            );
          })}
        </div>
      </div>
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? "Saving…" : "Save product"}
      </button>
    </form>
  );
}

function CategoryListView({
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
        <h1 className="text-2xl">Categories</h1>
        <a href="/admin/categories/new/" onClick={(event) => { event.preventDefault(); go("/admin/categories/new/"); }} className="btn btn-primary">
          <PlusIcon className="h-4 w-4" /> Add category
        </a>
      </div>
      <ul className="space-y-2">
        {categories.map((category) => (
          <li key={category.id} className="card flex items-center justify-between p-3">
            <div>
              <p className="font-semibold">{category.name}</p>
              <p className="text-xs text-ink-400">{category.productCount} products</p>
            </div>
            <div className="flex gap-2">
              <a href={hrefFor({ name: "category", id: category.id })} onClick={(event) => { event.preventDefault(); go(hrefFor({ name: "category", id: category.id })); }} className="btn btn-outline !min-h-0 !py-2">Edit</a>
              <button
                type="button"
                className="btn btn-outline !min-h-0 !py-2"
                onClick={async () => {
                  if (!confirm(`Delete ${category.name}? Products stay in the catalog.`)) return;
                  try {
                    await deleteCategory(category.id, "unassign");
                    await onRefresh();
                    onStatus(`Deleted ${category.name}.`);
                  } catch (error) {
                    onError(error instanceof Error ? error.message : "Delete failed.");
                  }
                }}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CategoryEditor({
  category,
  media,
  onStatus,
  onError,
  onRefresh,
}: {
  category?: RemoteCategory;
  media: RemoteMedia[];
  onStatus: (value: string) => void;
  onError: (value: string) => void;
  onRefresh: () => Promise<void>;
}) {
  return (
    <form
      className="max-w-xl space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        try {
          const saved = await saveCategory({
            id: category?.id,
            name: String(data.get("name") ?? ""),
            description: String(data.get("description") ?? ""),
            imageId: String(data.get("imageId") ?? "") || undefined,
            isPublished: data.get("isPublished") === "on",
          });
          await onRefresh();
          onStatus("Category saved.");
          go(hrefFor({ name: "category", id: saved.id }));
        } catch (error) {
          onError(error instanceof Error ? error.message : "Could not save.");
        }
      }}
    >
      <h1 className="text-2xl">{category ? category.name : "Add category"}</h1>
      <label className="block">
        <span className="field-label">Name</span>
        <input name="name" required className="field-input" defaultValue={category?.name ?? ""} />
      </label>
      <label className="block">
        <span className="field-label">Description</span>
        <textarea name="description" rows={3} className="field-input" defaultValue={category?.description ?? ""} />
      </label>
      <label className="block">
        <span className="field-label">Cover image</span>
        <select name="imageId" className="field-input" defaultValue={category?.imageId ?? ""}>
          <option value="">None</option>
          {media.map((item) => (
            <option key={item.id} value={item.id}>{item.originalName}</option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isPublished" defaultChecked={category?.isPublished ?? true} />
        Published
      </label>
      <button type="submit" className="btn btn-primary">Save category</button>
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
              for (const file of files) {
                const processed = await fileToVariants(file, "product");
                await saveMedia({
                  id: newId("img"),
                  filename: file.name,
                  originalName: file.name,
                  mimeType: "image/webp",
                  kind: "product",
                  width: processed.width,
                  height: processed.height,
                  bytes: processed.bytes,
                  variants: JSON.stringify(processed.variants),
                  alt: null,
                  originalData: processed.originalData,
                  createdAt: new Date().toISOString(),
                });
              }
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
          const src = mediaSrc(item, "card");
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
  media,
  onStatus,
  onError,
  onRefresh,
}: {
  settings: RemoteSettings;
  media: RemoteMedia[];
  onStatus: (value: string) => void;
  onError: (value: string) => void;
  onRefresh: () => Promise<void>;
}) {
  return (
    <form
      className="max-w-2xl space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        try {
          await saveSettings({
            businessName: String(data.get("businessName") ?? ""),
            tagline: String(data.get("tagline") ?? "") || null,
            address: String(data.get("address") ?? "") || null,
            phone: String(data.get("phone") ?? "") || null,
            email: String(data.get("email") ?? "") || null,
            whatsappNumber: String(data.get("whatsappNumber") ?? "").replace(/\D/g, ""),
            whatsappGeneralMessage: String(data.get("whatsappGeneralMessage") ?? ""),
            whatsappProductMessage: String(data.get("whatsappProductMessage") ?? ""),
            siteTitle: String(data.get("siteTitle") ?? ""),
            siteDescription: String(data.get("siteDescription") ?? ""),
            logoId: String(data.get("logoId") ?? "") || null,
          });
          await onRefresh();
          onStatus("Settings saved. The public site updates immediately.");
        } catch (error) {
          onError(error instanceof Error ? error.message : "Could not save settings.");
        }
      }}
    >
      <h1 className="text-2xl">Settings</h1>
      <label className="block"><span className="field-label">Business name</span><input name="businessName" className="field-input" defaultValue={settings.businessName} required /></label>
      <label className="block"><span className="field-label">Tagline</span><input name="tagline" className="field-input" defaultValue={settings.tagline ?? ""} /></label>
      <label className="block"><span className="field-label">WhatsApp number</span><input name="whatsappNumber" className="field-input" defaultValue={settings.whatsappNumber} /></label>
      <label className="block"><span className="field-label">General WhatsApp message</span><textarea name="whatsappGeneralMessage" rows={3} className="field-input" defaultValue={settings.whatsappGeneralMessage} /></label>
      <label className="block"><span className="field-label">Product WhatsApp message</span><textarea name="whatsappProductMessage" rows={4} className="field-input" defaultValue={settings.whatsappProductMessage} /></label>
      <label className="block"><span className="field-label">Address</span><textarea name="address" rows={2} className="field-input" defaultValue={settings.address ?? ""} /></label>
      <label className="block"><span className="field-label">Phone</span><input name="phone" className="field-input" defaultValue={settings.phone ?? ""} /></label>
      <label className="block"><span className="field-label">Email</span><input name="email" className="field-input" defaultValue={settings.email ?? ""} /></label>
      <label className="block"><span className="field-label">Site title</span><input name="siteTitle" className="field-input" defaultValue={settings.siteTitle} /></label>
      <label className="block"><span className="field-label">Site description</span><textarea name="siteDescription" rows={2} className="field-input" defaultValue={settings.siteDescription} /></label>
      <label className="block">
        <span className="field-label">Logo</span>
        <select name="logoId" className="field-input" defaultValue={settings.logoId ?? ""}>
          <option value="">None</option>
          {media.map((item) => (
            <option key={item.id} value={item.id}>{item.originalName}</option>
          ))}
        </select>
      </label>
      <button type="submit" className="btn btn-primary">Save settings</button>
    </form>
  );
}
