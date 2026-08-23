export const API_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:8000";
export const CLIENT_URL = (import.meta.env.VITE_CLIENT_URL as string) || "http://localhost:5174";

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
