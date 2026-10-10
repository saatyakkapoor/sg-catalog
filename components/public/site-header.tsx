"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SearchBox } from "@/components/public/search-box";
import { ThemeToggle } from "@/components/theme-toggle";
import { MenuIcon, SearchIcon, WhatsAppIcon, XIcon } from "@/components/icons";

export function SiteHeader({
  businessName,
  logoSrc,
  whatsappHref,
  catalogLabel = "Catalog",
  contactLabel = "Contact",
  enquireLabel = "Enquire",
  categories = [],
}: {
  businessName: string;
  tagline?: string | null;
  logoSrc?: string | null;
  whatsappHref: string | null;
  catalogLabel?: string;
  contactLabel?: string;
  enquireLabel?: string;
  categories?: Array<{ href: string; label: string }>;
}) {
  const links = [
    { href: "/", label: "Home" },
    { href: "/catalog", label: catalogLabel },
    ...categories.slice(0, 6).map((item) => ({ href: item.href, label: item.label })),
    { href: "/contact", label: contactLabel },
  ];
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const isHome = pathname === "/";

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/88 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-5 sm:h-[72px]">
        <Link href="/" className="flex min-w-0 items-center">
          <img
            src={logoSrc ?? "/brand/logo.png"}
            alt={businessName}
            className="h-9 w-auto sm:h-10"
          />
        </Link>

        <nav
          className="ml-auto hidden items-center gap-1 lg:flex"
          aria-label="Main navigation"
        >
          {isHome ? (
            <a
              href="#designs"
              className="rounded-full px-3.5 py-2 text-sm font-medium text-ink-400 transition-colors hover:bg-cream-200 hover:text-ink-800"
            >
              Designs
            </a>
          ) : null}
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
              className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors hover:bg-cream-200 hover:text-ink-800 ${
                pathname === link.href ? "bg-cream-200 text-ink-800" : "text-ink-400"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 lg:ml-3">
          <button
            type="button"
            onClick={() => setSearchOpen((open) => !open)}
            aria-label={searchOpen ? "Close search" : "Search the catalog"}
            aria-expanded={searchOpen}
            className="rounded-full p-2.5 text-ink-600 hover:bg-cream-200 md:hidden"
          >
            {searchOpen ? <XIcon /> : <SearchIcon />}
          </button>

          <div className="hidden w-52 md:block lg:w-60">
            <SearchBox className="[&_input]:!h-11 [&_button[type=submit]]:!px-3" />
          </div>

          <ThemeToggle compact />

          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-whatsapp !min-h-11 !px-3 !py-2.5 text-sm sm:!px-4"
              aria-label="Enquire on WhatsApp"
            >
              <WhatsAppIcon className="h-[18px] w-[18px]" />
              <span className="hidden sm:inline">{enquireLabel}</span>
            </a>
          ) : null}

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className="rounded-full p-2.5 text-ink-600 hover:bg-cream-200 lg:hidden"
          >
            <MenuIcon />
          </button>
        </div>
      </div>

      {searchOpen ? (
        <div className="px-5 pb-3 md:hidden">
          <SearchBox autoFocus />
        </div>
      ) : null}

      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-ink-900/40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 w-72 max-w-[85%] bg-panel p-5 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <span className="font-display text-lg text-ink-800">Menu</span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-1.5 text-ink-500 hover:bg-cream-200"
              >
                <XIcon />
              </button>
            </div>
            <nav className="space-y-1" aria-label="Mobile navigation">
              {isHome ? (
                <a
                  href="#designs"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-lg px-3 py-3 text-base font-medium text-ink-700 hover:bg-cream-200"
                >
                  Designs
                </a>
              ) : null}
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-lg px-3 py-3 text-base font-medium text-ink-700 hover:bg-cream-200"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="mt-6">
              <ThemeToggle />
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
