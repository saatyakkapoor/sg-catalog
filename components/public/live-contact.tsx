"use client";

import { useEffect, useState } from "react";
import { getSettings, type RemoteSettings } from "@/lib/remote-db";
import { formatWhatsAppNumberForDisplay, buildWhatsAppUrl } from "@/lib/whatsapp";
import { MapEmbed, buildDirectionsUrl, buildEmbedUrl } from "@/components/public/map-embed";
import { WhatsAppLink } from "@/components/public/whatsapp-link";
import { MailIcon, MapPinIcon, PhoneIcon, WhatsAppIcon } from "@/components/icons";

export function LiveContact() {
  const [settings, setSettings] = useState<RemoteSettings | null>(null);

  useEffect(() => {
    getSettings().then(setSettings).catch(() => undefined);
  }, []);

  if (!settings) return <p className="container-page py-16 text-sm text-ink-500">Loading contact details…</p>;

  const href = buildWhatsAppUrl(settings.whatsappNumber, settings.whatsappGeneralMessage);
  const rows = [
    settings.phone
      ? { key: "phone", Icon: PhoneIcon, label: "Phone", value: settings.phone, href: `tel:${settings.phone.replace(/[^\d+]/g, "")}` }
      : null,
    href
      ? { key: "whatsapp", Icon: WhatsAppIcon, label: "WhatsApp", value: formatWhatsAppNumberForDisplay(settings.whatsappNumber), href }
      : null,
    settings.email
      ? { key: "email", Icon: MailIcon, label: "Email", value: settings.email, href: `mailto:${settings.email}` }
      : null,
  ].filter((row): row is NonNullable<typeof row> => row !== null);

  return (
    <main className="container-page py-8 sm:py-12">
      <div className="max-w-2xl">
        <h1 className="text-2xl text-ink-900 sm:text-3xl">Contact {settings.businessName}</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-500 sm:text-base">
          WhatsApp is the fastest way to reach us. Send the design number you are interested in.
        </p>
      </div>
      <div className="mt-8">
        <WhatsAppLink
          href={href}
          label={settings.enquiryButtonLabel || "Start a WhatsApp enquiry"}
          className="btn btn-whatsapp !min-h-14 w-full text-base sm:w-auto"
        />
      </div>
      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-lg text-ink-900">Reach us</h2>
          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-card border border-line bg-elevated">
            {rows.map(({ key, Icon, label, value, href: rowHref }) => (
              <li key={key}>
                <a href={rowHref} className="flex min-h-14 items-center gap-3.5 px-4 py-3.5 hover:bg-cream-100">
                  <Icon className="h-5 w-5 shrink-0 text-gold-500" />
                  <span>
                    <span className="block text-xs font-semibold uppercase tracking-wide text-ink-400">{label}</span>
                    <span className="block text-sm text-ink-800">{value}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
          {settings.address ? (
            <p className="mt-7 flex items-start gap-3 whitespace-pre-line text-sm text-ink-600">
              <MapPinIcon className="mt-0.5 h-5 w-5 text-gold-500" />
              {settings.address}
            </p>
          ) : null}
        </div>
        <MapEmbed
          embedUrl={buildEmbedUrl(settings)}
          directionsUrl={buildDirectionsUrl(settings)}
          address={settings.address}
        />
      </div>
    </main>
  );
}
