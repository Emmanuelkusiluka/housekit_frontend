import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

import { cn } from "./cn";

export interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
}

export function AppShell({
  brand,
  nav,
  topRight,
  banner,
  children,
}: {
  brand: ReactNode;
  nav: NavItem[];
  topRight?: ReactNode;
  banner?: ReactNode;
  children: ReactNode;
}) {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      isActive ? "bg-brand-50 text-brand-700" : "text-ink-muted hover:bg-canvas hover:text-ink",
    );

  return (
    <div className="min-h-screen bg-canvas">
      {/* Sidebar (md+) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-surface md:flex">
        <div className="flex h-16 items-center px-5">{brand}</div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
              <span className="shrink-0">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main column */}
      <div className="md:pl-60">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur md:px-6">
          <div className="md:hidden">{brand}</div>
          <div className="ml-auto flex items-center gap-1">{topRight}</div>
        </header>

        {banner}

        <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-5 md:px-6 md:pb-10">{children}</main>
      </div>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface md:hidden">
        <div className="flex w-full overflow-x-auto">
          {nav.slice(0, 5).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]",
                  isActive ? "text-brand-700" : "text-ink-muted",
                )
              }
            >
              {item.icon}
              <span className="max-w-[4.5rem] truncate">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-xl font-semibold text-ink md:text-2xl">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "neutral" | "paid" | "overdue" | "brand";
}) {
  const toneClass: Record<string, string> = {
    neutral: "text-ink",
    paid: "text-paid",
    overdue: "text-overdue",
    brand: "text-brand-600",
  };
  return (
    <div className="hk-card p-4">
      <p className="text-xs uppercase tracking-wide text-ink-muted">{label}</p>
      <p className={cn("mt-1 font-display text-2xl font-semibold", toneClass[tone])}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}
