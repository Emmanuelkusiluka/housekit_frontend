import { Paginated, req, useApi, useAuth, useToast } from "@housekit/app-kit";
import { useTranslation } from "@housekit/i18n";
import {
  Column,
  DataTable,
  Drawer,
  EmptyState,
  Menu,
  MenuItem,
  PageHeader,
  StatusPill,
} from "@housekit/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, MoreVertical } from "lucide-react";
import { useState } from "react";

import type { AccountHealth, PlatformAccount } from "../types";

export function Accounts() {
  const { t } = useTranslation();
  const api = useApi();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user, setOperatorAccount } = useAuth();
  const isSuper = user?.role === "super_admin";
  const [healthFor, setHealthFor] = useState<PlatformAccount | null>(null);

  const accounts = useQuery({
    queryKey: ["platform-accounts"],
    queryFn: () => req<Paginated<PlatformAccount>>(api, "GET", "/api/v1/platform/accounts/"),
  });

  const lifecycle = useMutation({
    mutationFn: (v: { id: string; action: "suspend" | "activate" }) =>
      req(api, "POST", `/api/v1/platform/accounts/${v.id}/${v.action}/`, { body: {} }),
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ["platform-accounts"] });
      toast({ tone: "success", title: v.action });
    },
  });

  const impersonate = useMutation({
    mutationFn: (acct: PlatformAccount) =>
      req(api, "POST", "/api/v1/platform/impersonation/start/", {
        body: { account_public_id: acct.public_id, reason: "Support investigation" },
      }),
    onSuccess: (_d, acct) => {
      setOperatorAccount(acct.public_id);
      toast({ tone: "info", title: t("platform.impersonate") });
    },
  });

  const cols: Column<PlatformAccount>[] = [
    { key: "name", header: t("nav.accounts"), render: (a) => <span className="font-medium">{a.business_name}</span> },
    { key: "pkg", header: t("subscription.currentPlan"), render: (a) => a.package ?? "—" },
    { key: "units", header: t("portfolio.units"), hideOnMobile: true, render: (a) => `${a.unit_count}` },
    { key: "status", header: t("common.status"), render: (a) => <StatusPill status={a.status} /> },
    {
      key: "actions",
      header: "",
      render: (a) => (
        <Menu
          trigger={
            <button className="rounded-lg p-1 text-ink-muted hover:bg-canvas">
              <MoreVertical className="h-4 w-4" />
            </button>
          }
        >
          <MenuItem onSelect={() => setHealthFor(a)}>{t("nav.health")}</MenuItem>
          <MenuItem onSelect={() => impersonate.mutate(a)}>{t("platform.impersonate")}</MenuItem>
          {isSuper && a.status !== "suspended" && (
            <MenuItem danger onSelect={() => lifecycle.mutate({ id: a.public_id, action: "suspend" })}>
              {t("platform.suspend")}
            </MenuItem>
          )}
          {isSuper && a.status === "suspended" && (
            <MenuItem onSelect={() => lifecycle.mutate({ id: a.public_id, action: "activate" })}>
              {t("platform.reactivate")}
            </MenuItem>
          )}
        </Menu>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title={t("nav.accounts")} description="Account Lifecycle" />
      <DataTable
        columns={cols}
        rows={accounts.data?.results ?? []}
        keyOf={(a) => a.public_id}
        loading={accounts.isLoading}
        empty={<EmptyState icon={<Building2 className="h-10 w-10" />} title={t("common.noResults")} />}
      />
      <HealthDrawer account={healthFor} onClose={() => setHealthFor(null)} />
    </div>
  );
}

function HealthDrawer({ account, onClose }: { account: PlatformAccount | null; onClose: () => void }) {
  const { t } = useTranslation();
  const api = useApi();
  const health = useQuery({
    queryKey: ["health", account?.public_id],
    enabled: !!account,
    queryFn: () => req<AccountHealth>(api, "GET", `/api/v1/platform/accounts/${account!.public_id}/health/`),
  });

  return (
    <Drawer open={!!account} onOpenChange={(o) => !o && onClose()} title={account?.business_name}>
      {health.data && (
        <div className="space-y-2 text-sm">
          {[
            [t("common.status"), health.data.status],
            [t("portfolio.units"), health.data.unit_count],
            [t("nav.tenants"), health.data.resident_count],
            ["Active tenancies", health.data.active_tenancies],
            [t("portfolio.occupancyRate"), `${health.data.occupancy_rate}%`],
            [t("nav.subscription"), health.data.subscription_status ?? "—"],
          ].map(([k, v]) => (
            <div key={String(k)} className="flex justify-between border-b border-line py-2">
              <span className="text-ink-muted">{k}</span>
              <span className="font-medium text-ink">{String(v)}</span>
            </div>
          ))}
        </div>
      )}
    </Drawer>
  );
}
