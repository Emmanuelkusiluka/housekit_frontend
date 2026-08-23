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
