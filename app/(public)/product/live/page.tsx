"use client";

import { useEffect, useState } from "react";
import { LiveProductView } from "@/components/public/live-product";

export default function LiveProductPage() {
  const [slug, setSlug] = useState("");

  useEffect(() => {
    setSlug(window.location.pathname.replace(/\/+$/, "").split("/").pop() ?? "");
  }, []);

  if (!slug || slug === "live") {
    return <p className="container-page py-16 text-sm text-ink-500">Loading design…</p>;
  }
  return <LiveProductView slug={slug} />;
}
