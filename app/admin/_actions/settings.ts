"use server";

import { z } from "zod";
import { requireAdmin } from "@/auth";
import { prisma } from "@/lib/db";
import {
  failure,
  guard,
  revalidateSite,
  success,
  type ActionResult,
} from "@/lib/action-result";
import { SETTINGS_ID } from "@/lib/settings";
import { reprocessAllProductMedia } from "@/lib/images.server";
import { clampWatermarkConfig } from "@/lib/watermark";
import {
  describeWhatsAppNumberError,
  sanitizeWhatsAppNumber,
} from "@/lib/whatsapp";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null));

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null))
  .refine(
    (value) => value === null || /^https?:\/\//i.test(value),
    "Links must start with http:// or https://"
  );

const settingsSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(1, "Enter your business name.")
    .max(80, "Keep the business name under 80 characters."),
  tagline: optionalText(160),
  logoId: z.string().trim().optional(),
  address: optionalText(500),
  phone: optionalText(40),
  email: z
    .string()
    .trim()
    .max(160)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null))
    .refine(
      (value) => value === null || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value),
      "Enter a valid email address."
    ),
  footerText: optionalText(500),

  whatsappNumber: z.string().trim().max(30),
  whatsappGeneralMessage: z
    .string()
    .trim()
    .min(1, "Enter the general enquiry message.")
    .max(1000),
  whatsappProductMessage: z
    .string()
    .trim()
    .min(1, "Enter the product enquiry message.")
    .max(1000),

  mapEmbedUrl: optionalText(1000),
  mapLink: optionalText(1000),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),

  instagramUrl: optionalUrl,
  facebookUrl: optionalUrl,
  youtubeUrl: optionalUrl,
  twitterUrl: optionalUrl,
  linkedinUrl: optionalUrl,

  watermarkEnabled: z.boolean(),
  watermarkLogoId: z.string().trim().optional(),
  watermarkOpacity: z.number(),
  watermarkScale: z.number(),
  watermarkRotation: z.number(),
  watermarkRepetitions: z.number(),

  siteTitle: z.string().trim().min(1, "Enter a website title.").max(80),
  siteDescription: z.string().trim().min(1, "Enter a website description.").max(300),
  defaultSort: z.enum(["manual", "newest", "oldest", "designNumber"]),
});

