import { type HousekitClient, unwrap } from "@housekit/api-client";

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

/**
 * Convenience request helper: preserves the client's auth/refresh + error
 * envelope while letting screens declare their own response type. The fully
 * typed `api.GET(...)` paths remain available for callers who want them.
 */
export async function req<T = unknown>(
  api: HousekitClient,
  method: Method,
  path: string,
  opts?: { body?: unknown; params?: Record<string, unknown> },
): Promise<T> {
  const options: Record<string, unknown> = {};
  if (opts?.body !== undefined) options.body = opts.body;
  if (opts?.params) options.params = opts.params;
  // openapi-fetch is strictly path-typed; this helper intentionally accepts a
  // string path for ergonomics across 170+ operations.
  const fn = (api as unknown as Record<Method, (p: string, o?: unknown) => Promise<{ data?: T; error?: unknown; response: Response }>>)[method];
  return unwrap<T>(fn(path, options));
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * "Compound · House · Room" — the one place a room/unit identifier gets
 * stitched together. A bare room label ("14") means nothing to an owner with
 * many properties; always show it with enough context to place it. Compound
 * is optional on a house, so this degrades to "House · Room" when absent.
 */
export function roomBreadcrumb(
  compoundName: string | null | undefined,
  houseName: string | null | undefined,
  unitLabel: string | null | undefined,
): string {
  return [compoundName, houseName, unitLabel].filter(Boolean).join(" · ");
}

/**
 * Fetch every page of a paginated list endpoint. The backend caps
 * `page_size` at 100, so a single request silently drops rows once an owner
 * passes 100 tenants/tenancies/houses. Pages after the first are fetched in
 * parallel once the total count is known, so 300 rows ≈ 2 round-trips.
 */
export async function fetchAll<T>(
  api: HousekitClient,
  path: string,
  query: Record<string, unknown> = {},
): Promise<T[]> {
  const pageSize = 100;
  const first = await req<Paginated<T>>(api, "GET", path, {
    params: { query: { ...query, page_size: pageSize, page: 1 } },
  });
  const pages = Math.ceil(first.count / pageSize);
  if (pages <= 1) return first.results;
  const rest = await Promise.all(
    Array.from({ length: pages - 1 }, (_, i) =>
      req<Paginated<T>>(api, "GET", path, {
        params: { query: { ...query, page_size: pageSize, page: i + 2 } },
      }),
    ),
  );
  return first.results.concat(...rest.map((p) => p.results));
}

/** Normalise for forgiving search: case/accents/extra spaces don't matter. */
function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * True when every word of `query` appears in at least one of `fields`, so
 * "amina 14" finds Amina in room 14 and "0712" finds a phone number.
 * Phone digits are compared without spaces/dashes/+.
 */
export function matchesSearch(query: string, fields: (string | null | undefined)[]): boolean {
  const q = norm(query);
  if (!q) return true;
  const hay = norm(fields.filter(Boolean).join(" | "));
  const hayDigits = hay.replace(/[^0-9]/g, "");
  return q.split(" ").every((word) => {
    if (hay.includes(word)) return true;
    const digits = word.replace(/[^0-9]/g, "");
    return digits.length >= 3 && hayDigits.includes(digits);
  });
}

/** Download rows as a CSV file the owner can open in Excel / Google Sheets. */
export function downloadCsv(filename: string, header: string[], rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // BOM so Excel opens UTF-8 (Kiswahili names, accents) correctly.
  const csv = "﻿" + [header, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
