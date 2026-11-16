import { downloadCsv, fetchAll, matchesSearch, req, useApi, useToast } from "@housekit/app-kit";
import { useTranslation } from "@housekit/i18n";
import {
  Badge,
  Button,
  Column,
  ConfirmDialog,
  SearchInput,
  DataTable,
  EmptyState,
  Field,
  Input,
  Money,
  PageHeader,
  Select,
  Modal,
} from "@housekit/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Plus, Wallet } from "lucide-react";
import { useState } from "react";

import { formatDate } from "@housekit/ui";
import type { Expense, House } from "../types";

const CATEGORIES = ["maintenance", "utilities", "staff", "fees", "other"];

export function Expenses() {
  const { t } = useTranslation();
  const api = useApi();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    category: "maintenance",
    amount: "",
    spent_on: new Date().toISOString().slice(0, 10),
    description: "",
    house_public_id: "",
  });

  const [search, setSearch] = useState("");
  const [voiding, setVoiding] = useState<Expense | null>(null);
  // All expenses, newest first (the default page of 25 hid older entries).
  const expenses = useQuery({
    queryKey: ["expenses"],
    queryFn: () => fetchAll<Expense>(api, "/api/v1/expenses/", { ordering: "-spent_on" }),
  });
  const rows = (expenses.data ?? []).filter((e) =>
    matchesSearch(search, [e.description, t(`expenses.${e.category}`), e.amount, e.spent_on]),
  );
  // Expenses are financial records — the backend never deletes them; a
  // mistaken entry is voided with a reason and drops out of reports.
  const voidExpense = useMutation({
    mutationFn: (v: { id: string; reason: string }) =>
      req(api, "POST", `/api/v1/expenses/${v.id}/void/`, { body: { reason: v.reason } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["expenses"] });
      void qc.invalidateQueries({ queryKey: ["reports"] });
      setVoiding(null);
      toast({ tone: "success", title: t("ux.expenseVoided") });
    },
  });
  const houses = useQuery({
    queryKey: ["houses", "all"],
    enabled: show,
    queryFn: () => fetchAll<House>(api, "/api/v1/houses/", { ordering: "name" }),
  });

  const create = useMutation({
    mutationFn: () =>
      req(api, "POST", "/api/v1/expenses/", {
        body: { ...form, house_public_id: form.house_public_id || undefined },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["expenses"] });
      toast({ tone: "success", title: t("expenses.record") });
      setShow(false);
      setForm({ ...form, amount: "", description: "" });
    },
  });

  const cols: Column<Expense>[] = [
    { key: "date", header: t("expenses.spentOn"), render: (e) => formatDate(e.spent_on) },
    { key: "cat", header: t("expenses.category"), render: (e) => t(`expenses.${e.category}`) },
    { key: "desc", header: t("expenses.description"), hideOnMobile: true, render: (e) => e.description || "—" },
    {
      key: "amt",
      header: t("payments.amount"),
      render: (e) =>
        e.is_void ? (
          <span className="flex items-center justify-end gap-2">
            <Money value={e.amount} className="text-ink-muted line-through" />
            <Badge tone="danger">{t("ux.voided")}</Badge>
          </span>
        ) : (
          <Money value={e.amount} emphasis />
        ),
    },
    {
      key: "act",
      header: "",
      render: (e) =>
        !e.is_void && (
          <Button size="sm" variant="ghost" className="text-overdue-fg hover:bg-overdue-bg" onClick={() => setVoiding(e)}>
            {t("ux.void")}
          </Button>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t("expenses.title")}
        action={
          <Button onClick={() => setShow(true)}>
            <Plus className="h-4 w-4" /> {t("expenses.record")}
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <SearchInput className="min-w-[200px] flex-1" value={search} onChange={setSearch} placeholder={t("ux.searchExpenses")} />
        <Button
          variant="outline"
          disabled={rows.length === 0}
          onClick={() =>
            downloadCsv(
              `expenses-${new Date().toISOString().slice(0, 10)}.csv`,
              [t("expenses.spentOn"), t("expenses.category"), t("expenses.description"), t("payments.amount"), t("common.status")],
              rows.map((e) => [e.spent_on, t(`expenses.${e.category}`), e.description, e.amount, e.is_void ? "void" : "ok"]),
            )
          }
        >
          <Download className="h-4 w-4" /> {t("ux.downloadCsv")}
        </Button>
      </div>
      <DataTable
        columns={cols}
        rows={rows}
        keyOf={(e) => e.public_id}
        loading={expenses.isLoading}
        empty={
          search ? (
            <EmptyState icon={<Wallet />} title={t("ux.noMatchTitle", { query: search })} />
          ) : (
            <EmptyState
              icon={<Wallet />}
              title={t("expenses.noExpenses")}
              description={t("ux.expensesEmptyBody")}
              action={
                <Button onClick={() => setShow(true)}>
                  <Plus className="h-4 w-4" /> {t("expenses.record")}
                </Button>
              }
            />
          )
        }
      />
      <ConfirmDialog
        open={!!voiding}
        onOpenChange={(o) => !o && setVoiding(null)}
        title={t("ux.voidExpenseTitle")}
        description={t("ux.voidExpenseBody")}
        reasonLabel={t("ux.reason")}
        reasonRequired
        confirmLabel={t("ux.void")}
        loading={voidExpense.isPending}
        onConfirm={(reason) => voiding && voidExpense.mutate({ id: voiding.public_id, reason })}
      />
      <Modal
        open={show}
        onOpenChange={setShow}
        title={t("expenses.record")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShow(false)}>
              {t("common.cancel")}
            </Button>
            <Button loading={create.isPending} disabled={!form.amount} onClick={() => create.mutate()}>
              {t("common.save")}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("expenses.category")}>
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`expenses.${c}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("payments.amount")} hint="TZS">
            <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </Field>
          <Field label={t("expenses.spentOn")}>
            <Input type="date" value={form.spent_on} onChange={(e) => setForm({ ...form, spent_on: e.target.value })} />
          </Field>
          <Field label={t("expenses.scope")}>
            <Select value={form.house_public_id} onChange={(e) => setForm({ ...form, house_public_id: e.target.value })}>
              <option value="">{t("expenses.portfolioWide")}</option>
              {houses.data?.map((h) => (
                <option key={h.public_id} value={h.public_id}>
                  {h.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("expenses.description")} className="sm:col-span-2">
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
