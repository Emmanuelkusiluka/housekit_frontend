import { Paginated, req, useApi, useToast } from "@housekit/app-kit";
import { formatDate, formatMonth } from "@housekit/ui";
import { useTranslation } from "@housekit/i18n";
import {
  Badge,
  Button,
  Card,
  CardBody,
  Field,
  Input,
  Modal,
  Money,
  PageHeader,
  Select,
  StatusPill,
  Textarea,
} from "@housekit/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import type { Charge, Payment, PaymentNotice } from "../types";

export function MyPayments() {
  const { t } = useTranslation();
  const api = useApi();
  const [notice, setNotice] = useState(false);
  const [issue, setIssue] = useState(false);

  const charges = useQuery({
    queryKey: ["my-charges"],
    queryFn: () => req<Paginated<Charge>>(api, "GET", "/api/v1/portal/charges/"),
  });
  const payments = useQuery({
    queryKey: ["my-payments"],
    queryFn: () => req<Paginated<Payment>>(api, "GET", "/api/v1/portal/payments/"),
  });
  const notices = useQuery({
    queryKey: ["my-notices"],
    queryFn: () => req<Paginated<PaymentNotice>>(api, "GET", "/api/v1/portal/payment-notices/"),
  });

  const unpaid = charges.data?.results.filter((c) => c.status !== "paid") ?? [];
  const outstanding = unpaid.reduce((s, c) => s + Number(c.balance), 0);
  const myUnit = charges.data?.results[0]?.unit;
  const pendingNotices = notices.data?.results.filter((n) => n.status === "pending") ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("nav.myPayments")} />

      <Card className="mb-4">
        <CardBody className="flex items-center justify-between">
          <div>
            <p className="text-sm text-ink-muted">{t("payments.balance")}</p>
            <Money value={outstanding} emphasis className="text-2xl" />
          </div>
          <Button onClick={() => setNotice(true)}>{t("payments.submitNotice")}</Button>
        </CardBody>
      </Card>

      {pendingNotices.length > 0 && (
        <Card className="mb-4">
          <CardBody className="space-y-2">
            {pendingNotices.map((n) => (
              <div key={n.public_id} className="flex items-center justify-between text-sm">
                <span>
                  <Money value={n.amount} /> · {n.channel}
                </span>
                <Badge tone="warning">{t("payments.awaitingConfirmation")}</Badge>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      <h2 className="mb-2 mt-4 font-display text-base font-semibold">{t("payments.title")}</h2>
      <div className="space-y-2">
        {payments.data?.results.length === 0 && (
          <p className="text-sm text-ink-muted">{t("payments.noPayments")}</p>
        )}
        {payments.data?.results.map((p) => (
          <Card key={p.public_id}>
            <CardBody className="flex items-center justify-between text-sm">
              <span>{formatDate(p.paid_on)}</span>
              <span className="flex items-center gap-2">
                <Money value={p.amount} emphasis />
                <StatusPill status="paid" />
              </span>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <Button variant="outline" onClick={() => setIssue(true)}>
          {t("maintenance.report")}
        </Button>
      </div>

      {notice && <NoticeModal onClose={() => setNotice(false)} />}
      {issue && myUnit && <IssueModal unit={myUnit} onClose={() => setIssue(false)} />}

      <p className="mt-6 text-center text-xs text-ink-subtle">
        {unpaid.map((c) => (
          <span key={c.public_id} className="mx-1">
            {formatMonth(c.period_month)}: <Money value={c.balance} />
          </span>
        ))}
      </p>
    </div>
  );
}

function NoticeModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const api = useApi();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ amount: "", channel: "mpesa", reference: "" });

  const submit = useMutation({
    mutationFn: () => req(api, "POST", "/api/v1/portal/payment-notices/", { body: form }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["my-notices"] });
      toast({ tone: "success", title: t("payments.awaitingConfirmation") });
      onClose();
    },
  });

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title={t("payments.submitNotice")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button loading={submit.isPending} disabled={!form.amount} onClick={() => submit.mutate()}>
            {t("common.confirm")}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label={t("payments.amount")} hint="TZS">
          <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        </Field>
        <Field label={t("payments.channel")}>
          <Select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
            <option value="mpesa">M-Pesa</option>
            <option value="tigo">Tigo Pesa</option>
            <option value="airtel">Airtel Money</option>
            <option value="halopesa">Halopesa</option>
          </Select>
        </Field>
        <Field label={t("payments.reference")}>
          <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

function IssueModal({ unit, onClose }: { unit: string; onClose: () => void }) {
  const { t } = useTranslation();
  const api = useApi();
  const { toast } = useToast();
  const [form, setForm] = useState({ title: "", description: "", priority: "normal" });

  const submit = useMutation({
    mutationFn: () =>
      req(api, "POST", "/api/v1/maintenance/", { body: { unit_public_id: unit, ...form } }),
    onSuccess: () => {
      toast({ tone: "success", title: t("maintenance.report") });
      onClose();
    },
  });

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title={t("maintenance.report")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button loading={submit.isPending} disabled={!form.title} onClick={() => submit.mutate()}>
            {t("common.create")}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label={t("maintenance.issueTitle")}>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <Field label={t("expenses.description")}>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}
