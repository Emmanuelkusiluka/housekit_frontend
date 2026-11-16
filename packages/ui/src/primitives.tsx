import { cva, type VariantProps } from "class-variance-authority";
import { Loader2, Search, X } from "lucide-react";
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

import { cn } from "./cn";

/* ── Button ─────────────────────────────────────────────────────────────── */
const button = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:pointer-events-none disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-brand-500/50",
  {
    variants: {
      variant: {
        primary: "bg-brand-600 text-white hover:bg-brand-700",
        secondary: "bg-brand-50 text-brand-700 hover:bg-brand-100",
        outline: "border border-line bg-surface text-ink hover:bg-canvas",
        ghost: "text-ink hover:bg-canvas",
        danger: "bg-overdue text-white hover:bg-red-700",
        success: "bg-paid text-white hover:bg-emerald-700",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(button({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  ),
);
Button.displayName = "Button";

/* ── Field wrapper ──────────────────────────────────────────────────────── */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label?: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <label htmlFor={htmlFor} className="hk-label">
          {label}
          {required && <span className="ml-0.5 text-overdue">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-ink-muted">{hint}</p>}
      {error && <p className="text-xs text-overdue">{error}</p>}
    </div>
  );
}

/* ── Input / Textarea / Select ──────────────────────────────────────────── */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn("hk-input", className)} {...props} />
  ),
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn("hk-input min-h-[90px]", className)} {...props} />
  ),
);
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn("hk-input appearance-none pr-8", className)} {...props}>
      {children}
    </select>
  ),
);
Select.displayName = "Select";

/* ── Card ───────────────────────────────────────────────────────────────── */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("hk-card", className)}>{children}</div>;
}
export function CardHeader({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 border-b border-line px-5 py-4", className)}>
      {children}
    </div>
  );
}
export function CardTitle({ className, children }: { className?: string; children: ReactNode }) {
  return <h3 className={cn("font-display text-base font-semibold text-ink", className)}>{children}</h3>;
}
export function CardBody({
  className,
  children,
  onClick,
}: {
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <div className={cn("p-5", className)} onClick={onClick}>
      {children}
    </div>
  );
}

/* ── Badge / Skeleton / Avatar / Spinner ────────────────────────────────── */
export function Badge({
  className,
  children,
  tone = "neutral",
}: {
  className?: string;
  children: ReactNode;
  tone?: "neutral" | "brand" | "success" | "warning" | "danger";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-canvas text-ink-muted",
    brand: "bg-brand-50 text-brand-700",
    success: "bg-paid-bg text-paid-fg",
    warning: "bg-partial-bg text-partial-fg",
    danger: "bg-overdue-bg text-overdue-fg",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-line/70", className)} />;
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin text-brand-600", className)} aria-hidden />;
}

/** Soft, distinct avatar palettes — picked deterministically from the name so
 * the same resident always gets the same colour across every screen. */
const AVATAR_TONES = [
  "bg-brand-100 text-brand-700",
  "bg-amber-100 text-amber-800",
  "bg-emerald-100 text-emerald-800",
  "bg-rose-100 text-rose-800",
  "bg-sky-100 text-sky-800",
  "bg-violet-100 text-violet-800",
];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function initialsOf(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

const AVATAR_SIZES = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-14 w-14 text-lg",
} as const;

export function Avatar({
  name,
  className,
  size = "md",
  ring = false,
}: {
  name: string;
  className?: string;
  size?: keyof typeof AVATAR_SIZES;
  /** White ring — used when avatars overlap in a stack. */
  ring?: boolean;
}) {
  return (
    <span
      aria-hidden
      title={name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        AVATAR_SIZES[size],
        AVATAR_TONES[hashName(name) % AVATAR_TONES.length],
        ring && "ring-2 ring-surface",
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}

/** A dashed "someone could be here" placeholder avatar for empty states. */
export function GhostAvatar({ size = "lg", className }: { size?: keyof typeof AVATAR_SIZES; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 rounded-full border-2 border-dashed border-line bg-canvas",
        AVATAR_SIZES[size],
        className,
      )}
    />
  );
}

/** Overlapping avatars ("Amina, Joseph and 12 others"). */
export function AvatarStack({
  names,
  max = 5,
  size = "md",
  className,
}: {
  names: string[];
  max?: number;
  size?: keyof typeof AVATAR_SIZES;
  className?: string;
}) {
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  return (
    <div className={cn("flex items-center -space-x-2", className)}>
      {shown.map((n, i) => (
        <Avatar key={`${n}-${i}`} name={n} size={size} ring />
      ))}
      {extra > 0 && (
        <span
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-full bg-canvas font-medium text-ink-muted ring-2 ring-surface",
            AVATAR_SIZES[size],
          )}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}

/** Avatar + name + secondary line — the standard way to show a person in a row. */
export function PersonCell({
  name,
  sub,
  size = "md",
  muted = false,
}: {
  name: string;
  sub?: ReactNode;
  size?: keyof typeof AVATAR_SIZES;
  muted?: boolean;
}) {
  return (
    <span className="flex min-w-0 items-center gap-3 text-left">
      <Avatar name={name} size={size} className={muted ? "opacity-60" : undefined} />
      <span className="min-w-0">
        <span className={cn("block truncate font-medium", muted ? "text-ink-muted" : "text-ink")}>{name}</span>
        {sub && <span className="block truncate text-xs text-ink-muted">{sub}</span>}
      </span>
    </span>
  );
}

/** Row skeleton that mirrors a PersonCell row: avatar · two lines · pill. */
export function PersonRowSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-y divide-line rounded-2xl border border-line bg-surface" aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className={cn("h-3", i % 3 === 0 ? "w-32" : i % 3 === 1 ? "w-40" : "w-28")} />
            <Skeleton className={cn("h-2.5", i % 2 === 0 ? "w-48" : "w-36")} />
          </div>
          <Skeleton className="hidden h-5 w-16 rounded-full sm:block" />
        </div>
      ))}
    </div>
  );
}

/* ── SearchInput ────────────────────────────────────────────────────────── */
export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
      <input
        type="search"
        role="searchbox"
        aria-label={placeholder}
        autoFocus={autoFocus}
        className="hk-input pl-9 pr-9"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-muted hover:bg-canvas hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/* ── EmptyState ─────────────────────────────────────────────────────────── */
export function EmptyState({
  icon,
  title,
  description,
  action,
  people,
  ghosts = 0,
  compact = false,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  /** Names to show as an avatar cluster instead of an icon — makes the state feel social. */
  people?: string[];
  /** Number of dashed "empty seat" avatars to show (first-use states). */
  ghosts?: number;
  compact?: boolean;
}) {
  const hasPeople = (people && people.length > 0) || ghosts > 0;
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-line bg-surface px-6 text-center",
        compact ? "py-8" : "py-12",
      )}
    >
      {hasPeople ? (
        <div className="mb-4 flex items-center -space-x-2">
          {ghosts > 0 && <GhostAvatar size="lg" />}
          {(people ?? []).slice(0, 4).map((n, i) => (
            <Avatar key={`${n}-${i}`} name={n} size="xl" ring className="relative z-10" />
          ))}
          {ghosts > 1 && <GhostAvatar size="lg" />}
        </div>
      ) : (
        icon && (
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600 [&>svg]:h-7 [&>svg]:w-7">
            {icon}
          </div>
        )
      )}
      <p className="font-display text-base font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