function num(formData: FormData, key: string, fallback: number): number {
  const raw = formData.get(key);
  const parsed = typeof raw === "string" ? Number.parseFloat(raw) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nullableNum(formData: FormData, key: string): number | null {
  const raw = formData.get(key);
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Accepts a full Google Maps iframe snippet or a bare URL, returning just the
 * embed URL so the admin can paste whatever Google gives them.
 */
function normaliseEmbed(value: string | null): string | null {
  if (!value) return null;
  const iframeMatch = value.match(/src=["']([^"']+)["']/i);
  const candidate = (iframeMatch?.[1] ?? value).trim();
  if (!/^https?:\/\//i.test(candidate)) return null;
  return candidate;
}

export async function updateSettingsAction(
  formData: FormData
): Promise<ActionResult<{ reprocessed?: number }>> {
  return guard(async () => {
    await requireAdmin();

    const parsed = settingsSchema.safeParse({
      businessName: formData.get("businessName") ?? "",
      tagline: formData.get("tagline") ?? "",
      logoId: formData.get("logoId") ?? "",
      address: formData.get("address") ?? "",
      phone: formData.get("phone") ?? "",
      email: formData.get("email") ?? "",
      footerText: formData.get("footerText") ?? "",

      whatsappNumber: formData.get("whatsappNumber") ?? "",
      whatsappGeneralMessage: formData.get("whatsappGeneralMessage") ?? "",
      whatsappProductMessage: formData.get("whatsappProductMessage") ?? "",

      mapEmbedUrl: formData.get("mapEmbedUrl") ?? "",
      mapLink: formData.get("mapLink") ?? "",
      latitude: nullableNum(formData, "latitude"),
      longitude: nullableNum(formData, "longitude"),

      instagramUrl: formData.get("instagramUrl") ?? "",
      facebookUrl: formData.get("facebookUrl") ?? "",
      youtubeUrl: formData.get("youtubeUrl") ?? "",
      twitterUrl: formData.get("twitterUrl") ?? "",
      linkedinUrl: formData.get("linkedinUrl") ?? "",

      watermarkEnabled: formData.get("watermarkEnabled") === "on",
      watermarkLogoId: formData.get("watermarkLogoId") ?? "",
      watermarkOpacity: num(formData, "watermarkOpacity", 0.18),
      watermarkScale: num(formData, "watermarkScale", 0.22),
      watermarkRotation: num(formData, "watermarkRotation", -30),
      watermarkRepetitions: num(formData, "watermarkRepetitions", 4),

      siteTitle: formData.get("siteTitle") ?? "",
      siteDescription: formData.get("siteDescription") ?? "",
      defaultSort: formData.get("defaultSort") ?? "manual",
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        fieldErrors[key] ??= issue.message;
      }
      return failure(
        parsed.error.issues[0]?.message ?? "Check the form and try again.",
        fieldErrors
      );
    }
    const input = parsed.data;

    // WhatsApp is the core of the site, so validate the number properly but
    // still allow clearing it entirely.
    const whatsappDigits = sanitizeWhatsAppNumber(input.whatsappNumber);
    if (whatsappDigits) {
      const problem = describeWhatsAppNumberError(whatsappDigits);
      if (problem) {
        return failure(problem, { whatsappNumber: problem });
      }
    }

    const previous = await prisma.settings.findUnique({
      where: { id: SETTINGS_ID },
      select: {
        watermarkEnabled: true,
        watermarkLogoId: true,
        watermarkOpacity: true,
        watermarkScale: true,
        watermarkRotation: true,
        watermarkRepetitions: true,
        logoId: true,
      },
    });

    const watermark = clampWatermarkConfig({
      opacity: input.watermarkOpacity,
      scale: input.watermarkScale,
      rotation: input.watermarkRotation,
      repetitions: input.watermarkRepetitions,
    });

    const data = {
      businessName: input.businessName,
      tagline: input.tagline,
      logoId: input.logoId || null,
      address: input.address,
      phone: input.phone,
      email: input.email,
      footerText: input.footerText,

      whatsappNumber: whatsappDigits,
      whatsappGeneralMessage: input.whatsappGeneralMessage,
      whatsappProductMessage: input.whatsappProductMessage,

      mapEmbedUrl: normaliseEmbed(input.mapEmbedUrl),
      mapLink: input.mapLink,
      latitude: input.latitude,
      longitude: input.longitude,

      instagramUrl: input.instagramUrl,
      facebookUrl: input.facebookUrl,
      youtubeUrl: input.youtubeUrl,
      twitterUrl: input.twitterUrl,
      linkedinUrl: input.linkedinUrl,

      watermarkEnabled: input.watermarkEnabled,
      watermarkLogoId: input.watermarkLogoId || null,
      watermarkOpacity: watermark.opacity,
      watermarkScale: watermark.scale,
      watermarkRotation: watermark.rotation,
      watermarkRepetitions: watermark.repetitions,

      siteTitle: input.siteTitle,
      siteDescription: input.siteDescription,
      defaultSort: input.defaultSort,
    };

    await prisma.settings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...data },
      update: data,
    });

    // The effective watermark logo falls back to the brand logo, so changes to
    // either one can alter every public image.
    const effectiveBefore = previous
      ? (previous.watermarkLogoId ?? previous.logoId)
      : null;
    const effectiveAfter = data.watermarkLogoId ?? data.logoId;

    const watermarkChanged =
      !previous ||
      previous.watermarkEnabled !== data.watermarkEnabled ||
      effectiveBefore !== effectiveAfter ||
      previous.watermarkOpacity !== data.watermarkOpacity ||
      previous.watermarkScale !== data.watermarkScale ||
      previous.watermarkRotation !== data.watermarkRotation ||
      previous.watermarkRepetitions !== data.watermarkRepetitions;

    const shouldReprocess =
      watermarkChanged && formData.get("reprocessImages") !== "off";

    let reprocessed: number | undefined;
    if (shouldReprocess) {
      const result = await reprocessAllProductMedia();
      reprocessed = result.updated;
    }

    revalidateSite();

    if (reprocessed !== undefined && reprocessed > 0) {
      return success(
        `Settings saved. ${reprocessed} product image(s) were re-watermarked.`,
        { reprocessed }
      );
    }
    if (watermarkChanged && !shouldReprocess) {
      return success(
        "Settings saved. Existing images keep their current watermark; new uploads use the new settings."
      );
    }
    return success("Settings saved.");
  });
}
