"use client";

import { MoonIcon, SunIcon } from "@/components/icons";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={dark}
      title={dark ? "Light theme" : "Dark theme"}
      className={`inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-line bg-panel text-ink-700 transition-colors hover:border-gold-400 hover:text-ink-900 ${
        compact ? "px-0" : "px-3"
      } ${className}`}
    >
      {dark ? (
        <SunIcon className="h-[18px] w-[18px]" />
      ) : (
        <MoonIcon className="h-[18px] w-[18px]" />
      )}
      {compact ? null : (
        <span className="hidden text-sm font-medium sm:inline">
          {dark ? "Light" : "Dark"}
        </span>
      )}
    </button>
  );
}
