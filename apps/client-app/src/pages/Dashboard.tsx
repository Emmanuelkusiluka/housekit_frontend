import { req, useApi, useAuth } from "@housekit/app-kit";
import { useTranslation } from "@housekit/i18n";
import { Button, Card, CardBody, EmptyState, Money, PageHeader, Skeleton, StatTile } from "@housekit/ui";
import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { Link } from "react-router-dom";

import type { LedgerRow, Occupancy } from "../types";

export function Dashboard() {
  const { t } = useTranslation();
  const api = useApi();
  const { user } = useAuth();
  const isOwner = user?.role === "client_admin";

  const occ = useQuery({
    queryKey: ["occupancy"],
    queryFn: () => req<Occupancy>(api, "GET", "/api/v1/occupancy/"),
  });
  const ledger = useQuery({
    queryKey: ["ledger", "current"],
    queryFn: () => req<LedgerRow[]>(api, "GET", "/api/v1/ledger/"),
  });

  const overdue = (ledger.data ?? []).filter((r) => r.is_overdue);
  const outstanding = overdue.reduce((sum, r) => sum + Number(r.balance ?? 0), 0);

  if (occ.isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (occ.data && occ.data.total === 0) {
    return (
      <div>
        <PageHeader title={t("auth.welcome", { name: user?.full_name })} />
        <EmptyState
          icon={<Building2 className="h-10 w-10" />}
          title={t("portfolio.noHouses")}
          description={t("onboarding.setupTitle")}
          action={
            <Link to="/setup">
              <Button>{t("onboarding.step1")}</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={t("auth.welcome", { name: user?.full_name })}
        description={t("common.tagline")}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label={t("portfolio.occupancyRate")}
          value={`${occ.data?.occupancy_rate ?? 0}%`}
          tone="brand"
        />
        <StatTile
          label={t("status.occupied")}
          value={`${occ.data?.occupied ?? 0}/${occ.data?.total ?? 0}`}
          hint={`${occ.data?.vacant ?? 0} ${t("status.vacant").toLowerCase()}`}
        />
        <StatTile
          label={t("status.overdue")}
          value={overdue.length}
          tone={overdue.length > 0 ? "overdue" : "paid"}
        />
        {isOwner && (
          <StatTile
            label={t("payments.balanceDue")}
            value={<Money value={outstanding} />}
            tone={outstanding > 0 ? "overdue" : "paid"}
          />
        )}
      </div>

      {overdue.length > 0 && (
        <Card className="mt-5">
          <CardBody>
            <div className="flex items-center justify-between">
              <p className="font-medium text-ink">
                {overdue.length} {t("status.overdue").toLowerCase()}
              </p>
              <Link to="/payments" className="text-sm text-brand-600 hover:underline">
                {t("payments.ledger")}
              </Link>
            </div>
            <ul className="mt-3 space-y-2">
              {overdue.slice(0, 5).map((r) => (
                <li
                  key={r.tenancy_public_id}
                  className="flex items-center justify-between rounded-lg bg-overdue-bg px-3 py-2 text-sm"
                >
                  <span className="text-ink">
                    {r.resident_name} · {r.unit_label}
                  </span>
                  <Money value={r.balance} emphasis className="text-overdue-fg" />
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
