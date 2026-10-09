import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  findCatalogProducts,
  findPublishedCategories,
  findPublishedCategoryBySlug,
  parseSort,
} from "@/lib/catalog";
import { getSettings, siteUrl } from "@/lib/settings";
import { generalEnquiryUrl } from "@/lib/enquiry";
import { mediaAlt, mediaSrc } from "@/lib/media";
import { LiveGallery } from "@/components/public/live-catalog";
import { CategoryFilter } from "@/components/public/category-filter";
import { WhatsAppLink } from "@/components/public/whatsapp-link";
import { ChevronRightIcon } from "@/components/icons";

export const dynamic = "force-static";

type Props = {
  params: Promise<{ slug: string }>;
};

/** Pre-render every published category at build time. */
export async function generateStaticParams() {
  const categories = await prisma.category.findMany({
    where: { isPublished: true },
    select: { slug: true },
  });
  return categories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [category, settings] = await Promise.all([
    findPublishedCategoryBySlug(slug),
    getSettings(),
  ]);

  if (!category) {
    return { title: "Category not found", robots: { index: false } };
  }

  const image = mediaSrc(category.image, "detail");
  const description =
    category.description?.trim() ||
    `Browse ${category._count.products} design${
      category._count.products === 1 ? "" : "s"
    } in ${category.name} from ${settings.businessName}. Enquire on WhatsApp for prices.`;

  return {
    title: category.name,
    description,
    alternates: { canonical: `/category/${category.slug}` },
    openGraph: {
      title: `${category.name} · ${settings.businessName}`,
      description,
      url: `${siteUrl()}/category/${category.slug}`,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;

  const category = await findPublishedCategoryBySlug(slug);
  if (!category) notFound();

  const settings = await getSettings();
  const sort = parseSort(undefined, settings.defaultSort);

  const [categories, result] = await Promise.all([
    findPublishedCategories(),
    findCatalogProducts({
      categorySlug: slug,
      sort,
      page: 1,
      pageSize: 400,
    }),
  ]);

  const generalHref = generalEnquiryUrl(settings);
  const heroSrc = mediaSrc(category.image, "detail");

  return (
    <main className="container-page py-8 sm:py-12">
      <nav aria-label="Breadcrumb" className="mb-5">
        <ol className="flex flex-wrap items-center gap-1 text-xs text-ink-400 [&_a]:inline-block [&_a]:py-1.5">
          <li>
            <Link href="/" className="hover:text-ink-700">
              Home
            </Link>
          </li>
          <ChevronRightIcon className="h-3.5 w-3.5" />
          <li>
            <Link href="/catalog" className="hover:text-ink-700">
              Catalog
            </Link>
          </li>
          <ChevronRightIcon className="h-3.5 w-3.5" />
          <li aria-current="page" className="font-medium text-ink-600">
            {category.name}
          </li>
        </ol>
      </nav>

      <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-center">
        {heroSrc ? (
          <Image
            src={heroSrc}
            alt={mediaAlt(category.image, category.name)}
            width={220}
            height={176}
            className="h-36 w-full shrink-0 rounded-card object-cover sm:h-44 sm:w-56"
            priority
          />
        ) : null}
        <div>
          <h1 className="text-2xl text-ink-900 sm:text-3xl lg:text-4xl">
            {category.name}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">
            {category.description?.trim() ||
              `${category._count.products} design${
                category._count.products === 1 ? "" : "s"
              } in this collection. Tap any design to enquire on WhatsApp.`}
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CategoryFilter
          categories={categories}
          activeSlug={category.slug}
        />
      </div>

      {result.products.length === 0 ? (
        <div className="rounded-card border border-dashed border-cream-300 p-10 text-center sm:p-14">
          <h2 className="text-xl text-ink-900">No designs here yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-500">
            This collection is being updated. Message us on WhatsApp and we will
            share what is available.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            <WhatsAppLink
              href={generalHref}
              label="Ask us on WhatsApp"
              fallbackNote="WhatsApp enquiries will be available soon."
            />
            <Link href="/catalog" className="btn btn-outline">
              Browse all designs
            </Link>
          </div>
        </div>
      ) : (
        <LiveGallery
          fallback={result.products.map((product) => ({
            id: product.id,
            designNumber: product.designNumber,
            name: product.name,
            imageSrc: mediaSrc(product.image, "card"),
            slug: product.slug,
          }))}
          title={category.name}
          categorySlug={category.slug}
          showBar={false}
        />
      )}
    </main>
  );
}
