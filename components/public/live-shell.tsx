"use client";

import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { EnquiryBar } from "@/components/public/enquiry-bar";
import { BackToTop } from "@/components/public/back-to-top";
import { FloatingWhatsApp } from "@/components/public/whatsapp-link";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { buildDirectionsUrl, buildEmbedUrl } from "@/components/public/map-embed";
import { mediaSrc } from "@/lib/media";
import {
  getSettings,
  listCategories,
  type RemoteCategory,
  type RemoteSettings,
} from "@/lib/remote-db";
import { socialLinksFrom } from "@/lib/site-public";

export function LiveShell({
  children,
  fallbackName,
}: {
  children: React.ReactNode;
  fallbackName: string;
}) {
  const [settings, setSettings] = useState<RemoteSettings | null>(null);
  const [categories, setCategories] = useState<RemoteCategory[]>([]);

  useEffect(() => {
    getSettings().then(setSettings).catch(() => undefined);
    listCategories(true).then(setCategories).catch(() => undefined);
  }, []);

  const name = settings?.businessName || fallbackName;
  const whatsappHref = settings
    ? buildWhatsAppUrl(settings.whatsappNumber, settings.whatsappGeneralMessage)
    : null;
  const logoSrc = mediaSrc(settings?.logo, "card") ?? "/brand/logo.png";
  const roots = categories.filter((item) => !item.parentId && item.isPublished);

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="skip-link">
        Skip to catalog
      </a>
      <SiteHeader
        businessName={name}
        logoSrc={logoSrc}
        whatsappHref={whatsappHref}
        catalogLabel={settings?.navCatalogLabel}
        contactLabel={settings?.navContactLabel}
        enquireLabel={settings?.enquiryButtonLabel}
        categories={roots.map((item) => ({ href: `/category/${item.slug}/`, label: item.name }))}
      />
      <div id="main" className="flex-1 pb-24">
        {children}
      </div>
      <SiteFooter
        businessName={name}
        footerText={settings?.footerText ?? settings?.aboutText ?? null}
        logoSrc={logoSrc}
        address={settings?.address ?? null}
        phone={settings?.phone ?? null}
        email={settings?.email ?? null}
        whatsappNumber={settings?.whatsappNumber ?? ""}
        whatsappHref={whatsappHref}
        categories={roots.map((item) => ({
          id: item.id,
          name: item.name,
          slug: item.slug,
          description: item.description,
          image: null,
          productCount: item.productCount,
        }))}
        social={settings ? socialLinksFrom(settings) : []}
        map={{
          embedUrl: settings ? buildEmbedUrl(settings) : null,
          directionsUrl: settings ? buildDirectionsUrl(settings) : null,
          address: settings?.address ?? null,
        }}
      />
      {settings ? <EnquiryBar whatsappNumber={settings.whatsappNumber} /> : null}
      <BackToTop />
      <FloatingWhatsApp href={whatsappHref} label={settings?.enquiryButtonLabel} />
    </div>
  );
}
