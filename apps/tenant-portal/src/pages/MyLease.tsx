import { Paginated, req, useApi, useToast } from "@housekit/app-kit";
import { useTranslation } from "@housekit/i18n";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  Field,
  Input,
  Modal,
  Money,
  PageHeader,
  Skeleton,
  StatusPill,
  Textarea,
} from "@housekit/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSignature } from "lucide-react";
import { useState } from "react";

import { API_URL } from "../config";
import type { Lease } from "../types";

export function MyLease() {
  const { t } = useTranslation();
  const api = useApi();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [signing, setSigning] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [consent, setConsent] = useState(false);
  const [reason, setReason] = useState("");

  const leases = useQuery({
    queryKey: ["my-leases"],
    queryFn: () => req<Paginated<Lease>>(api, "GET", "/api/v1/portal/leases/"),
  });
  const lease = leases.data?.results[0];

  const sign = useMutation({
    mutationFn: () =>
      req(api, "POST", `/api/v1/portal/leases/${lease!.public_id}/sign/`, {
        body: { typed_name: typedName, consent },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["my-leases"] });
      toast({ tone: "success", title: t("leases.sign") });
      setSigning(false);
    },
  });
  const decline = useMutation({
    mutationFn: () =>
      req(api, "POST", `/api/v1/portal/leases/${lease!.public_id}/decline/`, { body: { reason } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["my-leases"] });
      toast({ tone: "info", title: t("leases.decline") });
      setDeclining(false);
    },
  });

  if (leases.isLoading) return <Skeleton className="h-64 rounded-2xl" />;
  if (!lease)
    return (
      <div>
        <PageHeader title={t("nav.myLease")} />
        <EmptyState icon={<FileSignature className="h-10 w-10" />} title={t("common.noResults")} />
      </div>
    );

  const terms = lease.terms;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("nav.myLease")} action={<StatusPill status={lease.status} />} />

      <Card>
        <CardHeader>
          <CardTitle>{t("leases.terms")}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-2 text-sm">
          <Row label={t("portfolio.unit")} value={`${terms.unit_label ?? ""} (${terms.house_name ?? ""})`} />
          <Row label={t("tenants.startDate")} value={terms.start_date ?? ""} />
          <Row label="End" value={terms.end_date ?? ""} />
          <Row label={t("portfolio.monthlyRent")} value={<Money value={terms.monthly_rent} currency={terms.currency} />} />
          <Row label={t("tenants.deposit")} value={<Money value={terms.deposit_amount} currency={terms.currency} />} />
          {lease.document_url && (
            <a
              className="inline-block pt-2 text-sm text-brand-600 hover:underline"
              href={lease.document_url.startsWith("http") ? lease.document_url : `${API_URL}${lease.document_url}`}
              target="_blank"
              rel="noreferrer"
            >
              {t("leases.downloadPdf")}
            </a>
          )}
        </CardBody>
      </Card>

      {lease.status === "sent" && (
        <div className="mt-4 flex gap-2">
          <Button className="flex-1" onClick={() => setSigning(true)}>
            {t("leases.sign")}
          </Button>
          <Button variant="outline" onClick={() => setDeclining(true)}>
            {t("leases.decline")}
          </Button>
        </div>
      )}
      {lease.status === "signed" && (
        <p className="mt-4 rounded-xl bg-paid-bg p-3 text-sm text-paid-fg">{t("status.signed")} ✓</p>
      )}
      {lease.status === "declined" && (
        <p className="mt-4 rounded-xl bg-overdue-bg p-3 text-sm text-overdue-fg">{t("status.declined")}</p>
      )}

      <Modal
        open={signing}
        onOpenChange={setSigning}
        title={t("leases.sign")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSigning(false)}>
              {t("common.cancel")}
            </Button>
            <Button loading={sign.isPending} disabled={!typedName || !consent} onClick={() => sign.mutate()}>
              {t("leases.sign")}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label={t("leases.signedName")}>
            <Input value={typedName} onChange={(e) => setTypedName(e.target.value)} />
          </Field>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
            <span className="text-ink-muted">{t("leases.consent")}</span>
          </label>
        </div>
      </Modal>

      <Modal
        open={declining}
        onOpenChange={setDeclining}
        title={t("leases.decline")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeclining(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="danger" loading={decline.isPending} onClick={() => decline.mutate()}>
              {t("leases.decline")}
            </Button>
          </>
        }
      >
        <Field label={t("leases.declineReason")}>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </Modal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-1.5 last:border-0">
      <span className="text-ink-muted">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}
