import { cache } from "react";
import type { Media, Settings } from "@prisma/client";
import { prisma } from "@/lib/db";

export type SiteSettings = Settings & {
  logo: Media | null;
  watermarkLogo: Media | null;
};

export const SETTINGS_ID = "site";

/**
 * Reads the single settings row, creating it on first run so a fresh install
 * never renders against `null`. Memoised per request.
 */
export const getSettings = cache(async (): Promise<SiteSettings> => {
  const existing = await prisma.settings.findUnique({
    where: { id: SETTINGS_ID },
    include: { logo: true, watermarkLogo: true },
  });
  if (existing) return existing;

  return prisma.settings.create({
    data: { id: SETTINGS_ID },
    include: { logo: true, watermarkLogo: true },
  });
});

export type WatermarkSettings = {
  enabled: boolean;
  opacity: number;
  scale: number;
  rotation: number;
  repetitions: number;
  logo: Media | null;
};

export function watermarkSettingsFrom(settings: SiteSettings): WatermarkSettings {
  return {
    enabled: settings.watermarkEnabled,
    opacity: settings.watermarkOpacity,
    scale: settings.watermarkScale,
    rotation: settings.watermarkRotation,
    repetitions: settings.watermarkRepetitions,
    logo: settings.watermarkLogo ?? settings.logo,
  };
}

export type SocialLink = { label: string; url: string };

export function socialLinksFrom(settings: SiteSettings): SocialLink[] {
  const candidates: Array<{ label: string; url: string | null }> = [
    { label: "Instagram", url: settings.instagramUrl },
    { label: "Facebook", url: settings.facebookUrl },
    { label: "YouTube", url: settings.youtubeUrl },
    { label: "X", url: settings.twitterUrl },
    { label: "LinkedIn", url: settings.linkedinUrl },
  ];

  return candidates.flatMap(({ label, url }) =>
    url && url.trim() ? [{ label, url: url.trim() }] : []
  );
}

export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}
