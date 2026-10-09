import Image from "next/image";
import Link from "next/link";
import type { CatalogProduct } from "@/lib/catalog";
import { mediaAlt, mediaSrc } from "@/lib/media";
import { ImageIcon, WhatsAppIcon } from "@/components/icons";

export function ProductCard({
  product,
  whatsappHref,
  priority = false,
}: {
  product: CatalogProduct;
  whatsappHref: string | null;
  priority?: boolean;
}) {
  const src = mediaSrc(product.image, "card");

  return (
    <article className="group flex w-full flex-col overflow-hidden rounded-card border border-line bg-elevated transition-shadow hover:shadow-md">
      <Link
        href={`/product/${product.slug}`}
        className="relative block aspect-[4/5] overflow-hidden bg-cream-200"
        aria-label={`View Design No. ${product.designNumber}, ${product.name}`}
      >
        {src ? (
          <Image
            src={src}
            alt={mediaAlt(
              product.image,
              `${product.name} — Design No. ${product.designNumber}`
            )}
            fill
            sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 46vw"
            priority={priority}
            loading={priority ? undefined : "lazy"}
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-ink-400">
            <ImageIcon className="h-7 w-7" />
            <span className="text-xs">Image coming soon</span>
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gold-600">
          SD {product.designNumber.replace(/^sd[\s._-]*/i, "")}
        </p>
        <h3 className="mt-1 line-clamp-2 font-display text-[15px] leading-snug text-ink-900 sm:text-base">
          <Link href={`/product/${product.slug}`}>{product.name}</Link>
        </h3>
        {product.categoryName && product.categorySlug ? (
          <Link
            href={`/category/${product.categorySlug}`}
            className="mt-0.5 inline-block self-start py-1 text-xs text-ink-400 transition-colors hover:text-ink-700"
          >
            {product.categoryName}
          </Link>
        ) : null}

        <div className="mt-3.5 flex-1" />

        {whatsappHref ? (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-whatsapp !min-h-0 w-full !py-2.5 text-sm"
            aria-label={`Enquire on WhatsApp about Design No. ${product.designNumber}`}
          >
            <WhatsAppIcon className="h-[18px] w-[18px]" />
            Enquire
          </a>
        ) : (
          <Link
            href={`/product/${product.slug}`}
            className="btn btn-outline !min-h-0 w-full !py-2.5 text-sm"
          >
            View details
          </Link>
        )}
      </div>
    </article>
  );
}

export function ProductGrid({
  products,
  hrefFor,
  priorityCount = 4,
}: {
  products: CatalogProduct[];
  hrefFor: (product: CatalogProduct) => string | null;
  priorityCount?: number;
}) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
      {products.map((product, index) => (
        <li key={product.id} className="flex">
          <ProductCard
            product={product}
            whatsappHref={hrefFor(product)}
            priority={index < priorityCount}
          />
        </li>
      ))}
    </ul>
  );
}
