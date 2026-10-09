import type { SiteSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/settings";
import { buildWhatsAppUrl, fillTemplate } from "@/lib/whatsapp";
import { formatDesignLabel } from "@/lib/design-number";

/**
 * Turns the admin's message template into a ready-to-send WhatsApp link for a
 * specific design. Returns `null` when no valid number is configured.
 */
export function productEnquiryUrl(
  settings: SiteSettings,
  product: {
    name: string;
    designNumber: string;
    categoryName?: string | null;
    slug?: string;
  }
): string | null {
  const message = fillTemplate(settings.whatsappProductMessage, {
    productName: product.name,
    designNumber: formatDesignLabel(product.designNumber),
    categoryName: product.categoryName ?? "",
    businessName: settings.businessName,
    productUrl: product.slug ? `${siteUrl()}/product/${product.slug}` : "",
  });

  return buildWhatsAppUrl(settings.whatsappNumber, message);
}

export function generalEnquiryUrl(settings: SiteSettings): string | null {
  return buildWhatsAppUrl(
    settings.whatsappNumber,
    fillTemplate(settings.whatsappGeneralMessage, {
      businessName: settings.businessName,
    })
  );
}
