import { Paginated, downloadCsv, fetchAll, matchesSearch, req, roomBreadcrumb, useApi, useAuth, useToast } from "@housekit/app-kit";
import { useTranslation } from "@housekit/i18n";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  Column,
  ConfirmDialog,
  PersonCell,
  SearchInput,
  Skeleton,
  formatDate,
  formatMonth,
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
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, Download, Inbox, PartyPopper, Receipt as ReceiptIcon } from "lucide-react";
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

type LedgerFilter = "all" | "unpaid" | "overdue" | "paid";

function LedgerTab() {
  const { t } = useTranslation();
  const api = useApi();
  const [month, setMonth] = useState(currentMonth());
  const [payRow, setPayRow] = useState<LedgerRow | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<LedgerFilter>("all");

  const ledger = useQuery({
    queryKey: ["ledger", month],
    queryFn: () => req<LedgerRow[]>(api, "GET", "/api/v1/ledger/", { params: { query: { month } } }),
  });

  const all = ledger.data ?? [];
  const isPaid = (r: LedgerRow) => r.status === "paid";
  const counts = {
    all: all.length,
    unpaid: all.filter((r) => !isPaid(r)).length,
    overdue: all.filter((r) => r.is_overdue).length,
    paid: all.filter(isPaid).length,
  };
  const rows = all
    .filter((r) =>
      filter === "all" ? true : filter === "paid" ? isPaid(r) : filter === "overdue" ? r.is_overdue : !isPaid(r),
    )
    .filter((r) => matchesSearch(search, [r.resident_name, r.unit_label, r.house_name, r.compound_name]));

  const cols: Column<LedgerRow>[] = [
    {
      key: "resident",
      header: t("tenants.residentName"),
      render: (r) => (
        <PersonCell name={r.resident_name} sub={roomBreadcrumb(r.compound_name, r.house_name, r.unit_label)} />
      ),
    },
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
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setPayRow(r);
            }}
          >
            {t("payments.record")}
          </Button>
        ) : null,
    },
  ];

  const exportCsv = () =>
    downloadCsv(
      `rent-ledger-${month}.csv`,
      [t("tenants.residentName"), t("portfolio.compound"), t("portfolio.house"), t("portfolio.unit"), t("payments.amount"), t("payments.balance"), t("common.status")],
      rows.map((r) => [r.resident_name, r.compound_name, r.house_name, r.unit_label, r.amount_due, r.balance, r.is_overdue ? "overdue" : r.status]),
    );

  const everyonePaid = all.length > 0 && counts.paid === all.length;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-44" aria-label={t("payments.month")} />
        <SearchInput className="min-w-[200px] flex-1" value={search} onChange={setSearch} placeholder={t("ux.searchLedger")} />
        <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
          <Download className="h-4 w-4" /> {t("ux.downloadCsv")}
        </Button>
      </div>
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label={t("common.status")}>
        {(["all", "unpaid", "overdue", "paid"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={
              filter === f
                ? "rounded-full bg-brand-600 px-3 py-1 text-xs font-medium text-white"
                : "rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-muted hover:bg-canvas"
            }
          >
            {t(`ux.filter_${f}`)} ({counts[f]})
          </button>
        ))}
      </div>
      {everyonePaid && filter === "all" && !search ? (
        <EmptyState
          people={all.map((r) => r.resident_name)}
          title={t("ux.everyonePaid", { month: formatMonth(`${month}-01`) })}
          description={t("ux.everyonePaidBody", { count: all.length })}
          action={
            <Button variant="outline" onClick={exportCsv}>
              <Download className="h-4 w-4" /> {t("ux.downloadCsv")}
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={cols}
          rows={rows}
          keyOf={(r) => r.tenancy_public_id}
          loading={ledger.isLoading}
          empty={
            search ? (
              <EmptyState
                ghosts={1}
                title={t("ux.noMatchTitle", { query: search })}
                action={
                  <Button variant="outline" onClick={() => setSearch("")}>
                    {t("ux.clearSearch")}
                  </Button>
                }
              />
            ) : filter === "overdue" || filter === "unpaid" ? (
              <EmptyState icon={<PartyPopper />} title={t("ux.nobodyOwes")} />
            ) : (
              <EmptyState icon={<Banknote />} title={t("ux.ledgerEmpty")} description={t("ux.ledgerEmptyBody")} />
            )
          }
        />
      )}
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
      description={`${row.resident_name} · ${roomBreadcrumb(row.compound_name, row.house_name, row.unit_label)}`}
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
  const [rejecting, setRejecting] = useState<PaymentNotice | null>(null);

  // Only pending notices, and all of them — previously a page of 25 mixed
  // statuses was filtered client-side, so older pending notices disappeared.
  const notices = useQuery({
    queryKey: ["payment-notices", "pending"],
    queryFn: () => fetchAll<PaymentNotice>(api, "/api/v1/payment-notices/", { status: "pending" }),
  });

  const act = useMutation({
    mutationFn: (v: { id: string; action: "confirm" | "reject"; reason?: string }) =>
      req(api, "POST", `/api/v1/payment-notices/${v.id}/${v.action}/`, {
        body: v.action === "reject" ? { reason: v.reason ?? "" } : {},
      }),
    onSuccess: (_d, v) => {
      ["payment-notices", "ledger", "receipts"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      setRejecting(null);
      toast({ tone: "success", title: v.action === "confirm" ? t("ux.noticeConfirmed") : t("ux.noticeRejected") });
    },
  });

  const pending = notices.data ?? [];

  if (notices.isLoading) return <PersonRowSkeletonLite />;
  if (pending.length === 0)
    return <EmptyState icon={<Inbox />} title={t("ux.noticesEmpty")} description={t("ux.noticesEmptyBody")} />;

  return (
    <div className="space-y-2">
      {pending.map((n) => (
        <Card key={n.public_id}>
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={n.resident_name} size="lg" />
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{n.resident_name}</p>
                <p className="truncate text-xs text-ink-muted">{roomBreadcrumb(n.compound_name, n.house_name, n.unit_label)}</p>
                <p className="text-sm text-ink-muted">
                  <Money value={n.amount} emphasis /> · {n.channel} · {n.reference || "—"} · {formatDate(n.submitted_at)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setRejecting(n)}>
                {t("common.reject")}
              </Button>
              <Button
                size="sm"
                variant="success"
                loading={act.isPending && act.variables?.id === n.public_id && act.variables.action === "confirm"}
                onClick={() => act.mutate({ id: n.public_id, action: "confirm" })}
              >
                {t("common.confirm")}
              </Button>
            </div>
          </CardBody>
        </Card>
      ))}
      <ConfirmDialog
        open={!!rejecting}
        onOpenChange={(o) => !o && setRejecting(null)}
        media={rejecting ? <Avatar name={rejecting.resident_name} size="lg" /> : undefined}
        title={t("ux.rejectNoticeTitle", { name: rejecting?.resident_name ?? "" })}
        description={t("ux.rejectNoticeBody")}
        reasonLabel={t("ux.reasonForTenant")}
        confirmLabel={t("common.reject")}
        loading={act.isPending}
        onConfirm={(reason) => rejecting && act.mutate({ id: rejecting.public_id, action: "reject", reason })}
      />
    </div>
  );
}

function PersonRowSkeletonLite() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="hk-card flex items-center gap-3 p-5">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ReceiptsTab() {
  const { t } = useTranslation();
  const api = useApi();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [voiding, setVoiding] = useState<Receipt | null>(null);

  const receipts = useInfiniteQuery({
    queryKey: ["receipts"],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      req<Paginated<Receipt>>(api, "GET", "/api/v1/receipts/", { params: { query: { page: pageParam, page_size: 50 } } }),
    getNextPageParam: (last, pages) => (last.next ? pages.length + 1 : undefined),
  });
  const loaded = receipts.data?.pages.flatMap((p) => p.results) ?? [];
  const total = receipts.data?.pages[0]?.count ?? 0;
  const rows = loaded.filter((r) =>
    matchesSearch(search, [r.number, r.resident_name, r.unit_label, r.house_name, r.compound_name]),
  );

  // Owner may void anything; the recorder may void their own entry the same
  // day (backend `can_reverse`) — the backend gives a clear reason otherwise.
  const voidPayment = useMutation({
    mutationFn: (v: { paymentId: string; reason: string }) =>
      req(api, "POST", `/api/v1/payments/${v.paymentId}/void/`, { body: { reason: v.reason } }),
    onSuccess: () => {
      ["receipts", "ledger", "payments"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      setVoiding(null);
      toast({ tone: "success", title: t("ux.paymentVoided") });
    },
  });

  const docUrl = (u: string) => (u.startsWith("http") ? u : `${API_URL}${u}`);

  const cols: Column<Receipt>[] = [
    {
      key: "resident",
      header: t("tenants.residentName"),
      render: (r) => (
        <PersonCell
          name={r.resident_name}
          sub={roomBreadcrumb(r.compound_name, r.house_name, r.unit_label)}
          muted={r.is_void}
        />
      ),
    },
    {
      key: "no",
      header: t("payments.receiptNo"),
      render: (r) => (
        <span className={r.is_void ? "text-ink-muted line-through" : "font-medium"}>{r.number}</span>
      ),
    },
    { key: "date", header: t("payments.paidOn"), hideOnMobile: true, render: (r) => formatDate(r.issued_at) },
    {
      key: "amount",
      header: t("payments.amount"),
      render: (r) => (r.is_void ? <Badge tone="danger">{t("ux.voided")}</Badge> : <Money value={r.amount} />),
    },
    {
      key: "dl",
      header: "",
      render: (r) => (
        <div className="flex justify-end gap-1">
          {r.document_url && !r.is_void && (
            <a href={docUrl(r.document_url)} target="_blank" rel="noreferrer">
              <Button size="sm" variant="outline">
                <Download className="h-4 w-4" /> PDF
              </Button>
            </a>
          )}
          {!r.is_void && (user?.role === "client_admin" || user?.role === "caretaker") && (
            <Button size="sm" variant="ghost" className="text-overdue-fg hover:bg-overdue-bg" onClick={() => setVoiding(r)}>
              {t("ux.voidPayment")}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <SearchInput className="mb-3 max-w-md" value={search} onChange={setSearch} placeholder={t("ux.searchReceipts")} />
      <DataTable
        columns={cols}
        rows={rows}
        keyOf={(r) => r.public_id}
        loading={receipts.isLoading}
        empty={
          search ? (
            <EmptyState ghosts={1} title={t("ux.noMatchTitle", { query: search })} />
          ) : (
            <EmptyState icon={<ReceiptIcon />} title={t("ux.receiptsEmpty")} description={t("ux.receiptsEmptyBody")} />
          )
        }
      />
      {receipts.hasNextPage && (
        <div className="mt-4 flex flex-col items-center gap-1">
          <Button variant="outline" loading={receipts.isFetchingNextPage} onClick={() => receipts.fetchNextPage()}>
            {t("ux.loadMore")}
          </Button>
          <span className="text-xs text-ink-muted">{t("ux.showingOf", { shown: loaded.length, total })}</span>
        </div>
      )}
      <ConfirmDialog
        open={!!voiding}
        onOpenChange={(o) => !o && setVoiding(null)}
        media={voiding ? <Avatar name={voiding.resident_name} size="lg" /> : undefined}
        title={t("ux.voidPaymentTitle", { number: voiding?.number ?? "" })}
        description={t("ux.voidPaymentBody")}
        reasonLabel={t("ux.reason")}
        reasonRequired
        confirmLabel={t("ux.voidPayment")}
        loading={voidPayment.isPending}
        onConfirm={(reason) => voiding && voidPayment.mutate({ paymentId: voiding.payment, reason })}
      />
    </div>
  );
}
