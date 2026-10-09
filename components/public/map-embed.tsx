import { ExternalIcon, MapPinIcon } from "@/components/icons";

export type MapConfig = {
  embedUrl: string | null;
  directionsUrl: string | null;
  address: string | null;
};

/**
 * Builds a directions URL from whatever the admin provided: an explicit link,
 * coordinates, or the plain address.
 */
export function buildDirectionsUrl(input: {
  mapLink: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
}): string | null {
  if (input.mapLink) return input.mapLink;
  if (input.latitude !== null && input.longitude !== null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${input.latitude},${input.longitude}`;
  }
  if (input.address) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      input.address
    )}`;
  }
  return null;
}

/** Falls back to a coordinate-based embed when no embed URL was pasted. */
export function buildEmbedUrl(input: {
  mapEmbedUrl: string | null;
  latitude: number | null;
  longitude: number | null;
}): string | null {
  if (input.mapEmbedUrl) return input.mapEmbedUrl;
  if (input.latitude !== null && input.longitude !== null) {
    const delta = 0.01;
    const bbox = [
      input.longitude - delta,
      input.latitude - delta,
      input.longitude + delta,
      input.latitude + delta,
    ].join(",");
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&marker=${input.latitude},${input.longitude}`;
  }
  return null;
}

export function MapEmbed({
  embedUrl,
  directionsUrl,
  address,
  large = false,
}: MapConfig & { large?: boolean }) {
  if (!embedUrl && !directionsUrl && !address) return null;

  return (
    <div>
      {embedUrl ? (
        <div className="overflow-hidden rounded-xl border border-line">
          <iframe
            src={embedUrl}
            title="Our location on the map"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className={`block w-full border-0 ${large ? "h-[min(70vh,520px)]" : "h-64 sm:h-80"}`}
          />
        </div>
      ) : address ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-cream-300 bg-cream-50 p-4">
          <MapPinIcon className="mt-0.5 h-5 w-5 shrink-0 text-gold-500" />
          <p className="whitespace-pre-line text-sm text-ink-600">{address}</p>
        </div>
      ) : null}

      {directionsUrl ? (
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline mt-3"
        >
          <MapPinIcon className="h-[18px] w-[18px]" />
          Get directions
          <ExternalIcon className="h-4 w-4" />
        </a>
      ) : null}
    </div>
  );
}
