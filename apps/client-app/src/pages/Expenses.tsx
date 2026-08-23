import { Paginated, req, useApi, useToast } from "@housekit/app-kit";
import { useTranslation } from "@housekit/i18n";
import {
  Button,
  Column,
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
import { Plus, Wallet } from "lucide-react";
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

  const expenses = useQuery({
    queryKey: ["expenses"],
    queryFn: () => req<Paginated<Expense>>(api, "GET", "/api/v1/expenses/"),
  });
  const houses = useQuery({
    queryKey: ["houses"],
    enabled: show,
    queryFn: () => req<Paginated<House>>(api, "GET", "/api/v1/houses/"),
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
    { key: "amt", header: t("payments.amount"), render: (e) => <Money value={e.amount} emphasis /> },
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
      <DataTable
        columns={cols}
        rows={expenses.data?.results ?? []}
        keyOf={(e) => e.public_id}
        loading={expenses.isLoading}
        empty={<EmptyState icon={<Wallet className="h-10 w-10" />} title={t("expenses.noExpenses")} />}
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
              {houses.data?.results.map((h) => (
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
