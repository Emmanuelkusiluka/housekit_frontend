import { Paginated, req, useApi, useAuth, useToast } from "@housekit/app-kit";
import { formatDate } from "@housekit/ui";
import { useTranslation } from "@housekit/i18n";
import { Button, Card, CardBody, EmptyState, PageHeader, StatusPill } from "@housekit/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Inbox } from "lucide-react";

import type { Application } from "../types";

export function Applications() {
  const { t } = useTranslation();
  const api = useApi();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const isSuper = user?.role === "super_admin";

  const apps = useQuery({
    queryKey: ["applications"],
    queryFn: () => req<Paginated<Application>>(api, "GET", "/api/v1/platform/applications/"),
  });

  const act = useMutation({
    mutationFn: (v: { id: string; action: string; body?: unknown }) =>
      req(api, "POST", `/api/v1/platform/applications/${v.id}/${v.action}/`, { body: v.body ?? {} }),
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ["applications"] });
      toast({ tone: "success", title: v.action });
    },
  });

  return (
    <div>
      <PageHeader title={t("platform.applications")} description="Client Onboarding" />
      {apps.data && apps.data.results.length > 0 ? (
        <div className="space-y-2">
          {apps.data.results.map((a) => (
            <Card key={a.public_id}>
              <CardBody className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-ink">{a.business_name}</p>
                  <p className="text-sm text-ink-muted">
                    {a.contact_name} · {a.contact_email} · {formatDate(a.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status={a.status === "pending" ? "open" : a.status === "provisioned" ? "signed" : a.status} />
                  {a.status !== "provisioned" && a.status !== "rejected" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => act.mutate({ id: a.public_id, action: "verify" })}>
                        {t("platform.verifyBusiness")}
                      </Button>
                      {isSuper && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              act.mutate({ id: a.public_id, action: "reject", body: { reason: "Not eligible" } })
                            }
                          >
                            {t("platform.reject")}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => act.mutate({ id: a.public_id, action: "provision", body: { cycle: "monthly" } })}
                          >
                            {t("platform.provision")}
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={<Inbox className="h-10 w-10" />} title={t("common.noResults")} />
      )}
    </div>
  );
}
