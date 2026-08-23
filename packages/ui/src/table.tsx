import type { ReactNode } from "react";

import { cn } from "./cn";
import { Skeleton } from "./primitives";

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  className?: string;
  /** Hide this column's row on the mobile card layout. */
  hideOnMobile?: boolean;
}

export function DataTable<T>({
  columns,
  rows,
  keyOf,
  onRowClick,
  loading,
  empty,
  className,
}: {
  columns: Column<T>[];
  rows: T[];
  keyOf: (row: T) => string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  empty?: ReactNode;
  className?: string;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    );
  }
  if (rows.length === 0 && empty) return <>{empty}</>;

  return (
    <div className={className}>
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-2xl border border-line bg-surface md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-canvas/60 text-left text-xs uppercase tracking-wide text-ink-muted">
              {columns.map((c) => (
                <th key={c.key} className={cn("px-4 py-3 font-medium", c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={keyOf(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "border-b border-line last:border-0",
                  onRowClick && "cursor-pointer hover:bg-canvas/60",
                )}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-4 py-3 align-middle", c.className)}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 md:hidden">
        {rows.map((row) => (
          <div
            key={keyOf(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={cn("hk-card p-4", onRowClick && "active:bg-canvas")}
          >
            {columns
              .filter((c) => !c.hideOnMobile)
              .map((c) => (
                <div key={c.key} className="flex items-center justify-between gap-3 py-1">
                  <span className="text-xs uppercase tracking-wide text-ink-muted">{c.header}</span>
                  <span className="text-right text-sm">{c.render(row)}</span>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
