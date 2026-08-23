import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Tabs from "@radix-ui/react-tabs";
import { LOCALES, setLocale, useTranslation, type Locale } from "@housekit/i18n";
import { Bell, Check, Globe } from "lucide-react";
import { useState, type ReactNode } from "react";

import { cn } from "./cn";

/* ── Tabs ───────────────────────────────────────────────────────────────── */
export function TabsBar({
  tabs,
  value,
  onValueChange,
  className,
}: {
  tabs: { value: string; label: string }[];
  value: string;
  onValueChange: (v: string) => void;
  className?: string;
}) {
  return (
    <Tabs.Root value={value} onValueChange={onValueChange} className={className}>
      <Tabs.List className="flex gap-1 overflow-x-auto rounded-xl bg-canvas p-1">
        {tabs.map((tab) => (
          <Tabs.Trigger
            key={tab.value}
            value={tab.value}
            className={cn(
              "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-ink-muted transition-colors",
              "data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-card",
            )}
          >
            {tab.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
    </Tabs.Root>
  );
}

/* ── Stepper ────────────────────────────────────────────────────────────── */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-2">
      {steps.map((label, i) => {
        const state = i < current ? "done" : i === current ? "active" : "todo";
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                state === "done" && "bg-paid text-white",
                state === "active" && "bg-brand-600 text-white",
                state === "todo" && "bg-canvas text-ink-subtle",
              )}
            >
              {state === "done" ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <span
              className={cn(
                "hidden text-sm sm:block",
                state === "active" ? "font-medium text-ink" : "text-ink-muted",
              )}
            >
              {label}
            </span>
            {i < steps.length - 1 && <span className="h-px flex-1 bg-line" />}
          </li>
        );
      })}
    </ol>
  );
}

/* ── LanguageSwitcher ───────────────────────────────────────────────────── */
export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [current, setCurrent] = useState<Locale>((i18n.language as Locale) || "en");
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-ink-muted hover:bg-canvas">
        <Globe className="h-4 w-4" />
        <span className="uppercase">{current}</span>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-[70] min-w-[9rem] rounded-xl border border-line bg-surface p-1 shadow-pop"
        >
          {LOCALES.map((l) => (
            <DropdownMenu.Item
              key={l.code}
              onSelect={() => {
                setLocale(l.code);
                setCurrent(l.code);
              }}
              className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm outline-none hover:bg-canvas"
            >
              {l.label}
              {current === l.code && <Check className="h-4 w-4 text-brand-600" />}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/* ── NotificationBell ───────────────────────────────────────────────────── */
export function NotificationBell({
  count = 0,
  onClick,
}: {
  count?: number;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative rounded-lg p-2 text-ink-muted hover:bg-canvas"
      aria-label="Notifications"
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-overdue px-1 text-[10px] font-semibold text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </button>
  );
}

/* ── DropdownMenu re-export for app menus ───────────────────────────────── */
export function Menu({
  trigger,
  children,
}: {
  trigger: ReactNode;
  children: ReactNode;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-[70] min-w-[11rem] rounded-xl border border-line bg-surface p-1 shadow-pop"
        >
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function MenuItem({
  children,
  onSelect,
  danger,
}: {
  children: ReactNode;
  onSelect?: () => void;
  danger?: boolean;
}) {
  return (
    <DropdownMenu.Item
      onSelect={onSelect}
      className={cn(
        "cursor-pointer rounded-lg px-3 py-2 text-sm outline-none hover:bg-canvas",
        danger && "text-overdue hover:bg-overdue-bg",
      )}
    >
      {children}
    </DropdownMenu.Item>
  );
}
