"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { UploadedMedia } from "@/app/admin/_actions/media";
import { updateSettingsAction } from "@/app/admin/_actions/settings";
import { SingleImageField } from "@/components/admin/single-image-field";
import {
  SectionCard,
  StatusMessage,
  Toggle,
} from "@/components/admin/ui";
import {
  buildWhatsAppUrl,
  describeWhatsAppNumberError,
  fillTemplate,
  formatWhatsAppNumberForDisplay,
  sanitizeWhatsAppNumber,
} from "@/lib/whatsapp";
import { AlertIcon, CheckIcon, WhatsAppIcon } from "@/components/icons";

export type SettingsFormValues = {
  businessName: string;
  tagline: string;
  logo: UploadedMedia | null;
  address: string;
  phone: string;
  email: string;
  footerText: string;

  whatsappNumber: string;
  whatsappGeneralMessage: string;
  whatsappProductMessage: string;

  mapEmbedUrl: string;
  mapLink: string;
  latitude: string;
  longitude: string;

  instagramUrl: string;
  facebookUrl: string;
  youtubeUrl: string;
  twitterUrl: string;
  linkedinUrl: string;

  watermarkEnabled: boolean;
  watermarkLogo: UploadedMedia | null;
  watermarkOpacity: number;
  watermarkScale: number;
  watermarkRotation: number;
  watermarkRepetitions: number;

  siteTitle: string;
  siteDescription: string;
  defaultSort: string;
};

function Slider({
  name,
  label,
  min,
  max,
  step,
  value,
  onChange,
  format,
  hint,
}: {
  name: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
  hint?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="field-label" htmlFor={name}>
          {label}
        </label>
        <span className="text-xs font-semibold text-ink-600">{format(value)}</span>
      </div>
      <input
        id={name}
        name={name}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number.parseFloat(event.target.value))}
        className="h-11 w-full accent-[var(--color-gold-500)]"
      />
      {hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}

