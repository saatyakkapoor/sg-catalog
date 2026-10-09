"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertIcon, CheckIcon, XIcon } from "@/components/icons";

export function StatusMessage({
  status,
}: {
  status: { ok: boolean; text: string } | null;
}) {
  if (!status) return null;
  return (
    <p
      role={status.ok ? "status" : "alert"}
      className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
        status.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"
      }`}
    >
      {status.ok ? (
        <CheckIcon className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <span>{status.text}</span>
    </p>
  );
}

export function SubmitButton({
  children,
  pendingLabel,
  className = "btn btn-primary",
  disabled,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending || disabled}>
      {pending ? (pendingLabel ?? "Saving…") : children}
    </button>
  );
}

export function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: (props: { id: string; "aria-describedby"?: string }) => React.ReactNode;
}) {
  const id = useId();
  const hintId = hint || error ? `${id}-hint` : undefined;
  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
        {required ? <span className="ml-0.5 text-red-600">*</span> : null}
      </label>
      {children({ id, "aria-describedby": hintId })}
      {error ? (
        <p id={hintId} className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Toggle({
  name,
  defaultChecked,
  label,
  description,
  onChange,
  checked,
}: {
  name?: string;
  defaultChecked?: boolean;
  label: string;
  description?: string;
  onChange?: (value: boolean) => void;
  checked?: boolean;
}) {
  const isControlled = checked !== undefined;
  const [internal, setInternal] = useState(defaultChecked ?? false);
  const value = isControlled ? checked : internal;

  return (
    <div className="flex items-start justify-between gap-4">
      <span>
        <span className="block text-sm font-semibold text-ink-700">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs text-ink-400">{description}</span>
        ) : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={label}
        onClick={() => {
          const next = !value;
          if (!isControlled) setInternal(next);
          onChange?.(next);
        }}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${
          value ? "bg-green-600" : "bg-cream-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            value ? "left-[1.375rem]" : "left-0.5"
          }`}
        />
      </button>
      {name ? (
        <input type="hidden" name={name} value={value ? "on" : "off"} />
      ) : null}
    </div>
  );
}

export function SectionCard({
  id,
  title,
  description,
  children,
  footer,
}: {
  id?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section id={id} className="card scroll-mt-20 p-5 sm:p-6">
      <div className="mb-5">
        <h2 className="text-lg text-ink-900">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-ink-500">{description}</p>
        ) : null}
      </div>
      <div className="space-y-4">{children}</div>
      {footer ? <div className="mt-5">{footer}</div> : null}
    </section>
  );
}

/**
 * Accessible confirmation overlay used for every destructive action, so nothing
 * is deleted on a single stray tap.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive = true,
  busy = false,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean;
  title: string;
  body?: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label={cancelLabel}
        className="absolute inset-0 bg-ink-900/50"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg text-ink-900">{title}</h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label={cancelLabel}
            className="rounded-lg p-1 text-ink-400 hover:bg-cream-200"
          >
            <XIcon />
          </button>
        </div>
        {body ? <div className="text-sm text-ink-600">{body}</div> : null}
        {children ? <div className="mt-4">{children}</div> : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="btn btn-outline"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`btn ${destructive ? "btn-danger" : "btn-primary"}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "success" | "muted" | "warning";
  children: React.ReactNode;
}) {
  const tones = {
    neutral: "bg-cream-200 text-ink-600",
    success: "bg-green-100 text-green-800",
    muted: "bg-cream-200 text-ink-400",
    warning: "bg-gold-100 text-gold-600",
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
