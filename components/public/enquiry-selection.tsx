"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type EnquiryItem = {
  id: string;
  designNumber: string;
  name: string;
  imageSrc: string | null;
  slug: string;
};

const STORAGE_KEY = "shagun-enquiry";

type EnquiryContextValue = {
  items: EnquiryItem[];
  has: (id: string) => boolean;
  toggle: (item: EnquiryItem) => void;
  add: (item: EnquiryItem) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const EnquiryContext = createContext<EnquiryContextValue | null>(null);

function readStored(): EnquiryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is EnquiryItem => {
      return (
        entry &&
        typeof entry === "object" &&
        typeof entry.id === "string" &&
        typeof entry.designNumber === "string"
      );
    });
  } catch {
    return [];
  }
}

export function EnquiryProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<EnquiryItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(readStored());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, ready]);

  const has = useCallback(
    (id: string) => items.some((item) => item.id === id),
    [items]
  );

  const add = useCallback((item: EnquiryItem) => {
    setItems((previous) =>
      previous.some((entry) => entry.id === item.id)
        ? previous
        : [...previous, item]
    );
  }, []);

  const remove = useCallback((id: string) => {
    setItems((previous) => previous.filter((item) => item.id !== id));
  }, []);

  const toggle = useCallback((item: EnquiryItem) => {
    setItems((previous) =>
      previous.some((entry) => entry.id === item.id)
        ? previous.filter((entry) => entry.id !== item.id)
        : [...previous, item]
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({ items, has, toggle, add, remove, clear }),
    [items, has, toggle, add, remove, clear]
  );

  return (
    <EnquiryContext.Provider value={value}>{children}</EnquiryContext.Provider>
  );
}

export function useEnquiry() {
  const context = useContext(EnquiryContext);
  if (!context) {
    throw new Error("useEnquiry must be used inside EnquiryProvider");
  }
  return context;
}
