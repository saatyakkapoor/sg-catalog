"use client";

import { useEffect, useState } from "react";

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-24 right-4 z-40 grid h-12 w-12 place-items-center rounded-full border border-line bg-panel text-ink-700 shadow-md hover:border-gold-400 sm:bottom-28 sm:right-6"
      aria-label="Back to top"
    >
      ↑
    </button>
  );
}
