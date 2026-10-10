import type { Metadata } from "next";
import { getSettings, siteUrl } from "@/lib/settings";
import { EnquiryProvider } from "@/components/public/enquiry-selection";
import { LiveShell } from "@/components/public/live-shell";

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
  const settings = await getSettings();
  return (
    <EnquiryProvider>
      <LiveShell fallbackName={settings.businessName}>{children}</LiveShell>
    </EnquiryProvider>
  );
}
