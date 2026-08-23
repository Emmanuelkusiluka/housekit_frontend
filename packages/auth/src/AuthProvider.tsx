import {
  createApiClient,
  HousekitError,
  type HousekitClient,
  type Realm,
  type TokenProvider,
} from "@housekit/api-client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { type AuthUser, TokenStore, type Tokens } from "./store";

export interface AuthConfig {
  realm: Realm;
  baseUrl: string;
  /** "/api/v1/auth" (client) or "/api/v1/platform/auth" (platform) */
  authBase: string;
}

type Status = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  realm: Realm;
  user: AuthUser | null;
  status: Status;
  api: HousekitClient;
  baseUrl: string;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setSession: (tokens: Tokens, user: AuthUser) => void;
  refreshUser: () => Promise<void>;
  operatorAccount: string | null;
  setOperatorAccount: (publicId: string | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ config, children }: { config: AuthConfig; children: ReactNode }) {
  const store = useMemo(() => new TokenStore(config.realm), [config.realm]);
  const [user, setUser] = useState<AuthUser | null>(() => store.getUser());
  const [status, setStatus] = useState<Status>(() =>
    store.getTokens() ? "loading" : "unauthenticated",
  );
  const [operatorAccount, setOperatorAccountState] = useState<string | null>(null);
  const operatorRef = useRef<string | null>(null);
  operatorRef.current = operatorAccount;

  const setOperatorAccount = useCallback((publicId: string | null) => {
    operatorRef.current = publicId;
    setOperatorAccountState(publicId);
  }, []);

  const tokenProvider = useMemo<TokenProvider>(
    () => ({
      getAccessToken: () => store.getTokens()?.access ?? null,
      getOperatorAccount: () => operatorRef.current,
      refresh: async () => {
        const t = store.getTokens();
        if (!t?.refresh) return false;
        try {
          const res = await fetch(`${config.baseUrl}${config.authBase}/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh: t.refresh }),
          });
          if (!res.ok) return false;
          const data = (await res.json()) as { access: string };
          store.setAccess(data.access);
          return true;
        } catch {
          return false;
        }
      },
      onUnauthorized: () => {
        store.clear();
        setUser(null);
        setStatus("unauthenticated");
      },
    }),
    [store, config.baseUrl, config.authBase],
  );

  const api = useMemo(
    () => createApiClient(config.baseUrl, tokenProvider),
    [config.baseUrl, tokenProvider],
  );

  const setSession = useCallback(
    (tokens: Tokens, u: AuthUser) => {
      store.setTokens(tokens);
      store.setUser(u);
      setUser(u);
      setStatus("authenticated");
    },
    [store],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch(`${config.baseUrl}${config.authBase}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new HousekitError(res.status, body);
      }
      const { access, refresh, user: u } = body as {
        access: string;
        refresh: string;
        user: AuthUser;
      };
      setSession({ access, refresh }, u);
    },
    [config.baseUrl, config.authBase, setSession],
  );

  const logout = useCallback(() => {
    const t = store.getTokens();
    if (t?.access) {
      void fetch(`${config.baseUrl}${config.authBase}/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${t.access}` },
      }).catch(() => undefined);
    }
    store.clear();
    setUser(null);
    setOperatorAccount(null);
    setStatus("unauthenticated");
  }, [store, config.baseUrl, config.authBase, setOperatorAccount]);

  const refreshUser = useCallback(async () => {
    const { data, response } = await api.GET(`${config.authBase}/me` as never);
    if (response.ok && data) {
      const u = data as AuthUser;
      store.setUser(u);
      setUser(u);
      setStatus("authenticated");
    } else {
      logout();
    }
  }, [api, config.authBase, store, logout]);

  // Validate the stored session on mount.
  useEffect(() => {
    if (store.getTokens()) {
      void refreshUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: AuthContextValue = {
    realm: config.realm,
    user,
    status,
    api,
    baseUrl: config.baseUrl,
    login,
    logout,
    setSession,
    refreshUser,
    operatorAccount,
    setOperatorAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
