"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/admin/_actions/session";
import {
  ExternalIcon,
  GridIcon,
  HomeIcon,
  ImageIcon,
  LayersIcon,
  LogoutIcon,
  MenuIcon,
  SettingsIcon,
  XIcon,
} from "@/components/icons";

const NAV = [
  { href: "/admin", label: "Dashboard", Icon: HomeIcon },
  { href: "/admin/categories", label: "Categories", Icon: LayersIcon },
  { href: "/admin/products", label: "Products", Icon: GridIcon },
  { href: "/admin/media", label: "Media library", Icon: ImageIcon },
  { href: "/admin/settings", label: "Settings", Icon: SettingsIcon },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({
  businessName,
  userLabel,
  children,
}: {
  businessName: string;
  userLabel: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the mobile drawer whenever navigation happens.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const nav = (
    <nav className="space-y-1" aria-label="Admin sections">
      {NAV.map(({ href, label, Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-ink-800 text-cream-100"
                : "text-ink-600 hover:bg-cream-200"
            }`}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="space-y-1 border-t border-cream-200 pt-3">
      <Link
        href="/"
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-600 hover:bg-cream-200"
      >
        <ExternalIcon className="h-[18px] w-[18px] shrink-0" />
        View public site
      </Link>
      <form action={logoutAction}>
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-600 hover:bg-cream-200"
        >
          <LogoutIcon className="h-[18px] w-[18px] shrink-0" />
          Sign out
        </button>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream-100 lg:flex">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-cream-200 bg-cream-50/95 px-4 py-3 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="btn btn-outline !min-h-0 !px-2.5 !py-2"
          aria-label="Open admin menu"
          aria-expanded={drawerOpen}
        >
          <MenuIcon />
        </button>
        <span className="truncate text-sm font-semibold text-ink-800">
          {businessName} admin
        </span>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-cream-200 bg-cream-50 p-4 lg:sticky lg:top-0 lg:flex lg:h-screen">
        <div>
          <div className="mb-6 px-3">
            <p className="truncate font-display text-lg text-ink-900">
              {businessName}
            </p>
            <p className="text-xs text-ink-400">Catalog admin</p>
          </div>
          {nav}
        </div>
        <div>
          <p className="truncate px-3 pb-3 text-xs text-ink-400">
            Signed in as {userLabel}
          </p>
          {footer}
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close admin menu"
            className="absolute inset-0 bg-ink-900/40"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col justify-between bg-cream-50 p-4 shadow-xl">
            <div>
              <div className="mb-6 flex items-start justify-between px-1">
                <div>
                  <p className="truncate font-display text-lg text-ink-900">
                    {businessName}
                  </p>
                  <p className="text-xs text-ink-400">Catalog admin</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close admin menu"
                  className="rounded-lg p-1.5 text-ink-500 hover:bg-cream-200"
                >
                  <XIcon />
                </button>
              </div>
              {nav}
            </div>
            <div>
              <p className="truncate px-3 pb-3 text-xs text-ink-400">
                Signed in as {userLabel}
              </p>
              {footer}
            </div>
          </div>
        </div>
      ) : null}

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        {children}
      </main>
    </div>
  );
}
