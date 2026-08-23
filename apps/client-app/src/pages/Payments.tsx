import { Paginated, req, useApi, useToast } from "@housekit/app-kit";
import { useTranslation } from "@housekit/i18n";
import {
  Badge,
  Button,
  Card,
  CardBody,
  Column,
  DataTable,
  EmptyState,
  Field,
  Input,
  Money,
  PageHeader,
  Select,
  StatusPill,
  TabsBar,
  Modal,
} from "@housekit/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, Inbox, Receipt as ReceiptIcon } from "lucide-react";
import { useState } from "react";

import { API_URL } from "../config";
import type { LedgerRow, PaymentNotice, Receipt } from "../types";

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function Payments() {
  const { t } = useTranslation();
  const [tab, setTab] = useState("ledger");

  return (
    <div>
      <PageHeader title={t("payments.title")} />
      <TabsBar
        className="mb-4"
        value={tab}
        onValueChange={setTab}
        tabs={[
          { value: "ledger", label: t("payments.ledger") },
          { value: "notices", label: t("payments.noticesInbox") },
          { value: "receipts", label: t("payments.receipt") + "s" },
        ]}
      />
      {tab === "ledger" && <LedgerTab />}
      {tab === "notices" && <NoticesTab />}
      {tab === "receipts" && <ReceiptsTab />}
    </div>
  );
}

function LedgerTab() {
  const { t } = useTranslation();
  const api = useApi();
  const [month, setMonth] = useState(currentMonth());
  const [payRow, setPayRow] = useState<LedgerRow | null>(null);

  const ledger = useQuery({
    queryKey: ["ledger", month],
    queryFn: () => req<LedgerRow[]>(api, "GET", "/api/v1/ledger/", { params: { query: { month } } }),
  });

  const cols: Column<LedgerRow>[] = [
    { key: "resident", header: t("tenants.residentName"), render: (r) => <span className="font-medium">{r.resident_name}</span> },
    { key: "unit", header: t("portfolio.unit"), render: (r) => r.unit_label },
    { key: "due", header: t("payments.amount"), render: (r) => <Money value={r.amount_due} /> },
    {
      key: "balance",
      header: t("payments.balance"),
      render: (r) => <Money value={r.balance} className={r.is_overdue ? "text-overdue-fg" : ""} />,
    },
    { key: "status", header: t("common.status"), render: (r) => r.status && <StatusPill status={r.is_overdue ? "overdue" : r.status} /> },
    {
      key: "action",
      header: "",
      render: (r) =>
        r.status !== "paid" && r.charge_public_id ? (
          <Button size="sm" onClick={() => setPayRow(r)}>
            {t("payments.record")}
          </Button>
        ) : null,
    },
  ];

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-44" />
      </div>
      <DataTable
        columns={cols}
        rows={ledger.data ?? []}
        keyOf={(r) => r.tenancy_public_id}
        loading={ledger.isLoading}
        empty={<EmptyState icon={<Banknote className="h-10 w-10" />} title={t("payments.noPayments")} />}
      />
      {payRow && <PayModal row={payRow} month={month} onClose={() => setPayRow(null)} />}
    </div>
  );
}

