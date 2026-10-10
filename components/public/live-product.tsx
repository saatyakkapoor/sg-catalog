"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { mediaSrc } from "@/lib/media";
import {
  getSettings,
  listCategories,
  subscribeProducts,
  type RemoteCategory,
  type RemoteProduct,
  type RemoteSettings,
} from "@/lib/remote-db";
import { ancestorsOf } from "@/lib/catalog-tree";
import { buildWhatsAppUrl, fillTemplate } from "@/lib/whatsapp";
import { formatDesignLabel } from "@/lib/design-number";
import { AddToEnquiryButton } from "@/components/public/enquiry-bar";
import { WhatsAppIcon } from "@/components/icons";
import { siteUrl } from "@/lib/site-public";

export function LiveProductView({ slug }: { slug: string }) {
  const [product, setProduct] = useState<RemoteProduct | null | undefined>(undefined);
  const [settings, setSettings] = useState<RemoteSettings | null>(null);
  const [categories, setCategories] = useState<RemoteCategory[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    getSettings().then(setSettings).catch(() => undefined);
    listCategories(true).then(setCategories).catch(() => undefined);
    return subscribeProducts(undefined, (products) => {
      setProduct(products.find((item) => item.slug === slug) ?? null);
    });
  }, [slug]);

  const images = useMemo(() => {
    if (!product) return [];
    const extras = product.images
      .map((image) => mediaSrc(image, "detail") || mediaSrc(image, "card"))
      .filter((src): src is string => Boolean(src));
    return [product.coverUrl, ...extras].filter(
      (src, index, list): src is string => Boolean(src) && list.indexOf(src) === index
    );
  }, [product]);

  if (product === undefined) {
    return <p className="container-page py-16 text-sm text-ink-500">Loading design…</p>;
  }
  if (!product) {
    return (
      <main className="container-page py-16 text-center">
        <h1 className="text-2xl">Design not found</h1>
        <Link href="/catalog/" className="btn btn-outline mt-4">
          Back to catalog
        </Link>
      </main>
    );
  }

  const image = images[active] ?? null;
  const crumb = ancestorsOf(product.categoryId, categories);
  const href = settings
    ? buildWhatsAppUrl(
        settings.whatsappNumber,
        fillTemplate(settings.whatsappProductMessage, {
          productName: formatDesignLabel(product.designNumber),
          designNumber: formatDesignLabel(product.designNumber),
          categoryName: crumb.map((item) => item.name).join(" / "),
          businessName: settings.businessName,
          productUrl: `${siteUrl()}/product/${product.slug}/`,
        })
      )
    : null;

  return (
    <main className="container-page py-8 sm:py-12">
      <nav className="mb-6 text-sm text-ink-400">
        <Link href="/catalog/" className="hover:text-ink-800">
          Catalog
        </Link>
        {crumb.map((node) => (
          <span key={node.id}>
            <span className="px-1.5">/</span>
            <Link href={`/category/${node.slug}/`} className="hover:text-ink-800">
              {node.name}
            </Link>
          </span>
        ))}
        <span className="px-1.5">/</span>
        <span className="text-ink-700">{formatDesignLabel(product.designNumber)}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)] lg:items-start">
        <div>
          {image ? (
            <img
              src={image}
              alt={formatDesignLabel(product.designNumber)}
              className="w-full rounded-card border border-line bg-cream-200 object-cover"
            />
          ) : (
            <div className="grid aspect-square place-items-center rounded-card border border-dashed border-line text-sm text-ink-400">
              Photo coming soon
            </div>
          )}
          {images.length > 1 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {images.map((src, index) => (
                <li key={src}>
                  <button
                    type="button"
                    onClick={() => setActive(index)}
                    className={`overflow-hidden rounded-lg border ${
                      active === index ? "border-gold-500 ring-2 ring-gold-400/40" : "border-line"
                    }`}
                    aria-label={`Show photo ${index + 1}`}
                  >
                    <img src={src} alt="" className="h-16 w-16 object-cover" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="lg:sticky lg:top-24">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-600">Design</p>
          <h1 className="mt-2 text-3xl text-ink-900 sm:text-4xl">
            {formatDesignLabel(product.designNumber)}
          </h1>
          {crumb.length > 0 ? (
            <p className="mt-2 text-sm text-ink-400">{crumb.map((item) => item.name).join(" / ")}</p>
          ) : null}
          {product.sizes.length > 0 ? (
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Available sizes</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <li key={size} className="rounded-full border border-line bg-panel px-3 py-1.5 text-sm text-ink-700">
                    {size}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {product.description ? (
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-ink-600">{product.description}</p>
          ) : (
            <p className="mt-5 text-sm text-ink-400">
              Message us on WhatsApp with this design number for price and availability.
            </p>
          )}
          <div className="mt-6 space-y-2">
            <AddToEnquiryButton
              item={{
                id: product.id,
                designNumber: product.designNumber,
                name: product.designNumber,
                imageSrc: image,
                slug: product.slug,
              }}
            />
            {href ? (
              <a href={href} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp w-full">
                <WhatsAppIcon className="h-[18px] w-[18px]" />
                {settings?.enquiryButtonLabel || "Enquire on WhatsApp"}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