export function SettingsForm({ initial }: { initial: SettingsFormValues }) {
  const router = useRouter();
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const [whatsappNumber, setWhatsappNumber] = useState(initial.whatsappNumber);
  const [generalMessage, setGeneralMessage] = useState(
    initial.whatsappGeneralMessage
  );
  const [productMessage, setProductMessage] = useState(
    initial.whatsappProductMessage
  );

  const [watermarkEnabled, setWatermarkEnabled] = useState(
    initial.watermarkEnabled
  );
  const [watermarkLogoId, setWatermarkLogoId] = useState(
    initial.watermarkLogo?.id ?? ""
  );
  const [logoId, setLogoId] = useState(initial.logo?.id ?? "");
  const [opacity, setOpacity] = useState(initial.watermarkOpacity);
  const [scale, setScale] = useState(initial.watermarkScale);
  const [rotation, setRotation] = useState(initial.watermarkRotation);
  const [repetitions, setRepetitions] = useState(initial.watermarkRepetitions);
  const [reprocess, setReprocess] = useState(true);

  const numberProblem = whatsappNumber.trim()
    ? describeWhatsAppNumberError(whatsappNumber)
    : null;
  const testUrl = buildWhatsAppUrl(whatsappNumber, generalMessage);

  const effectiveWatermarkLogoId = watermarkLogoId || logoId;

  const previewUrl = useMemo(() => {
    const params = new URLSearchParams({
      logoId: watermarkEnabled ? effectiveWatermarkLogoId : "",
      opacity: String(opacity),
      scale: String(scale),
      rotation: String(rotation),
      repetitions: String(repetitions),
    });
    return `/api/admin/watermark-preview?${params.toString()}`;
  }, [
    watermarkEnabled,
    effectiveWatermarkLogoId,
    opacity,
    scale,
    rotation,
    repetitions,
  ]);

  const sampleProductMessage = fillTemplate(productMessage, {
    productName: "Hand-embroidered silk design",
    designNumber: "1025",
    categoryName: "Premium Collection",
    businessName: initial.businessName,
  });

  const onSubmit = (formData: FormData) => {
    startTransition(async () => {
      setFieldErrors({});
      setStatus({ ok: true, text: "Saving…" });
      const result = await updateSettingsAction(formData);
      if (!result.ok) {
        setStatus({ ok: false, text: result.error });
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      setStatus({ ok: true, text: result.message ?? "Settings saved." });
      router.refresh();
    });
  };

  return (
    <form action={onSubmit} className="space-y-6" noValidate>
      <SectionCard
        id="business"
        title="Business information"
        description="Shown in the header, footer and contact section of your website."
      >
        <div>
          <label className="field-label" htmlFor="businessName">
            Business name <span className="text-red-600">*</span>
          </label>
          <input
            id="businessName"
            name="businessName"
            required
            defaultValue={initial.businessName}
            className="field-input"
          />
          {fieldErrors.businessName ? (
            <p className="mt-1.5 text-xs font-medium text-red-600">
              {fieldErrors.businessName}
            </p>
          ) : null}
        </div>

        <div>
          <label className="field-label" htmlFor="tagline">
            Tagline (optional)
          </label>
          <input
            id="tagline"
            name="tagline"
            defaultValue={initial.tagline}
            className="field-input"
            placeholder="Handcrafted designs since 1998"
          />
        </div>

        <SingleImageField
          name="logoId"
          kind="logo"
          label="Brand logo"
          initial={initial.logo}
          previewClassName="h-24 w-24 object-contain p-1.5"
          hint="Used in the header, footer and — unless you choose a different one below — as the watermark. A PNG with a transparent background works best."
          onChange={(media) => setLogoId(media?.id ?? "")}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="phone">
              Phone number
            </label>
            <input
              id="phone"
              name="phone"
              defaultValue={initial.phone}
              className="field-input"
              placeholder="+91 98765 43210"
              inputMode="tel"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={initial.email}
              className="field-input"
              placeholder="hello@yourbusiness.com"
            />
            {fieldErrors.email ? (
              <p className="mt-1.5 text-xs font-medium text-red-600">
                {fieldErrors.email}
              </p>
            ) : null}
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="address">
            Address
          </label>
          <textarea
            id="address"
            name="address"
            rows={3}
            defaultValue={initial.address}
            className="field-input"
            placeholder={"Shop 12, Market Road\nCity, State 400001"}
          />
          <p className="field-hint">
            Shown in the footer and on the contact page. Line breaks are kept.
          </p>
        </div>
      </SectionCard>

      <SectionCard
        id="whatsapp"
        title="WhatsApp enquiries"
        description="Every enquiry button opens WhatsApp with a ready-made message addressed to this number."
      >
        <div>
          <label className="field-label" htmlFor="whatsappNumber">
            WhatsApp number (with country code)
          </label>
          <input
            id="whatsappNumber"
            name="whatsappNumber"
            value={whatsappNumber}
            onChange={(event) => setWhatsappNumber(event.target.value)}
            className="field-input"
            placeholder="919876543210"
            inputMode="numeric"
            aria-describedby="whatsapp-number-help"
          />
          <div id="whatsapp-number-help" className="mt-2 space-y-1.5">
            {numberProblem || fieldErrors.whatsappNumber ? (
              <p className="flex items-start gap-1.5 text-xs font-medium text-red-600">
                <AlertIcon className="mt-px h-3.5 w-3.5 shrink-0" />
                {fieldErrors.whatsappNumber ?? numberProblem}
              </p>
            ) : testUrl ? (
              <p className="flex items-center gap-1.5 text-xs font-medium text-green-700">
                <CheckIcon className="h-3.5 w-3.5 shrink-0" />
                Valid — enquiries will go to{" "}
                {formatWhatsAppNumberForDisplay(whatsappNumber)}
              </p>
            ) : (
              <p className="text-xs text-ink-400">
                Leave blank to hide all WhatsApp buttons. For India, start with 91
                and no leading zero — for example 919876543210.
              </p>
            )}
            {testUrl ? (
              <a
                href={testUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-whatsapp !min-h-0 !py-2 text-xs"
              >
                <WhatsAppIcon className="h-4 w-4" />
                Send yourself a test message
              </a>
            ) : null}
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="whatsappGeneralMessage">
            General enquiry message
          </label>
          <textarea
            id="whatsappGeneralMessage"
            name="whatsappGeneralMessage"
            rows={3}
            value={generalMessage}
            onChange={(event) => setGeneralMessage(event.target.value)}
            className="field-input"
          />
          <p className="field-hint">
            Used by the floating button and the &ldquo;Chat on WhatsApp&rdquo;
            links.
          </p>
        </div>

        <div>
          <label className="field-label" htmlFor="whatsappProductMessage">
            Product enquiry message
          </label>
          <textarea
            id="whatsappProductMessage"
            name="whatsappProductMessage"
            rows={7}
            value={productMessage}
            onChange={(event) => setProductMessage(event.target.value)}
            className="field-input font-mono text-[13px]"
          />
          <p className="field-hint">
            Use {"{productName}"}, {"{designNumber}"}, {"{categoryName}"} and{" "}
            {"{businessName}"} — they are replaced with the real details.
          </p>
          <div className="mt-3 rounded-lg bg-cream-100 p-3">
            <p className="mb-1.5 text-xs font-semibold text-ink-500">
              Preview for Design No. 1025
            </p>
            <p className="whitespace-pre-wrap text-sm text-ink-700">
              {sampleProductMessage || "Your message will appear here."}
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        id="map"
        title="Location and map"
        description="Show customers where you are, with a one-tap directions link."
      >
        <div>
          <label className="field-label" htmlFor="mapEmbedUrl">
            Google Maps embed
          </label>
          <textarea
            id="mapEmbedUrl"
            name="mapEmbedUrl"
            rows={3}
            defaultValue={initial.mapEmbedUrl}
            className="field-input font-mono text-[13px]"
            placeholder="Paste the whole &lt;iframe&gt; code from Google Maps, or just its link"
          />
          <p className="field-hint">
            In Google Maps: Share → Embed a map → Copy HTML. Paste it here — the
            link is extracted for you.
          </p>
        </div>

        <div>
          <label className="field-label" htmlFor="mapLink">
            Directions link (optional)
          </label>
          <input
            id="mapLink"
            name="mapLink"
            defaultValue={initial.mapLink}
            className="field-input"
            placeholder="https://maps.app.goo.gl/…"
          />
          <p className="field-hint">
            Used by the &ldquo;Get directions&rdquo; button. If left blank, your
            address or coordinates are used instead.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="latitude">
              Latitude (optional)
            </label>
            <input
              id="latitude"
              name="latitude"
              defaultValue={initial.latitude}
              className="field-input"
              placeholder="19.0760"
              inputMode="decimal"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="longitude">
              Longitude (optional)
            </label>
            <input
              id="longitude"
              name="longitude"
              defaultValue={initial.longitude}
              className="field-input"
              placeholder="72.8777"
              inputMode="decimal"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        id="watermark"
        title="Image watermark"
        description="Your logo is stamped onto every product image when it is uploaded. Customers only ever see the watermarked version."
      >
        <Toggle
          name="watermarkEnabled"
          label="Watermark product images"
          description="Strongly recommended so your designs cannot be reused as-is."
          checked={watermarkEnabled}
          onChange={setWatermarkEnabled}
        />

        <div className={watermarkEnabled ? "space-y-4" : "space-y-4 opacity-50"}>
          <SingleImageField
            name="watermarkLogoId"
            kind="logo"
            label="Watermark logo (optional)"
            initial={initial.watermarkLogo}
            previewClassName="h-24 w-24 object-contain p-1.5"
            hint="Leave empty to use your brand logo. A transparent PNG gives the cleanest result."
            onChange={(media) => setWatermarkLogoId(media?.id ?? "")}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Slider
              name="watermarkOpacity"
              label="Opacity"
              min={0.02}
              max={0.6}
              step={0.01}
              value={opacity}
              onChange={setOpacity}
              format={(value) => `${Math.round(value * 100)}%`}
              hint="Light enough to see the product, strong enough to discourage reuse."
            />
            <Slider
              name="watermarkScale"
              label="Size"
              min={0.05}
              max={0.6}
              step={0.01}
              value={scale}
              onChange={setScale}
              format={(value) => `${Math.round(value * 100)}% of image`}
            />
            <Slider
              name="watermarkRotation"
              label="Rotation"
              min={-90}
              max={90}
              step={1}
              value={rotation}
              onChange={setRotation}
              format={(value) => `${value}°`}
            />
            <Slider
              name="watermarkRepetitions"
              label="Placements"
              min={1}
              max={12}
              step={1}
              value={repetitions}
              onChange={setRepetitions}
              format={(value) => `${value}×`}
              hint="Positions adapt to each image's shape. 3–4 works well."
            />
          </div>

          <div>
            <p className="field-label">Live preview</p>
            {/* Not next/image: the preview is generated on the fly and must not be cached. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Preview of the watermark on a sample product photo"
              className="w-full rounded-xl border border-cream-200"
              width={900}
              height={700}
            />
            {watermarkEnabled && !effectiveWatermarkLogoId ? (
              <p className="field-hint">
                Upload a logo above to see the watermark.
              </p>
            ) : null}
          </div>

          <label className="flex items-start gap-2.5 rounded-lg border border-cream-200 p-3">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={reprocess}
              onChange={(event) => setReprocess(event.target.checked)}
            />
            <span>
              <span className="block text-sm font-semibold text-ink-700">
                Update images already uploaded
              </span>
              <span className="mt-0.5 block text-xs text-ink-400">
                Re-applies the watermark to your existing product images when
                these settings change. Uncheck to only affect new uploads.
              </span>
            </span>
          </label>
          <input
            type="hidden"
            name="reprocessImages"
            value={reprocess ? "on" : "off"}
          />
        </div>
      </SectionCard>

      <SectionCard
        id="website"
        title="Website and social"
        description="Page titles, search engine description and the links in your footer."
      >
        <div>
          <label className="field-label" htmlFor="siteTitle">
            Website title <span className="text-red-600">*</span>
          </label>
          <input
            id="siteTitle"
            name="siteTitle"
            required
            defaultValue={initial.siteTitle}
            className="field-input"
          />
          {fieldErrors.siteTitle ? (
            <p className="mt-1.5 text-xs font-medium text-red-600">
              {fieldErrors.siteTitle}
            </p>
          ) : null}
        </div>

        <div>
          <label className="field-label" htmlFor="siteDescription">
            Website description <span className="text-red-600">*</span>
          </label>
          <textarea
            id="siteDescription"
            name="siteDescription"
            rows={2}
            required
            defaultValue={initial.siteDescription}
            className="field-input"
          />
          <p className="field-hint">
            Appears in Google results and when your link is shared on WhatsApp.
          </p>
        </div>

        <div>
          <label className="field-label" htmlFor="defaultSort">
            Default catalog order
          </label>
          <select
            id="defaultSort"
            name="defaultSort"
            defaultValue={initial.defaultSort}
            className="field-input"
          >
            <option value="manual">Your manual order</option>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="designNumber">Design number</option>
          </select>
        </div>

        <div>
          <label className="field-label" htmlFor="footerText">
            Footer text (optional)
          </label>
          <textarea
            id="footerText"
            name="footerText"
            rows={2}
            defaultValue={initial.footerText}
            className="field-input"
            placeholder="A short line about your business, shown in the footer."
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["instagramUrl", "Instagram", initial.instagramUrl],
              ["facebookUrl", "Facebook", initial.facebookUrl],
              ["youtubeUrl", "YouTube", initial.youtubeUrl],
              ["twitterUrl", "X (Twitter)", initial.twitterUrl],
              ["linkedinUrl", "LinkedIn", initial.linkedinUrl],
            ] as const
          ).map(([name, label, value]) => (
            <div key={name}>
              <label className="field-label" htmlFor={name}>
                {label}
              </label>
              <input
                id={name}
                name={name}
                type="url"
                defaultValue={value}
                className="field-input"
                placeholder="https://…"
              />
              {fieldErrors[name] ? (
                <p className="mt-1.5 text-xs font-medium text-red-600">
                  {fieldErrors[name]}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </SectionCard>

      {status ? <StatusMessage status={status} /> : null}

      <div className="sticky bottom-0 -mx-4 border-t border-cream-200 bg-cream-100/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:px-4">
        <button type="submit" className="btn btn-primary" disabled={isPending}>
          {isPending ? "Saving…" : "Save all settings"}
        </button>
      </div>
    </form>
  );
}