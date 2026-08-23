import type { Realm } from "@housekit/api-client";

export interface Tokens {
  access: string;
  refresh: string;
}

export interface AuthUser {
  public_id: string;
  email: string;
  full_name: string;
  role: string;
  [k: string]: unknown;
}

/** localStorage-backed token + user store, isolated per realm. */
export class TokenStore {
  private tokenKey: string;
  private userKey: string;

  constructor(realm: Realm) {
    this.tokenKey = `housekit.${realm}.tokens`;
    this.userKey = `housekit.${realm}.user`;
  }

  getTokens(): Tokens | null {
    try {
      const raw = localStorage.getItem(this.tokenKey);
      return raw ? (JSON.parse(raw) as Tokens) : null;
    } catch {
      return null;
    }
  }

  setTokens(tokens: Tokens) {
    localStorage.setItem(this.tokenKey, JSON.stringify(tokens));
  }

  setAccess(access: string) {
    const t = this.getTokens();
    if (t) this.setTokens({ ...t, access });
  }

  getUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(this.userKey);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  }

  setUser(user: AuthUser) {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  clear() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }
}
