import type { AuthConfig } from "@housekit/auth";

export const API_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:8000";

export const authConfig: AuthConfig = {
  realm: "client",
  baseUrl: API_URL,
  authBase: "/api/v1/auth",
};
