"use client";

import { useState } from "react";
import { useEnquiry } from "@/components/public/enquiry-selection";
import { formatDesignLabel } from "@/lib/design-number";
import { multiEnquiryMessage, multiEnquiryUrl } from "@/lib/whatsapp";
import { WhatsAppIcon, XIcon } from "@/components/icons";

export function EnquiryBar({
  whatsappNumber,
}: {
  whatsappNumber: string;
}) {
  const { items, remove, clear } = useEnquiry();
  const [status, setStatus] = useState("");

  if (items.length === 0) return null;

  const href = multiEnquiryUrl(
    whatsappNumber,
    items.map((item) => item.designNumber)
  );
  const message = multiEnquiryMessage(items.map((item) => item.designNumber));

  const send = async () => {
    setStatus("");
    const files: File[] = [];
    for (const item of items) {
      if (!item.imageSrc) continue;
      try {
        const response = await fetch(item.imageSrc);
        const blob = await response.blob();
        const name = `${formatDesignLabel(item.designNumber).replace(/\s+/g, "-")}.webp`;
        files.push(new File([blob], name, { type: blob.type || "image/webp" }));
      } catch {
        // Sharing still works without that photo.
      }
    }

    const canShareFiles =
      typeof navigator !== "undefined" &&
      typeof navigator.canShare === "function" &&
      files.length > 0 &&
      navigator.canShare({ files });

    if (canShareFiles) {
      try {
        await navigator.share({ files, text: message });
        return;
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
      }
    }

    if (files.length > 0 && !canShareFiles) {
      for (const file of files) {
        const url = URL.createObjectURL(file);
        const link = document.createElement("a");
        link.href = url;
        link.download = file.name;
        link.click();
        URL.revokeObjectURL(url);
      }
      setStatus("Photos downloaded — attach them in WhatsApp.");
    }

    if (href) {
      window.open(href, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-panel/95 px-4 py-3 shadow-[0_-12px_40px_-20px_rgba(20,16,12,.45)] backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink-800">
            {items.length} design{items.length === 1 ? "" : "s"} selected
          </p>
          <p className="mt-0.5 truncate text-xs text-ink-400">
            {items.map((item) => formatDesignLabel(item.designNumber)).join(", ")}
          </p>
          {status ? <p className="mt-1 text-xs text-gold-600">{status}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={clear} className="btn btn-outline !min-h-11">
            Clear
          </button>
          <button
            type="button"
            onClick={send}
            className="btn btn-whatsapp !min-h-11"
          >
            <WhatsAppIcon className="h-[18px] w-[18px]" />
            Enquire on WhatsApp
          </button>
        </div>
      </div>
      <ul className="mx-auto mt-2 hidden max-w-[1400px] gap-1.5 overflow-x-auto sm:flex">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => remove(item.id)}
              className="inline-flex items-center gap-1 rounded-full bg-cream-200 px-2.5 py-1 text-xs text-ink-700"
              aria-label={`Remove ${formatDesignLabel(item.designNumber)}`}
            >
              {formatDesignLabel(item.designNumber)}
              <XIcon className="h-3 w-3" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AddToEnquiryButton({
  item,
}: {
  item: {
    id: string;
    designNumber: string;
    name: string;
    imageSrc: string | null;
    slug: string;
  };
}) {
  const { has, toggle } = useEnquiry();
  const selected = has(item.id);

  return (
    <button
      type="button"
      onClick={() => toggle(item)}
      aria-pressed={selected}
      className={`btn w-full !min-h-12 ${selected ? "btn-primary" : "btn-outline"}`}
    >
      {selected ? "Added to enquiry" : "Add to enquiry"}
    </button>
  );
}
