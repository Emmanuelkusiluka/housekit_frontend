import { Paginated, req, useApi, useAuth, useToast } from "@housekit/app-kit";
import { useTranslation } from "@housekit/i18n";
import {
  Button,
  Card,
  CardBody,
  EmptyState,
  Field,
  Input,
  Menu,
  MenuItem,
  Modal,
  PageHeader,
  Select,
  StatusPill,
  Textarea,
} from "@housekit/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreVertical, Plus, Wrench } from "lucide-react";
import { useState } from "react";

import type { House, MaintenanceRequest } from "../types";

export function Maintenance() {
  const { t } = useTranslation();
  const api = useApi();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const canManage = user?.role === "client_admin" || user?.role === "caretaker";
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ house_public_id: "", title: "", description: "", priority: "normal" });

  const list = useQuery({
    queryKey: ["maintenance"],
    queryFn: () => req<Paginated<MaintenanceRequest>>(api, "GET", "/api/v1/maintenance/"),
  });
  const houses = useQuery({
    queryKey: ["houses"],
    enabled: show,
    queryFn: () => req<Paginated<House>>(api, "GET", "/api/v1/houses/"),
  });

  const create = useMutation({
    mutationFn: () => req(api, "POST", "/api/v1/maintenance/", { body: form }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["maintenance"] });
      toast({ tone: "success", title: t("maintenance.report") });
      setShow(false);
      setForm({ house_public_id: "", title: "", description: "", priority: "normal" });
    },
  });

  const setStatus = useMutation({
    mutationFn: (v: { id: string; status: string }) =>
      req(api, "POST", `/api/v1/maintenance/${v.id}/set_status/`, { body: { status: v.status } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["maintenance"] }),
  });

  return (
    <div>
      <PageHeader
        title={t("maintenance.title")}
        action={
          <Button onClick={() => setShow(true)}>
            <Plus className="h-4 w-4" /> {t("maintenance.report")}
          </Button>
        }
      />
      {list.data && list.data.results.length > 0 ? (
        <div className="space-y-2">
          {list.data.results.map((m) => (
            <Card key={m.public_id}>
              <CardBody className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-ink">{m.title}</p>
                    <StatusPill status={m.priority === "high" ? "overdue" : "pending"} label={t(`maintenance.${m.priority}`)} />
                  </div>
                  <p className="text-sm text-ink-muted">
                    {m.house_name}
                    {m.unit_label ? ` · ${m.unit_label}` : ""} — {m.raised_by}
                  </p>
                  {m.description && <p className="mt-1 text-sm text-ink">{m.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status={m.status} />
                  {canManage && m.status !== "resolved" && (
                    <Menu
                      trigger={
                        <button className="rounded-lg p-1 text-ink-muted hover:bg-canvas">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      }
                    >
                      {(["open", "in_progress", "resolved"] as const).map((s) => (
                        <MenuItem key={s} onSelect={() => setStatus.mutate({ id: m.public_id, status: s })}>
                          {t(`status.${s}`)}
                        </MenuItem>
                      ))}
                    </Menu>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={<Wrench className="h-10 w-10" />} title={t("maintenance.noRequests")} />
      )}

      <Modal
        open={show}
        onOpenChange={setShow}
        title={t("maintenance.report")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShow(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              loading={create.isPending}
              disabled={!form.title || !form.house_public_id}
              onClick={() => create.mutate()}
            >
              {t("common.create")}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label={t("portfolio.house")}>
            <Select value={form.house_public_id} onChange={(e) => setForm({ ...form, house_public_id: e.target.value })}>
              <option value="">—</option>
              {houses.data?.results.map((h) => (
                <option key={h.public_id} value={h.public_id}>
                  {h.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("maintenance.issueTitle")}>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label={t("maintenance.priority")}>
            <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="low">{t("maintenance.low")}</option>
              <option value="normal">{t("maintenance.normal")}</option>
              <option value="high">{t("maintenance.high")}</option>
            </Select>
          </Field>
          <Field label={t("expenses.description")}>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
