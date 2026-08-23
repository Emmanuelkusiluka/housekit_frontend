import createClient, { type Client, type Middleware } from "openapi-fetch";

import type { paths } from "./schema";

export type Realm = "client" | "platform";

/** The backend's uniform error envelope (§17). */
export interface ApiErrorBody {
  error: { code: string; message: string; details?: Record<string, unknown> };
}

export class HousekitError extends Error {
  code: string;
  details: Record<string, unknown>;
  status: number;
  constructor(status: number, body: unknown) {
    const env = (body as ApiErrorBody | undefined)?.error;
    super(env?.message ?? "Request failed");
    this.name = "HousekitError";
    this.code = env?.code ?? "error";
    this.details = env?.details ?? {};
    this.status = status;
  }
}

export interface TokenProvider {
  getAccessToken(): string | null;
  /** Attempt a silent refresh. Returns true if a new access token is available. */
  refresh(): Promise<boolean>;
  /** Called when auth is unrecoverable (bounce to login). */
  onUnauthorized(): void;
  /** Operator impersonation header for the platform realm (optional). */
  getOperatorAccount?(): string | null;
}

export type HousekitClient = Client<paths>;

/**
 * A realm-aware typed client. Attaches the bearer token (and optional operator
 * header), and transparently refreshes once on a 401 before giving up.
 */
export function createApiClient(baseUrl: string, tokens: TokenProvider): HousekitClient {
  const authFetch: typeof fetch = async (input, init) => {
    // openapi-fetch invokes this as `fetch(request)` — a single Request object
    // that already carries the JSON body and its `Content-Type` header. Normalize
    // to one Request we never consume, then clone per attempt so we keep those
    // headers (merging auth on top) and can re-send the body on a 401 retry.
    const base = new Request(input as RequestInfo, init);
    const send = (token: string | null): Promise<Response> => {
      const headers = new Headers(base.headers);
      if (token) headers.set("Authorization", `Bearer ${token}`);
      const op = tokens.getOperatorAccount?.();
      if (op) headers.set("X-Operator-Account", op);
      return fetch(new Request(base.clone(), { headers }));
    };

    let res = await send(tokens.getAccessToken());
    if (res.status === 401) {
      const ok = await tokens.refresh();
      if (ok) {
        res = await send(tokens.getAccessToken());
      }
      if (res.status === 401) tokens.onUnauthorized();
    }
    return res;
  };

  const client = createClient<paths>({ baseUrl, fetch: authFetch });

  const throwOnError: Middleware = {
    async onResponse({ response }) {
      // Let openapi-fetch surface data/error; individual callers may inspect
      // `error`. TanStack Query wrappers below convert non-OK into HousekitError.
      return response;
    },
  };
  client.use(throwOnError);
  return client;
}

/** Convenience: run an openapi-fetch result, throwing HousekitError on failure. */
export async function unwrap<T>(p: Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T> {
  const { data, error, response } = await p;
  if (error !== undefined || !response.ok) {
    throw new HousekitError(response.status, error);
  }
  return data as T;
}
