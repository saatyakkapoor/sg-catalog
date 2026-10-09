"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { mediaSrc } from "@/lib/media";
import {
  getSettings,
  subscribeProducts,
  type RemoteProduct,
  type RemoteSettings,
} from "@/lib/remote-db";
import { buildWhatsAppUrl, fillTemplate } from "@/lib/whatsapp";
import { formatDesignLabel } from "@/lib/design-number";
import { AddToEnquiryButton } from "@/components/public/enquiry-bar";
import { WhatsAppIcon } from "@/components/icons";

export function LiveProductView({ slug }: { slug: string }) {
  const [product, setProduct] = useState<RemoteProduct | null | undefined>(
    undefined
  );
  const [settings, setSettings] = useState<RemoteSettings | null>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    getSettings().then(setSettings).catch(() => undefined);
    return subscribeProducts(undefined, (products) => {
      setProduct(products.find((item) => item.slug === slug) ?? null);
    });
  }, [slug]);

  const images = useMemo(() => {
    if (!product) return [];
    const extras = product.images
      .map((image) => mediaSrc(image, "detail") || mediaSrc(image, "card"))
      .filter((src): src is string => Boolean(src));
    const cover = product.coverUrl;
    const unique = [cover, ...extras].filter(
      (src, index, list): src is string => Boolean(src) && list.indexOf(src) === index
    );
    return unique;
  }, [product]);

  if (product === undefined) {
    return (
      <p className="container-page py-16 text-sm text-ink-500">
        Loading design…
      </p>
    );
  }
  if (!product) {
    return (
      <main className="container-page py-16 text-center">
        <h1 className="text-2xl">Design not found</h1>
        <p className="mt-2 text-sm text-ink-400">
          It may have been removed or is not published yet.
        </p>
        <Link href="/catalog/" className="btn btn-outline mt-4">
          Back to catalog
        </Link>
      </main>
    );
  }

  const image = images[active] ?? null;
  const href = settings
    ? buildWhatsAppUrl(
        settings.whatsappNumber,
        fillTemplate(settings.whatsappProductMessage, {
          productName: product.name,
          designNumber: formatDesignLabel(product.designNumber),
          categoryName: product.categoryName ?? "",
          businessName: settings.businessName,
        })
      )
    : null;

  return (
    <main className="container-page py-8 sm:py-12">
      <nav className="mb-6 text-sm text-ink-400">
        <Link href="/catalog/" className="hover:text-ink-800">
          Catalog
        </Link>
        {product.categorySlug && product.categoryName ? (
          <>
            <span className="px-1.5">/</span>
            <Link
              href={`/category/${product.categorySlug}/`}
              className="hover:text-ink-800"
            >
              {product.categoryName}
            </Link>
          </>
        ) : null}
        <span className="px-1.5">/</span>
        <span className="text-ink-700">
          {formatDesignLabel(product.designNumber)}
        </span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)] lg:items-start">
        <div>
          {image ? (
            <img
              src={image}
              alt={product.name}
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
                      active === index
                        ? "border-gold-500 ring-2 ring-gold-400/40"
                        : "border-line"
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
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-600">
            {formatDesignLabel(product.designNumber)}
          </p>
          <h1 className="mt-2 text-3xl text-ink-900 sm:text-4xl">
            {product.name}
          </h1>
          {product.categoryName ? (
            <p className="mt-2 text-sm text-ink-400">{product.categoryName}</p>
          ) : null}
          {product.description ? (
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-ink-600">
              {product.description}
            </p>
          ) : (
            <p className="mt-5 text-sm text-ink-400">
              Message us on WhatsApp with this SD number for price, fabric and
              availability.
            </p>
          )}

          <div className="mt-6 space-y-2">
            <AddToEnquiryButton
              item={{
                id: product.id,
                designNumber: product.designNumber,
                name: product.name,
                imageSrc: image,
                slug: product.slug,
              }}
            />
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-whatsapp w-full"
              >
                <WhatsAppIcon className="h-[18px] w-[18px]" />
                Enquire this design
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
