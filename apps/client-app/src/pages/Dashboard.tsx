import { Paginated, req, roomBreadcrumb, useApi, useAuth } from "@housekit/app-kit";
import { useTranslation } from "@housekit/i18n";
import { Button, Card, CardBody, EmptyState, Money, PageHeader, Skeleton, StatTile } from "@housekit/ui";
import { useQuery } from "@tanstack/react-query";
import { Building2, DoorOpen } from "lucide-react";
import { Link } from "react-router-dom";

import type { LedgerRow, Occupancy, Unit } from "../types";

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
  // Vacant rooms, portfolio-wide — so an owner can answer "do you have anything
  // open?" without digging into each house individually.
  const vacant = useQuery({
    queryKey: ["units", "vacant", "dashboard"],
    queryFn: () =>
      req<Paginated<Unit>>(api, "GET", "/api/v1/units/", {
        params: { query: { status: "vacant", page_size: 6 } },
      }),
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
                    {r.resident_name} · {roomBreadcrumb(r.compound_name, r.house_name, r.unit_label)}
                  </span>
                  <Money value={r.balance} emphasis className="text-overdue-fg" />
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {occ.data && occ.data.vacant > 0 && (
        <Card className="mt-5">
          <CardBody>
            <div className="flex items-center justify-between">
              <p className="font-medium text-ink">
                {occ.data.vacant} {t("status.vacant").toLowerCase()}
              </p>
              <Link to="/portfolio" className="text-sm text-brand-600 hover:underline">
                {t("portfolio.title")}
              </Link>
            </div>
            {vacant.isLoading ? (
              <div className="mt-3 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 rounded-lg" />
                ))}
              </div>
            ) : (
              <ul className="mt-3 space-y-2">
                {(vacant.data?.results ?? []).map((u) => (
                  <li
                    key={u.public_id}
                    className="flex items-center justify-between rounded-lg bg-canvas px-3 py-2 text-sm"
                  >
                    <span className="flex items-center gap-2 text-ink">
                      <DoorOpen className="h-4 w-4 text-ink-muted" />
                      {roomBreadcrumb(u.compound_name, u.house_name, u.label)}
                    </span>
                    <Money value={u.monthly_rent} className="text-ink-muted" />
                  </li>
                ))}
              </ul>
            )}
            {occ.data.vacant > (vacant.data?.results.length ?? 0) && (
              <Link to="/portfolio" className="mt-2 block text-center text-sm text-brand-600 hover:underline">
                {t("common.viewAll")}
              </Link>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
