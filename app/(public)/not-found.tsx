import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { generalEnquiryUrl } from "@/lib/enquiry";
import { WhatsAppLink } from "@/components/public/whatsapp-link";
import { SearchBox } from "@/components/public/search-box";

export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default async function PublicNotFound() {
  const settings = await getSettings();
  const generalHref = generalEnquiryUrl(settings);

  return (
    <main className="container-page py-16 text-center sm:py-24">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-600">
        Not found
      </p>
      <h1 className="mx-auto mt-4 max-w-xl text-2xl text-ink-900 sm:text-3xl">
        We could not find that page
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-500">
        The design or category may have been removed or renamed. Try searching for
        the design number, or ask us on WhatsApp and we will send it to you.
      </p>

      <div className="mx-auto mt-7 max-w-md">
        <SearchBox placeholder="Search design number, e.g. 1025" />
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-2.5">
        <Link href="/catalog" className="btn btn-primary">
          Browse the catalog
        </Link>
        {generalHref ? (
          <WhatsAppLink href={generalHref} label="Ask on WhatsApp" />
        ) : null}
      </div>
    </main>
  );
}
