import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { generalEnquiryUrl } from "@/lib/enquiry";
import { formatWhatsAppNumberForDisplay } from "@/lib/whatsapp";
import {
  MapEmbed,
  buildDirectionsUrl,
  buildEmbedUrl,
} from "@/components/public/map-embed";
import { WhatsAppLink } from "@/components/public/whatsapp-link";
import { MailIcon, MapPinIcon, PhoneIcon, WhatsAppIcon } from "@/components/icons";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: "Contact",
    description: `Get in touch with ${settings.businessName} on WhatsApp, by phone or email, or visit us in person.`,
    alternates: { canonical: "/contact" },
  };
}

export default async function ContactPage() {
  const settings = await getSettings();
  const generalHref = generalEnquiryUrl(settings);

  const embedUrl = buildEmbedUrl(settings);
  const directionsUrl = buildDirectionsUrl(settings);

  const rows = [
    settings.phone
      ? {
          key: "phone",
          Icon: PhoneIcon,
          label: "Phone",
          value: settings.phone,
          href: `tel:${settings.phone.replace(/[^\d+]/g, "")}`,
        }
      : null,
    generalHref
      ? {
          key: "whatsapp",
          Icon: WhatsAppIcon,
          label: "WhatsApp",
          value: formatWhatsAppNumberForDisplay(settings.whatsappNumber),
          href: generalHref,
        }
      : null,
    settings.email
      ? {
          key: "email",
          Icon: MailIcon,
          label: "Email",
          value: settings.email,
          href: `mailto:${settings.email}`,
        }
      : null,
  ].filter((row): row is NonNullable<typeof row> => row !== null);

  return (
    <main className="container-page py-8 sm:py-12">
      <div className="max-w-2xl">
        <h1 className="text-2xl text-ink-900 sm:text-3xl lg:text-4xl">
          Contact {settings.businessName}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-500 sm:text-base">
          WhatsApp is the fastest way to reach us. Send the design number you are
          interested in and we will reply with the price and details.
        </p>
      </div>

      <div className="mt-8">
        <WhatsAppLink
          href={generalHref}
          label="Start a WhatsApp enquiry"
          className="btn btn-whatsapp !min-h-14 w-full text-base sm:w-auto"
          fallbackNote="WhatsApp enquiries are not available right now. Please use the details below."
        />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div>
          <h2 className="text-lg text-ink-900">Reach us</h2>
          {rows.length === 0 ? (
            <p className="mt-3 text-sm text-ink-500">
              Contact details are being updated. Please check back shortly.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-line overflow-hidden rounded-card border border-line bg-elevated">
              {rows.map(({ key, Icon, label, value, href }) => (
                <li key={key}>
                  <a
                    href={href}
                    target={key === "whatsapp" ? "_blank" : undefined}
                    rel={key === "whatsapp" ? "noopener noreferrer" : undefined}
                    className="flex min-h-14 items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-cream-100"
                  >
                    <Icon className="h-5 w-5 shrink-0 text-gold-500" />
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold uppercase tracking-wide text-ink-400">
                        {label}
                      </span>
                      <span className="block truncate text-sm text-ink-800">
                        {value}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}

          {settings.address ? (
            <div className="mt-7">
              <h2 className="text-lg text-ink-900">Our address</h2>
              <p className="mt-3 flex items-start gap-3 whitespace-pre-line text-sm leading-relaxed text-ink-600">
                <MapPinIcon className="mt-0.5 h-5 w-5 shrink-0 text-gold-500" />
                {settings.address}
              </p>
            </div>
          ) : null}
        </div>

        {embedUrl || directionsUrl || settings.address ? (
          <div>
            <h2 className="text-lg text-ink-900">Find us</h2>
            <div className="mt-4">
              <MapEmbed
                embedUrl={embedUrl}
                directionsUrl={directionsUrl}
                address={settings.address}
              />
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
