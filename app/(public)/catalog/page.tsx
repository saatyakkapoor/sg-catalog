import type { Metadata } from "next";
import {
  findCatalogProducts,
  parseSort,
} from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { generalEnquiryUrl } from "@/lib/enquiry";
import { mediaSrc } from "@/lib/media";
import { LiveGallery } from "@/components/public/live-catalog";
import { WhatsAppLink } from "@/components/public/whatsapp-link";
import { SearchIcon } from "@/components/icons";

export const dynamic = "force-static";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();

  return {
    title: "Catalog",
    description: `Browse every design available from ${settings.businessName} and enquire on WhatsApp.`,
    alternates: { canonical: "/catalog" },
  };
}

export default async function CatalogPage() {
  const settings = await getSettings();
  const sort = parseSort(undefined, settings.defaultSort);

  const result = await findCatalogProducts({
    sort,
    page: 1,
    pageSize: 400,
  });

  const generalHref = generalEnquiryUrl(settings);

  const designs = result.products.map((product) => ({
    id: product.id,
    designNumber: product.designNumber,
    name: product.name,
    imageSrc: mediaSrc(product.image, "card"),
    slug: product.slug,
  }));

  return (
    <main>
      {result.products.length === 0 ? (
        <div className="mx-auto max-w-[1400px] px-5 py-16 text-center">
          <SearchIcon className="mx-auto h-8 w-8 text-ink-400" />
          <h1 className="mt-3 font-display text-3xl text-ink-800">
            Catalogue is being updated
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-400">
            New designs coming soon. Message us on WhatsApp and we will share
            the latest collection.
          </p>
          <div className="mt-5 flex justify-center">
            <WhatsAppLink
              href={generalHref}
              label="Ask us on WhatsApp"
              fallbackNote="WhatsApp enquiries will be available soon."
            />
          </div>
        </div>
      ) : (
        <LiveGallery fallback={designs} title="All Designs" />
      )}
    </main>
  );
}
