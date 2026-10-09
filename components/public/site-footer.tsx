import Link from "next/link";
import type { CatalogCategory } from "@/lib/catalog";
import type { SocialLink } from "@/lib/settings";
import { MapEmbed, type MapConfig } from "@/components/public/map-embed";
import { WhatsAppLink } from "@/components/public/whatsapp-link";
import {
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  SocialIcon,
  WhatsAppIcon,
} from "@/components/icons";
import { formatWhatsAppNumberForDisplay } from "@/lib/whatsapp";

export function SiteFooter({
  businessName,
  footerText,
  address,
  phone,
  email,
  whatsappNumber,
  whatsappHref,
  categories,
  social,
  map,
}: {
  businessName: string;
  footerText: string | null;
  logoSrc?: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  whatsappNumber: string;
  whatsappHref: string | null;
  categories: CatalogCategory[];
  social: SocialLink[];
  map: MapConfig;
}) {
  const year = new Date().getFullYear();
  const hasMap = Boolean(map.embedUrl || map.directionsUrl);

  return (
    <footer className="mt-8 border-t border-line bg-panel">
      {hasMap ? (
        <div className="border-b border-line">
          <div className="mx-auto max-w-[1400px] px-5 py-10 sm:py-14">
            <h2 className="mb-5 text-center font-display text-2xl text-ink-800 sm:text-3xl">
              Find us
            </h2>
            <MapEmbed {...map} large />
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex max-w-[1400px] flex-col items-center gap-5 px-5 py-12 text-center">
        <img
          src="/brand/logo.png"
          alt={businessName}
          className="w-[min(46vw,230px)]"
        />
          <img
            src="/brand/tagline.png"
            alt="शगुन का साथ, भरोसे के साथ"
            className="brand-tagline w-[min(60vw,320px)]"
          />
        {footerText ? (
          <p className="max-w-xl text-sm leading-relaxed text-ink-400">
            {footerText}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-center gap-2">
          <WhatsAppLink
            href={whatsappHref}
            label="Chat on WhatsApp"
            className="btn btn-whatsapp"
            fallbackNote="WhatsApp enquiries will be available soon."
          />
          <Link href="/catalog" className="btn btn-outline">
            Browse designs
          </Link>
        </div>

        <address className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm not-italic text-ink-400">
          {address ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPinIcon className="h-4 w-4 text-gold-500" />
              {address.replace(/\n/g, ", ")}
            </span>
          ) : null}
          {phone ? (
            <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5 hover:text-ink-800">
              <PhoneIcon className="h-4 w-4 text-gold-500" />
              {phone}
            </a>
          ) : null}
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-ink-800"
            >
              <WhatsAppIcon className="h-4 w-4 text-gold-500" />
              {formatWhatsAppNumberForDisplay(whatsappNumber)}
            </a>
          ) : null}
          {email ? (
            <a href={`mailto:${email}`} className="inline-flex items-center gap-1.5 hover:text-ink-800">
              <MailIcon className="h-4 w-4 text-gold-500" />
              {email}
            </a>
          ) : null}
        </address>

        {categories.length > 0 ? (
          <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-ink-400">
            {categories.slice(0, 8).map((category) => (
              <Link
                key={category.id}
                href={`/category/${category.slug}`}
                className="py-1 hover:text-ink-800"
              >
                {category.name}
              </Link>
            ))}
          </nav>
        ) : null}

        {social.length > 0 ? (
          <ul className="flex gap-2">
            {social.map((link) => (
              <li key={link.label}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={link.label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink-500 transition-colors hover:border-gold-400 hover:text-ink-900"
                >
                  <SocialIcon label={link.label} />
                </a>
              </li>
            ))}
          </ul>
        ) : null}

        <p className="text-[12.5px] tracking-wide text-ink-400">
          © {year} {businessName} · Print design catalogue
        </p>
        <Link
          href="/admin"
          className="text-[11px] tracking-[0.18em] text-ink-400/70 uppercase hover:text-ink-600"
        >
          Owner login
        </Link>
      </div>
    </footer>
  );
}