function PayModal({ row, month, onClose }: { row: LedgerRow; month: string; onClose: () => void }) {
  const { t } = useTranslation();
  const api = useApi();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [amount, setAmount] = useState(row.balance ?? "");
  const [method, setMethod] = useState("mobile_money");
  const [provider, setProvider] = useState("mpesa");
  const [reference, setReference] = useState("");

  const pay = useMutation({
    mutationFn: () =>
      req(api, "POST", `/api/v1/charges/${row.charge_public_id}/pay/`, {
        body: {
          amount,
          method,
          provider: method === "mobile_money" ? provider : "",
          reference,
          paid_on: new Date().toISOString().slice(0, 10),
        },
      }),
    // Optimistic ledger update.
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["ledger", month] });
      const prev = qc.getQueryData<LedgerRow[]>(["ledger", month]);
      const paid = Number(amount);
      qc.setQueryData<LedgerRow[]>(["ledger", month], (old) =>
        (old ?? []).map((r) => {
          if (r.charge_public_id !== row.charge_public_id) return r;
          const newBalance = Math.max(0, Number(r.balance ?? 0) - paid);
          return {
            ...r,
            balance: String(newBalance),
            status: newBalance <= 0 ? "paid" : "partial",
            is_overdue: newBalance > 0 && r.is_overdue,
          };
        }),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["ledger", month], ctx.prev);
    },
    onSuccess: () => {
      toast({ tone: "success", title: t("payments.receipt") });
      onClose();
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["ledger"] });
      void qc.invalidateQueries({ queryKey: ["receipts"] });
    },
  });

  const balance = Number(row.balance ?? 0);
  const remaining = balance - Number(amount || 0);

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title={t("payments.record")}
      description={`${row.resident_name} · ${row.unit_label}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button loading={pay.isPending} disabled={!amount} onClick={() => pay.mutate()}>
            {t("payments.record")}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label={t("payments.amount")} hint={`${t("payments.balance")}: ${row.balance}`}>
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label={t("payments.method")}>
          <Select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="mobile_money">{t("payments.mobileMoney")}</option>
            <option value="cash">{t("payments.cash")}</option>
          </Select>
        </Field>
        {method === "mobile_money" && (
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("payments.channel")}>
              <Select value={provider} onChange={(e) => setProvider(e.target.value)}>
                <option value="mpesa">M-Pesa</option>
                <option value="tigo">Tigo Pesa</option>
                <option value="airtel">Airtel Money</option>
                <option value="halopesa">Halopesa</option>
              </Select>
            </Field>
            <Field label={t("payments.reference")}>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} />
            </Field>
          </div>
        )}
        <div className="rounded-lg bg-canvas px-3 py-2 text-sm">
          {remaining <= 0 ? (
            <Badge tone="success">{t("payments.fullyPaid")}</Badge>
          ) : (
            <span className="text-partial-fg">
              {t("payments.balanceDue")}: <Money value={remaining} emphasis />
            </span>
          )}
        </div>
      </div>
    </Modal>
  );
}

function NoticesTab() {
  const { t } = useTranslation();
  const api = useApi();
  const qc = useQueryClient();
  const { toast } = useToast();

  const notices = useQuery({
    queryKey: ["payment-notices"],
    queryFn: () => req<Paginated<PaymentNotice>>(api, "GET", "/api/v1/payment-notices/"),
  });

  const act = useMutation({
    mutationFn: (v: { id: string; action: "confirm" | "reject" }) =>
      req(api, "POST", `/api/v1/payment-notices/${v.id}/${v.action}/`, { body: {} }),
    onSuccess: () => {
      ["payment-notices", "ledger", "receipts"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast({ tone: "success", title: t("common.confirm") });
    },
  });

  const pending = notices.data?.results.filter((n) => n.status === "pending") ?? [];

  if (notices.isLoading) return null;
  if (pending.length === 0)
    return <EmptyState icon={<Inbox className="h-10 w-10" />} title={t("common.noResults")} />;

  return (
    <div className="space-y-2">
      {pending.map((n) => (
        <Card key={n.public_id}>
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium text-ink">
                {n.resident_name} · {n.unit_label}
              </p>
              <p className="text-sm text-ink-muted">
                <Money value={n.amount} emphasis /> · {n.channel} · {n.reference || "—"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => act.mutate({ id: n.public_id, action: "reject" })}>
                {t("common.reject")}
              </Button>
              <Button size="sm" variant="success" onClick={() => act.mutate({ id: n.public_id, action: "confirm" })}>
                {t("common.confirm")}
              </Button>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

function ReceiptsTab() {
  const { t } = useTranslation();
  const api = useApi();
  const receipts = useQuery({
    queryKey: ["receipts"],
    queryFn: () => req<Paginated<Receipt>>(api, "GET", "/api/v1/receipts/"),
  });

  const cols: Column<Receipt>[] = [
    { key: "no", header: t("payments.receiptNo"), render: (r) => <span className="font-medium">{r.number}</span> },
    { key: "resident", header: t("tenants.residentName"), render: (r) => r.resident_name },
    { key: "amount", header: t("payments.amount"), render: (r) => <Money value={r.amount} /> },
    {
      key: "dl",
      header: "",
      render: (r) =>
        r.document_url ? (
          <a
            href={r.document_url.startsWith("http") ? r.document_url : `${API_URL}${r.document_url}`}
            target="_blank"
            rel="noreferrer"
          >
            <Button size="sm" variant="outline">
              {t("leases.downloadPdf")}
            </Button>
          </a>
        ) : null,
    },
  ];

  return (
    <DataTable
      columns={cols}
      rows={receipts.data?.results ?? []}
      keyOf={(r) => r.public_id}
      loading={receipts.isLoading}
      empty={<EmptyState icon={<ReceiptIcon className="h-10 w-10" />} title={t("payments.noPayments")} />}
    />
  );
}
