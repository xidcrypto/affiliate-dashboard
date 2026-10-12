"use client";
import { clsx } from "clsx";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  variant = "secondary",
  loading,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={clsx(
        "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[12px] px-4 py-2 text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "grad-accent text-white shadow-soft hover:brightness-110 active:brightness-95",
        variant === "secondary" && "border border-border bg-surface text-fg hover:border-muted/40 hover:bg-surface2",
        variant === "ghost" && "text-muted hover:bg-surface2 hover:text-fg",
        variant === "danger" && "bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25",
        className
      )}
    >
      {loading && (
        <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
