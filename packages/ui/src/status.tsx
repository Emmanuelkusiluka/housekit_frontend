import { useTranslation } from "@housekit/i18n";

import { cn } from "./cn";
import { formatMoney } from "./format";

type Tone = "paid" | "overdue" | "partial" | "vacant" | "maintenance" | "brand" | "neutral";

/** Status → tone contract (§10). One source of truth for the brief's colors. */
const STATUS_TONE: Record<string, Tone> = {
  // charge
  paid: "paid",
  partial: "partial",
  unpaid: "overdue",
  overdue: "overdue",
  // unit
  occupied: "paid",
  vacant: "vacant",
  maintenance: "maintenance",
  // lease
  draft: "neutral",
  sent: "partial",
  signed: "paid",
  declined: "overdue",
  // ticket
  open: "partial",
  escalated: "partial",
  resolved: "paid",
  reopened: "overdue",
  pending: "partial",
  in_progress: "brand",
  // account / subscription
  active: "paid",
  trial: "brand",
  suspended: "overdue",
  past_due: "overdue",
  cancelled: "neutral",
  // notice
  confirmed: "paid",
  rejected: "overdue",
  // verification
  verified: "paid",
  profile_complete: "brand",
  unverified: "neutral",
};

const TONE_CLASS: Record<Tone, string> = {
  paid: "bg-paid-bg text-paid-fg",
  overdue: "bg-overdue-bg text-overdue-fg",
  partial: "bg-partial-bg text-partial-fg",
  vacant: "bg-vacant-bg text-vacant-fg",
  maintenance: "bg-maintenance-bg text-maintenance-fg",
  brand: "bg-brand-50 text-brand-700",
  neutral: "bg-canvas text-ink-muted",
};

const TONE_DOT: Record<Tone, string> = {
  paid: "bg-paid",
  overdue: "bg-overdue",
  partial: "bg-partial",
  vacant: "bg-vacant",
  maintenance: "bg-maintenance",
  brand: "bg-brand-500",
  neutral: "bg-ink-subtle",
};

export function StatusPill({
  status,
  label,
  className,
}: {
  status: string;
  label?: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const tone = STATUS_TONE[status] ?? "neutral";
  const text = label ?? t(`status.${status}`, { defaultValue: status.replace(/_/g, " ") });
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        TONE_CLASS[tone],
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", TONE_DOT[tone])} />
      {text}
    </span>
  );
}

export function statusTone(status: string): Tone {
  return STATUS_TONE[status] ?? "neutral";
}

export function Money({
  value,
  currency = "TZS",
  className,
  emphasis = false,
}: {
  value: number | string | null | undefined;
  currency?: string;
  className?: string;
  emphasis?: boolean;
}) {
  return (
    <span className={cn("tabular-nums", emphasis && "font-semibold text-ink", className)}>
      {formatMoney(value, currency)}
    </span>
  );
}
