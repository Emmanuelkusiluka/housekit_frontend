import { HousekitError } from "@housekit/api-client";
import { AuthProvider, useAuth, type AuthConfig } from "@housekit/auth";
import { initI18n, useTranslation } from "@housekit/i18n";
import { ToastProvider, useToast } from "@housekit/ui";
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { useEffect, useMemo, type ReactNode } from "react";

import { reportError, setErrorHandler } from "./errorBus";
import { UpgradeModalProvider, useUpgradeModal } from "./UpgradeModal";

initI18n();

function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({ onError: reportError }),
    mutationCache: new MutationCache({ onError: reportError }),
    defaultOptions: {
      queries: { retry: 1, staleTime: 15_000, refetchOnWindowFocus: false },
    },
  });
}

/** Registers the global error → toast/modal mapping (§3). */
function ErrorBridge() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const upgrade = useUpgradeModal();

  useEffect(() => {
    setErrorHandler((error) => {
      if (error instanceof HousekitError) {
        if (error.code === "upgrade_required") {
          upgrade.open();
          return;
        }
        if (error.code === "account_suspended") {
          toast({ tone: "error", title: t("subscription.suspendedBody") });
          return;
        }
        if (error.code === "wrong_token_audience") {
          toast({ tone: "error", title: t("auth.invalidCredentials") });
          return;
        }
        // Don't double-toast unauthorized (the client bounces to login).
        if (error.status === 401) return;
        toast({ tone: "error", title: error.message });
        return;
      }
      toast({ tone: "error", title: t("common.somethingWrong") });
    });
  }, [toast, t, upgrade]);

  return null;
}

export function AppProviders({
  authConfig,
  subscriptionPath,
  children,
}: {
  authConfig: AuthConfig;
  subscriptionPath?: string;
  children: ReactNode;
}) {
  const client = useMemo(makeQueryClient, []);
  return (
    <QueryClientProvider client={client}>
      <ToastProvider>
        <AuthProvider config={authConfig}>
          <UpgradeModalProvider subscriptionPath={subscriptionPath}>
            <ErrorBridge />
            {children}
          </UpgradeModalProvider>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

/** The realm-aware api client from auth context. */
export function useApi() {
  return useAuth().api;
}
