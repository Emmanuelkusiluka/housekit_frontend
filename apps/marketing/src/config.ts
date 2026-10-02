// Dynamic host: derive backend + client-app URLs from the host the page was
// opened on (localhost, a LAN IP, etc.) unless the VITE_* vars pin them.
const _host = typeof window !== "undefined" ? `${window.location.protocol}//${window.location.hostname}` : "http://localhost";
export const API_URL = (import.meta.env.VITE_API_URL as string) || `${_host}:8000`;
export const CLIENT_URL = (import.meta.env.VITE_CLIENT_URL as string) || `${_host}:5174`;

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed`);
  return (await res.json()) as T;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: { message?: string } })?.error?.message ?? "Request failed");
  return data as T;
}
