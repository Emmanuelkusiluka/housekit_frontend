import { Paginated, req, useApi, useAuth, useToast } from "@housekit/app-kit";
import { formatDate } from "@housekit/ui";
import { useTranslation } from "@housekit/i18n";
import { Button, Card, CardBody, CardHeader, CardTitle, Money, PageHeader, StatTile, StatusPill } from "@housekit/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Invoice, PlatformAccount } from "../types";

export function Billing() {
  const { t } = useTranslation();
  const api = useApi();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const isSuper = user?.role === "super_admin";

  const accounts = useQuery({
    queryKey: ["platform-accounts"],
    queryFn: () => req<Paginated<PlatformAccount>>(api, "GET", "/api/v1/platform/accounts/"),
  });
  const invoices = useQuery({
    queryKey: ["platform-invoices"],
    queryFn: () => req<Paginated<Invoice>>(api, "GET", "/api/v1/platform/invoices/"),
  });

  const markPaid = useMutation({
    mutationFn: (inv: Invoice) =>
      req(api, "POST", `/api/v1/platform/invoices/${inv.public_id}/mark_paid/`, { body: { amount: inv.amount } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["platform-invoices"] });
      void qc.invalidateQueries({ queryKey: ["platform-accounts"] });
      toast({ tone: "success", title: t("subscription.invoices") });
    },
  });

  const list = accounts.data?.results ?? [];
  const active = list.filter((a) => a.status === "active").length;
  const suspended = list.filter((a) => a.status === "suspended").length;
  const churn = list.filter((a) => a.status === "suspended" || a.subscription_status === "past_due").length;

  return (
    <div>
      <PageHeader title={t("platform.healthDashboard")} description="Monitoring & Billing" />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatTile label={t("platform.activeAccounts")} value={active} tone="paid" />
        <StatTile label={t("platform.suspend")} value={suspended} tone="overdue" />
        <StatTile label={t("platform.churnRisk")} value={churn} tone="overdue" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("subscription.invoices")}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-2">
          {invoices.data && invoices.data.results.length > 0 ? (
            invoices.data.results.map((inv) => (
              <div key={inv.public_id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2 text-sm last:border-0">
                <span>
                  {inv.invoice_no} · {inv.business_name} · {formatDate(inv.due_at)}
                </span>
                <span className="flex items-center gap-2">
                  <Money value={inv.amount} currency={inv.currency} />
                  <StatusPill status={inv.status === "due" ? "pending" : inv.status === "overdue" ? "past_due" : inv.status} />
                  {isSuper && inv.status !== "paid" && (
                    <Button size="sm" variant="outline" loading={markPaid.isPending} onClick={() => markPaid.mutate(inv)}>
                      {t("payments.record")}
                    </Button>
                  )}
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
