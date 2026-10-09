import type { Metadata } from "next";
import { findPublishedCategories } from "@/lib/catalog";
import { getSettings, siteUrl, socialLinksFrom } from "@/lib/settings";
import { mediaSrc } from "@/lib/media";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import {
  buildDirectionsUrl,
  buildEmbedUrl,
} from "@/components/public/map-embed";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { FloatingWhatsApp } from "@/components/public/whatsapp-link";
import { EnquiryProvider } from "@/components/public/enquiry-selection";
import { EnquiryBar } from "@/components/public/enquiry-bar";
import { BackToTop } from "@/components/public/back-to-top";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const base = siteUrl();
  const logo = "/brand/logo.png";

  return {
    metadataBase: new URL(base),
    title: {
      default: `${settings.siteTitle} · ${settings.businessName}`,
      template: `%s · ${settings.businessName}`,
    },
    description: settings.siteDescription,
    applicationName: settings.businessName,
    icons: { icon: logo },
    openGraph: {
      type: "website",
      siteName: settings.businessName,
      title: `${settings.siteTitle} · ${settings.businessName}`,
      description: settings.siteDescription,
      url: base,
      images: [{ url: logo }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${settings.siteTitle} · ${settings.businessName}`,
      description: settings.siteDescription,
      images: [logo],
    },
    alternates: { canonical: base },
  };
}

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, categories] = await Promise.all([
    getSettings(),
    findPublishedCategories(),
  ]);

  const generalHref = buildWhatsAppUrl(
    settings.whatsappNumber,
    settings.whatsappGeneralMessage
  );
  const logoSrc = mediaSrc(settings.logo, "card") ?? "/brand/logo.png";

  return (
    <EnquiryProvider>
      <div className="flex min-h-screen flex-col">
        <a href="#main" className="skip-link">
          Skip to catalog
        </a>
        <SiteHeader
          businessName={settings.businessName}
          tagline={settings.tagline}
          logoSrc={logoSrc}
          whatsappHref={generalHref}
        />

        <div id="main" className="flex-1 pb-24">
          {children}
        </div>

        <SiteFooter
          businessName={settings.businessName}
          footerText={settings.footerText}
          logoSrc={logoSrc}
          address={settings.address}
          phone={settings.phone}
          email={settings.email}
          whatsappNumber={settings.whatsappNumber}
          whatsappHref={generalHref}
          categories={categories}
          social={socialLinksFrom(settings)}
          map={{
            embedUrl: buildEmbedUrl(settings),
            directionsUrl: buildDirectionsUrl(settings),
            address: settings.address,
          }}
        />

        <EnquiryBar whatsappNumber={settings.whatsappNumber} />
        <BackToTop />
        <FloatingWhatsApp href={generalHref} />
      </div>
    </EnquiryProvider>
  );
}
