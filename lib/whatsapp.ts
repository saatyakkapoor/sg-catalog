/**
 * WhatsApp click-to-chat helpers.
 *
 * We deliberately avoid the WhatsApp Business API: a `wa.me` deep link opens
 * the customer's own WhatsApp with a pre-filled message, which is all this
 * business flow needs.
 */

import { formatDesignLabel } from "@/lib/design-number";

export const WHATSAPP_MIN_DIGITS = 8;
export const WHATSAPP_MAX_DIGITS = 15;

export type WhatsAppTemplateValues = {
  productName?: string;
  designNumber?: string;
  categoryName?: string;
  businessName?: string;
  productUrl?: string;
};

/** Strips spaces, dashes, brackets and a leading `+` so only digits remain. */
export function sanitizeWhatsAppNumber(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.replace(/\D/g, "");
}

/**
 * A valid click-to-chat number is digits only, in international format
 * (country code first, no leading zero), e.g. `919876543210`.
 */
export function isValidWhatsAppNumber(raw: string | null | undefined): boolean {
  const digits = sanitizeWhatsAppNumber(raw);
  if (digits.length < WHATSAPP_MIN_DIGITS || digits.length > WHATSAPP_MAX_DIGITS) {
    return false;
  }
  // A leading zero means a local trunk prefix was left in place.
  return !digits.startsWith("0");
}

export function describeWhatsAppNumberError(
  raw: string | null | undefined
): string | null {
  const digits = sanitizeWhatsAppNumber(raw);
  if (!digits) return "Enter a WhatsApp number.";
  if (digits.startsWith("0")) {
    return "Remove the leading zero and start with the country code (for India: 91).";
  }
  if (digits.length < WHATSAPP_MIN_DIGITS) {
    return "That number looks too short. Include the country code, e.g. 919876543210.";
  }
  if (digits.length > WHATSAPP_MAX_DIGITS) {
    return "That number looks too long. A WhatsApp number has at most 15 digits.";
  }
  return null;
}

/** Replaces `{placeholder}` tokens, dropping ones with no value. */
export function fillTemplate(
  template: string,
  values: WhatsAppTemplateValues
): string {
  const map: Record<string, string> = {
    productName: values.productName ?? "",
    designNumber: values.designNumber ?? "",
    categoryName: values.categoryName ?? "",
    businessName: values.businessName ?? "",
    productUrl: values.productUrl ?? "",
  };

  return template
    .replace(/\{(\w+)\}/g, (match, key: string) =>
      key in map ? map[key] : match
    )
    .split("\n")
    // Drop "Label:" lines whose value resolved to nothing.
    .filter((line) => !/^[^:]{1,40}:\s*$/.test(line.trim()) || line.trim() === "")
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Builds a `https://wa.me/<digits>?text=<message>` URL, or `null` when the
 * configured number is missing/invalid so callers can render a fallback.
 */
export function buildWhatsAppUrl(
  number: string | null | undefined,
  message: string
): string | null {
  if (!isValidWhatsAppNumber(number)) return null;
  const digits = sanitizeWhatsAppNumber(number);
  const text = message.trim();
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${digits}${query}`;
}

export function multiEnquiryMessage(designNumbers: string[]): string {
  const labels = designNumbers.map(formatDesignLabel);
  if (labels.length === 0) {
    return "Hello, I would like to make an enquiry regarding your designs.";
  }
  if (labels.length === 1) {
    return `Hello, I would like an enquiry for ${labels[0]}. Please share the price and details.`;
  }
  return `Hello, I would like an enquiry for these designs: ${labels.join(", ")}. Please share the price and details.`;
}

export function multiEnquiryUrl(
  whatsappNumber: string,
  designNumbers: string[]
): string | null {
  return buildWhatsAppUrl(whatsappNumber, multiEnquiryMessage(designNumbers));
}

/** Pretty display form, e.g. `+91 98765 43210`. */
export function formatWhatsAppNumberForDisplay(
  raw: string | null | undefined
): string {
  const digits = sanitizeWhatsAppNumber(raw);
  if (!digits) return "";
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  return `+${digits}`;
}
