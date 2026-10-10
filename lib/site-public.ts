export type SocialLink = { label: string; url: string };

export function socialLinksFrom(settings: {
  instagramUrl: string | null;
  facebookUrl: string | null;
  youtubeUrl: string | null;
  twitterUrl: string | null;
  linkedinUrl: string | null;
}): SocialLink[] {
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
  if (!raw) return "https://shagun-digital.web.app";
  return raw.replace(/\/+$/, "");
}
