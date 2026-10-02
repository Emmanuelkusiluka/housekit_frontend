import type { AuthConfig } from "@housekit/auth";

// Dynamic host: talk to the backend at whatever host the app was opened on
// (localhost, a LAN IP, etc.) unless VITE_API_URL pins it. Survives network changes.
export const API_URL =
  (import.meta.env.VITE_API_URL as string) ||
  (typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : "http://localhost:8000");

export const authConfig: AuthConfig = {
  realm: "platform",
  baseUrl: API_URL,
  authBase: "/api/v1/platform/auth",
};
