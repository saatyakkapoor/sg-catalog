import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { LiveContact } from "@/components/public/live-contact";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: "Contact",
    description: `Get in touch with ${settings.businessName}.`,
    alternates: { canonical: "/contact" },
  };
}

export default function ContactPage() {
  return <LiveContact />;
}
