import { Paginated, req, useApi, useAuth, useToast } from "@housekit/app-kit";
import { useTranslation } from "@housekit/i18n";
import { Button, Card, CardBody, CardHeader, CardTitle, formatDate, Modal, PageHeader, StatTile } from "@housekit/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import type { EmailDelivery, EmailHealth } from "../types";

const STATUS_TONE: Record<EmailDelivery["status"], string> = {
  sent: "bg-paid-bg text-paid-fg",
  failed: "bg-overdue-bg text-overdue-fg",
  pending: "bg-partial-bg text-partial-fg",
};

export function Mail() {
  const { t } = useTranslation();
  const api = useApi();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const isSuper = user?.role === "super_admin";

  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [resendTarget, setResendTarget] = useState<EmailDelivery | null>(null);
  const [resendTo, setResendTo] = useState("");

  const health = useQuery({
    queryKey: ["mail-health"],
    queryFn: () => req<EmailHealth>(api, "GET", "/api/v1/platform/mail/deliveries/health/", { params: { hours: 24 } }),
    refetchInterval: 30000,
  });

  const deliveries = useQuery({
    queryKey: ["mail-deliveries", status, search],
    queryFn: () =>
      req<Paginated<EmailDelivery>>(api, "GET", "/api/v1/platform/mail/deliveries/", {
        params: { ...(status ? { status } : {}), ...(search ? { search } : {}) },
      }),
  });

  const resend = useMutation({
    mutationFn: ({ id, to }: { id: string; to?: string }) =>
      req(api, "POST", `/api/v1/platform/mail/deliveries/${id}/resend/`, { body: to ? { to } : {} }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["mail-deliveries"] });
      void qc.invalidateQueries({ queryKey: ["mail-health"] });
      setResendTarget(null);
      setResendTo("");
      toast({ tone: "success", title: "Email re-queued" });
    },
    onError: () => toast({ tone: "error", title: t("common.somethingWrong") }),
  });

  const h = health.data;
  const rows = deliveries.data?.results ?? [];

  return (
    <div>
      <PageHeader title="Mail" description="Delivery monitoring, health & manual resend" />

      {/* Health */}
      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        <StatTile label="Sent (24h)" value={h?.sent ?? "—"} tone="paid" />
        <StatTile label="Failed (24h)" value={h?.failed ?? "—"} tone={h && h.failed > 0 ? "overdue" : "neutral"} />
        <StatTile label="Pending" value={h?.pending ?? "—"} tone="neutral" />
        <StatTile label="Failure rate" value={h ? `${h.failure_rate}%` : "—"} tone={h && h.failure_rate > 5 ? "overdue" : "neutral"} />
      </div>

      {h && h.top_failing.length > 0 && (
        <Card className="mb-5">
          <CardHeader>
            <CardTitle>Top failing templates (24h)</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-wrap gap-2 text-sm">
            {h.top_failing.map((f) => (
              <span key={f.template_key} className="rounded-full bg-overdue-bg px-3 py-1 text-overdue-fg">
                {f.template_key} · {f.count}
              </span>
            ))}
          </CardBody>
        </Card>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-line bg-canvas px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search email, template, event…"
          className="min-w-[220px] flex-1 rounded-lg border border-line bg-canvas px-3 py-2 text-sm"
        />
      </div>

      {/* Deliveries */}
      <Card>
        <CardBody className="space-y-1">
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-muted">{t("common.noResults")}</p>
          ) : (
            rows.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2.5 text-sm last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{d.subject || d.template_key}</p>
                  <p className="truncate text-xs text-ink-muted">
                    {d.to_email} · {d.template_key} · {formatDate(d.created_at)}
                    {d.error ? <span className="text-overdue-fg"> · {d.error}</span> : null}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_TONE[d.status]}`}>{d.status}</span>
                {isSuper && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setResendTarget(d);
                      setResendTo(d.to_email);
                    }}
                  >
                    Resend
                  </Button>
                )}
              </div>
            ))
          )}
        </CardBody>
      </Card>

      {/* Resend modal — supports a corrected address (wrong-email fix) */}
      <Modal
        open={resendTarget !== null}
        onOpenChange={(o) => !o && setResendTarget(null)}
        title="Resend email"
        description="Re-send this email as-is, or fix the address if the original was wrong."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setResendTarget(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => resendTarget && resend.mutate({ id: resendTarget.id, to: resendTo })}
              disabled={resend.isPending}
            >
              {resend.isPending ? t("common.saving") : "Resend"}
            </Button>
          </div>
        }
      >
        <label className="block text-sm">
          <span className="mb-1 block text-ink-muted">Send to</span>
          <input
            type="email"
            value={resendTo}
            onChange={(e) => setResendTo(e.target.value)}
            className="w-full rounded-lg border border-line bg-canvas px-3 py-2"
          />
        </label>
      </Modal>
    </div>
  );
}
