import { Paginated, req, useApi, useToast } from "@housekit/app-kit";
import { useTranslation } from "@housekit/i18n";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Money,
  PageHeader,
  Skeleton,
  StatusPill,
} from "@housekit/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";

import { formatDate } from "@housekit/ui";
import type { Invoice, Package, Subscription as Sub } from "../types";

export function Subscription() {
  const { t } = useTranslation();
  const api = useApi();
  const qc = useQueryClient();
  const { toast } = useToast();

  const sub = useQuery({ queryKey: ["subscription"], queryFn: () => req<Sub>(api, "GET", "/api/v1/subscription/") });
  const packages = useQuery({
    queryKey: ["packages"],
    queryFn: () => req<Package[]>(api, "GET", "/api/v1/packages/"),
  });
  const invoices = useQuery({
    queryKey: ["invoices"],
    queryFn: () => req<Paginated<Invoice>>(api, "GET", "/api/v1/invoices/"),
  });

  const change = useMutation({
    mutationFn: (pkgId: string) => req(api, "PATCH", "/api/v1/subscription/", { body: { package_public_id: pkgId } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["subscription"] });
      toast({ tone: "success", title: t("subscription.upgrade") });
    },
  });

  if (sub.isLoading) return <Skeleton className="h-40 rounded-2xl" />;

  const s = sub.data;
  const limit = s?.package.unit_max;
  const used = s?.active_unit_count ?? 0;
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0;

  return (
    <div>
      <PageHeader title={t("subscription.title")} />

      {s && (
        <Card className="mb-5">
          <CardBody>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-display text-lg font-semibold text-ink">{s.package.name}</p>
                <p className="text-sm text-ink-muted">
                  {t("subscription.unitsUsed", { used, limit: limit ?? t("subscription.unlimited") })}
                </p>
              </div>
              <StatusPill status={s.status} />
            </div>
            {limit && (
              <div className="mt-3 h-2 w-full rounded-full bg-canvas">
                <div
                  className={`h-2 rounded-full ${pct > 90 ? "bg-overdue" : "bg-brand-500"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
          </CardBody>
        </Card>
      )}

      <h2 className="mb-2 font-display text-base font-semibold">{t("subscription.upgrade")}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {packages.data?.map((p) => {
          const isCurrent = p.public_id === s?.package.public_id;
          return (
            <Card key={p.public_id} className={isCurrent ? "ring-2 ring-brand-500" : ""}>
              <CardBody>
                <div className="flex items-center justify-between">
                  <p className="font-medium text-ink">{p.name}</p>
                  {isCurrent && <Badge tone="brand">{t("subscription.currentPlan")}</Badge>}
                </div>
                <p className="mt-1 text-sm text-ink-muted">
                  {p.unit_min}–{p.unit_max ?? "∞"} {t("portfolio.units").toLowerCase()}
                </p>
                <p className="mt-2 font-display text-xl font-semibold">
                  <Money value={p.price_monthly} />
                  <span className="text-sm font-normal text-ink-muted">{t("subscription.perMonth")}</span>
                </p>
                {!isCurrent && (
                  <Button
                    className="mt-3 w-full"
                    variant="outline"
                    size="sm"
                    loading={change.isPending}
                    onClick={() => change.mutate(p.public_id)}
                  >
                    <Check className="h-4 w-4" /> {t("subscription.upgrade")}
                  </Button>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t("subscription.invoices")}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-2">
          {invoices.data && invoices.data.results.length > 0 ? (
            invoices.data.results.map((inv) => (
              <div key={inv.public_id} className="flex items-center justify-between text-sm">
                <span>
                  {inv.invoice_no} · {formatDate(inv.due_at)}
                </span>
                <span className="flex items-center gap-2">
                  <Money value={inv.amount} />
                  <StatusPill status={inv.status === "due" ? "pending" : inv.status} />
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-ink-muted">{t("common.noResults")}</p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
