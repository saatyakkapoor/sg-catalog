import { WhatsAppIcon } from "@/components/icons";

/**
 * Renders an enquiry link, or a calm fallback when no WhatsApp number has been
 * configured yet — customers never see a broken link.
 */
export function WhatsAppLink({
  href,
  label = "Enquire on WhatsApp",
  className = "btn btn-whatsapp",
  fallbackNote = "WhatsApp enquiries are not available right now.",
  showIcon = true,
  ariaLabel,
}: {
  href: string | null;
  label?: string;
  className?: string;
  fallbackNote?: string;
  showIcon?: boolean;
  ariaLabel?: string;
}) {
  if (!href) {
    return (
      <p className="rounded-lg bg-cream-200 px-3 py-2.5 text-sm text-ink-500">
        {fallbackNote}
      </p>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label={ariaLabel ?? label}
    >
      {showIcon ? <WhatsAppIcon className="h-[18px] w-[18px]" /> : null}
      {label}
    </a>
  );
}

/** Fixed bottom-right enquiry button, present on every public page. */
export function FloatingWhatsApp({ href }: { href: string | null }) {
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-whatsapp text-[#04251a] shadow-lg transition-transform hover:scale-105 hover:bg-whatsapp-dark hover:text-white sm:bottom-28 sm:right-6 sm:w-auto sm:gap-2 sm:px-5 sm:text-[15px] sm:font-semibold"
      aria-label="Chat with us on WhatsApp"
    >
      <WhatsAppIcon className="h-6 w-6" />
      <span className="hidden sm:inline">Chat on WhatsApp</span>
    </a>
  );
}
